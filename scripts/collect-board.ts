/**
 * Run by the Leaderboard GitHub Action (`.github/workflows/leaderboard.yml`), and by hand with
 * `npm run board:collect`. Reads the runs posted to the relay in the last 12 hours, checks each
 * against the game's own rules, replays each one that brought its replay log (with this same
 * build: see SIM_VERSION in src/game/replay/replay.ts) and drops any whose replay gives a
 * different result, merges them with the runs already kept, and rewrites
 * `leaderboard/board.json` only when it has changed. The best few replays of each board are
 * kept beside it in `leaderboard/logs/`.
 *
 * `leaderboard/banned.json` lists player ids (16 hex digits) whose runs are left off.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  BOARD_FILE,
  BOARD_LOGS_DIR,
  collectBoard,
  parseBoardFileFull,
  readRelayPosts,
} from '../src/game/leaderboard/board';
import { logHash } from '../src/game/replay/replayStore';
import { verifyRun } from '../src/game/replay/verify';
import { initPhysics } from '../src/game/simulation/physics';
import { decodePost } from '../src/game/leaderboard/runCode';
import { ensureDaily } from '../src/game/world/daily';

const BANNED_FILE = 'leaderboard/banned.json';

function readBanned(): Set<string> {
  if (!existsSync(BANNED_FILE)) return new Set();
  const list: unknown = JSON.parse(readFileSync(BANNED_FILE, 'utf8'));
  return new Set(Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []);
}

const logFile = (hash: string) => `${BOARD_LOGS_DIR}/${hash}.json`;

async function main(): Promise<void> {
  await initPhysics();
  const previous = existsSync(BOARD_FILE)
    ? parseBoardFileFull(readFileSync(BOARD_FILE, 'utf8'))
    : { v: 1 as const, updated: '', posts: [], verified: [], logs: [] };
  const incoming = await readRelayPosts();
  // Daily fields are made from their dates: make each one a run was posted on, first.
  const keys = new Set<string>();
  for (const code of [...previous.posts, ...incoming.map((post) => post.code)]) {
    const post = await decodePost(code);
    const key = post?.run.level.match(/^hunt-daily-(\d{4}-\d{2}-\d{2})$/)?.[1];
    if (key) keys.add(key);
  }
  for (const key of keys) await ensureDaily(key);
  let replayed = 0;
  const next = await collectBoard(
    previous,
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
