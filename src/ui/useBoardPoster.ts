import { useEffect, useState } from 'react';
import { useGameStore } from '../game/core/gameStore';
import { cleanWardenName, defaultWardenName } from '../game/core/settings';
import { sendPost } from '../game/leaderboard/board';
import { runKey } from '../game/save/saveManager';
import { bestKey, getReplay, logHash } from '../game/replay/replayStore';

/**
 * How long to wait before trying the outbox again after the relay could not be reached: a minute,
 * doubling each time up to half an hour, so an outage or a busy relay is not knocked on forever.
 */
const RETRY_MS = 60 * 1000;
const RETRY_MAX_MS = 30 * 60 * 1000;
/** How long to give a finished day's replay to be stored before its run is sent. */
const REPLAY_SETTLE_MS = 1500;

/** Runs being sent right now, so a rerun of the effect never sends one twice at once. */
const sending = new Set<string>();

/**
 * Sends every run waiting in the outbox to the Academy board, by itself: as soon as a day ends
 * with a new personal best, when the game starts, and again after a growing wait while anything
 * is still waiting (when offline, say). Does nothing while posting is turned off in Settings.
 */
export function useBoardPoster(): void {
  const outbox = useGameStore((state) => state.save.outbox);
  const postRuns = useGameStore((state) => state.settings.postRuns);
  const wardenName = useGameStore((state) => state.settings.wardenName);
  const playerId = useGameStore((state) => state.settings.playerId);
  const runPosted = useGameStore((state) => state.runPosted);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!postRuns || outbox.length === 0 || !playerId) return;
    let live = true;
    let timer = 0;
    const name = cleanWardenName(wardenName) ?? defaultWardenName(playerId);
    void (async () => {
      // A day's replay is kept a moment after its run reaches the outbox.
      await new Promise((resolve) => window.setTimeout(resolve, REPLAY_SETTLE_MS));
      if (!live) return;
      let failed = false;
      for (const run of outbox) {
        const key = runKey(run);
        if (sending.has(key)) continue;
        sending.add(key);
        // The run's replay goes with it, for the board to check; the post signs its hash.
        const log = run.mode ? await getReplay(bestKey(run.level, run.difficulty, run.mode)) : null;
        const matches =
          log !== null && log.level === run.level && Math.abs(log.seconds - run.time) < 1;
        const sent = await sendPost(
          { v: 1, player: playerId, name, run, ...(matches ? { log: logHash(log) } : {}) },
          undefined,
          matches ? log : undefined,
        );
        sending.delete(key);
        if (sent) runPosted(run);
        else failed = true;
      }
      if (failed && live) {
        const wait = Math.min(RETRY_MAX_MS, RETRY_MS * 2 ** attempt);
        timer = window.setTimeout(() => setAttempt((n) => n + 1), wait);
      }
    })();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [outbox, postRuns, wardenName, playerId, runPosted, attempt]);
}
