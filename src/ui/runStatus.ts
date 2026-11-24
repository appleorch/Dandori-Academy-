import { playedOnThisLesson, type RunEntry } from '../game/leaderboard/runCode';
import { runKey, type SaveData } from '../game/save/saveManager';

/** Where one of the player's own runs stands with the board. */
export function runStatus(save: SaveData, run: RunEntry, postRuns: boolean): string {
  const key = runKey(run);
  if (save.posted.includes(key)) return 'Posted';
  if (save.outbox.some((queued) => runKey(queued) === key)) {
    return postRuns ? 'Posting…' : 'Waiting (posting is off)';
  }
  if (!playedOnThisLesson(run)) return 'Older version';
  return 'Not posted';
}
