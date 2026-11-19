/**
 * Run by the Leaderboard GitHub Action (`.github/workflows/leaderboard.yml`), and by hand with
 * `npm run board:collect`. Reads the runs posted to the relay in the last 12 hours, checks each
 * against the game's own rules, merges them with the runs already kept, and rewrites
 * `leaderboard/board.json` only when the kept runs have changed.
 *
 * `leaderboard/banned.json` lists player ids (16 hex digits) whose runs are left off.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  BOARD_FILE,
  nextBoardFile,
  parseBoardFile,
  readRelay,
} from '../src/game/leaderboard/board';

const BANNED_FILE = 'leaderboard/banned.json';

function readBanned(): Set<string> {
  if (!existsSync(BANNED_FILE)) return new Set();
  const list: unknown = JSON.parse(readFileSync(BANNED_FILE, 'utf8'));
  return new Set(Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []);
}

async function main(): Promise<void> {
  const kept = existsSync(BOARD_FILE) ? parseBoardFile(readFileSync(BOARD_FILE, 'utf8')) : [];
  const incoming = await readRelay();
  const next = await nextBoardFile(kept, incoming, readBanned(), new Date());
  const same = next.posts.length === kept.length && next.posts.every((post, i) => post === kept[i]);
  console.log(
    `Relay: ${incoming.length} posts. Board: ${kept.length} runs before, ${next.posts.length} after.`,
  );
  if (same && existsSync(BOARD_FILE)) {
    console.log('No change.');
    return;
  }
  writeFileSync(BOARD_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${BOARD_FILE}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
