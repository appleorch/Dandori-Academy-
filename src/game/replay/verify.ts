import { makeChallengeRun, type RunEntry } from '../leaderboard/runCode';
import type { BoardEntry, Verdict } from '../leaderboard/board';
import { challengeFacts } from '../modes/facts';
import { isChallenge, scoreChallenge } from '../modes/modes';
import { replayToEnd, SIM_VERSION, type DayLog } from './replay';

/** The parts of a run its replay must reproduce: everything but when and on which build. */
const NOT_CLAIMED = new Set(['at', 'game', 'player', 'name', 'code', 'logHash', 'verified']);

function claim(run: RunEntry): string {
  const rest = Object.fromEntries(
    Object.entries(run).filter(([key, value]) => !NOT_CLAIMED.has(key) && value !== undefined),
  );
  return JSON.stringify(rest, Object.keys(rest).sort());
}

/**
 * Replays a posted run's log and compares the result with the run's claim. Run by the board's
 * collection in Node, with the same build as the game. A log from another simulation version is
 * left unchecked rather than judged.
 */
export async function verifyRun(entry: BoardEntry | RunEntry, log: DayLog): Promise<Verdict> {
  if (log.sim !== SIM_VERSION) return 'unchecked';
  if (log.level !== entry.level || log.difficulty !== entry.difficulty) return 'different';
  const mode = entry.mode;
  if (!mode || log.mode !== mode || !isChallenge(mode)) return 'different';
  let replay;
  try {
    replay = await replayToEnd(log);
  } catch {
    return 'different';
  }
  if (!replay) return 'unchecked';
  const sim = replay.expedition.surface;
  const facts = challengeFacts(sim);
  const again = makeChallengeRun(
    {
      levelId: entry.level,
      difficulty: entry.difficulty,
      mode,
      facts,
      score: scoreChallenge(mode, replay.level, facts),
      elapsed: sim.elapsed,
    },
    entry.game,
    new Date(entry.at),
  );
  replay.dispose();
  if (!again) return 'different';
  return claim(again) === claim(entry) ? 'same' : 'different';
}
