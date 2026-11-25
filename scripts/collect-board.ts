/**
 * Run by the Leaderboard GitHub Action (`.github/workflows/leaderboard.yml`), and by hand with
 * `npm run board:collect`.
 *
 * 1. Reads the runs posted to the relay in the last 12 hours (with any replay logs riding
 *    beside them) and hands them to the board server (`worker/`), which keeps the permanent
 *    board. The server's board, if it answers, is the base; otherwise the backup file is.
 * 2. Checks every run against the game's own rules, replays each new one that brought its log
 *    (with this same build: see SIM_VERSION in src/game/replay/replay.ts) and drops any whose
 *    replay gives a different result.
 * 3. Rewrites `leaderboard/board.json` (the backup, with which runs are verified) only when it
 *    has changed, and keeps the best few replays of each board in `leaderboard/logs/`.
 *
 * `leaderboard/banned.json` lists player ids (16 hex digits) whose runs are left off.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  BOARD_API,
  BOARD_FILE,
  BOARD_LOGS_DIR,
  collectBoard,
  parseBoardFileFull,
  readRelayPosts,
  readServer,
  type RelayPost,
} from '../src/game/leaderboard/board';
import { decodePost } from '../src/game/leaderboard/runCode';
import { logHash } from '../src/game/replay/replayStore';
import { verifyRun } from '../src/game/replay/verify';
import { initPhysics } from '../src/game/simulation/physics';
import { ensureDaily } from '../src/game/world/daily';

const BANNED_FILE = 'leaderboard/banned.json';

function readBanned(): Set<string> {
  if (!existsSync(BANNED_FILE)) return new Set();
  const list: unknown = JSON.parse(readFileSync(BANNED_FILE, 'utf8'));
  return new Set(Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []);
}

const logFile = (hash: string) => `${BOARD_LOGS_DIR}/${hash}.json`;

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
  await initPhysics();
  const previous = existsSync(BOARD_FILE)
    ? parseBoardFileFull(readFileSync(BOARD_FILE, 'utf8'))
    : { v: 1 as const, updated: '', posts: [], verified: [], logs: [] };
  const incoming: RelayPost[] = await readRelayPosts().catch((error: unknown) => {
    console.warn(`Relay: ${String(error)}`);
    return [];
  });
  // The server keeps the permanent board: hand it what reached the relay, and start from it.
  let base = previous;
  try {
    const carried = await carryToServer([...previous.posts, ...incoming.map((post) => post.code)]);
    base = { ...previous, posts: await readServer() };
    console.log(`Server: took ${carried} new best runs; now holds ${base.posts.length}.`);
  } catch (error) {
    console.warn(`Server away (${String(error)}); keeping the file from the relay.`);
  }
  // Daily fields are made from their dates: make each one a run was posted on, first.
  const keys = new Set<string>();
  for (const code of [...base.posts, ...incoming.map((post) => post.code)]) {
    const post = await decodePost(code);
    const key = post?.run.level.match(/^hunt-daily-(\d{4}-\d{2}-\d{2})$/)?.[1];
    if (key) keys.add(key);
  }
  for (const key of keys) await ensureDaily(key);
  let replayed = 0;
  const next = await collectBoard(
    base,
    incoming,
    readBanned(),
    new Date(),
    async (entry, log) => {
      replayed++;
      return verifyRun(entry, log);
    },
    (hash) => existsSync(logFile(hash)),
    logHash,
  );
  const same =
    JSON.stringify({ ...next.file, updated: '' }) === JSON.stringify({ ...previous, updated: '' });
  console.log(
    `Relay: ${incoming.length} posts, ${replayed} replayed. Board: ${previous.posts.length} runs before, ${next.file.posts.length} after, ${next.file.verified?.length ?? 0} verified.`,
  );
  if (next.logs.size > 0) {
    mkdirSync(BOARD_LOGS_DIR, { recursive: true });
    for (const [hash, log] of next.logs) writeFileSync(logFile(hash), JSON.stringify(log));
  }
  if (same && existsSync(BOARD_FILE)) {
    console.log('No change.');
    return;
  }
  writeFileSync(BOARD_FILE, `${JSON.stringify(next.file, null, 2)}\n`);
  console.log(`Wrote ${BOARD_FILE}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
