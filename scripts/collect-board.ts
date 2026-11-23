/**
 * Run by the Leaderboard GitHub Action (`.github/workflows/leaderboard.yml`), and by hand with
 * `npm run board:collect`.
 *
 * 1. Carries runs that went to the relay (when a player could not reach the board server) and
 *    the runs in `leaderboard/board.json` to the board server, which keeps the best of each.
 * 2. Rewrites `leaderboard/board.json` from the server's board, checked again, as a backup the
 *    game reads if the server is ever away. If the server cannot be reached, the file is kept
 *    up to date from the relay instead, as before.
 *
 * `leaderboard/banned.json` lists player ids (16 hex digits) whose runs are left off the file;
 * strike them off the server too (see README, Leaderboard).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  BOARD_API,
  BOARD_FILE,
  nextBoardFile,
  parseBoardFile,
  readRelay,
  readServer,
} from '../src/game/leaderboard/board';

const BANNED_FILE = 'leaderboard/banned.json';

function readBanned(): Set<string> {
  if (!existsSync(BANNED_FILE)) return new Set();
  const list: unknown = JSON.parse(readFileSync(BANNED_FILE, 'utf8'));
  return new Set(Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []);
}

/** Hands runs to the server, 200 at a time. Throws if it cannot be reached. */
async function carryToServer(codes: readonly string[]): Promise<number> {
  let kept = 0;
  for (let i = 0; i < codes.length; i += 200) {
    const response = await fetch(`${BOARD_API}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes: codes.slice(i, i + 200) }),
    });
    if (!response.ok) throw new Error(`The board server answered ${response.status}.`);
    const { results } = (await response.json()) as { results: string[] };
    kept += results.filter((result) => result === 'kept').length;
  }
  return kept;
}

async function main(): Promise<void> {
  const kept = existsSync(BOARD_FILE) ? parseBoardFile(readFileSync(BOARD_FILE, 'utf8')) : [];
  const incoming = await readRelay().catch((error: unknown) => {
    console.warn(`Relay: ${String(error)}`);
    return [] as string[];
  });
  let source: string[];
  try {
    const carried = await carryToServer([...kept, ...incoming]);
    source = await readServer();
    console.log(`Server: took ${carried} new best runs; now holds ${source.length}.`);
  } catch (error) {
    console.warn(`Server away (${String(error)}); keeping the file from the relay.`);
    source = [...kept, ...incoming];
  }
  const next = await nextBoardFile([], source, readBanned(), new Date());
  const same = next.posts.length === kept.length && next.posts.every((post, i) => post === kept[i]);
  console.log(
    `Relay: ${incoming.length} posts. Board file: ${kept.length} runs before, ${next.posts.length} after.`,
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
