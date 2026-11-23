/**
 * The Academy board's server: a Cloudflare Worker over a D1 database (see `migrations/`). It keeps each player's best run per board, lesson and difficulty, checked with
 * the game's own rules (`src/game/leaderboard/`), so the board never resets.
 */
import { boardMode, entryOf, type BoardEntry } from '../src/game/leaderboard/board';
import { compareRuns } from '../src/game/leaderboard/runCode';

export interface Env {
  DB: D1Database;
}

export const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...headers },
  });
}

export function keyOf(entry: BoardEntry): string {
  return `${entry.player}|${boardMode(entry)}|${entry.level}|${entry.difficulty}`;
}

export type Taken = 'kept' | 'not-better' | 'banned' | 'invalid';

/** Checks a signed post and keeps it if it is the player's best on that lesson. */
export async function takePost(db: D1Database, code: string): Promise<Taken> {
  if (typeof code !== 'string' || code.length > 8192) return 'invalid';
  const entry = await entryOf(code);
  if (!entry) return 'invalid';
  const banned = await db
    .prepare('SELECT 1 FROM banned WHERE player = ?')
    .bind(entry.player)
    .first();
  if (banned) return 'banned';
  const key = keyOf(entry);
  const held = await db
    .prepare('SELECT code FROM posts WHERE key = ?')
    .bind(key)
    .first<{ code: string }>();
  if (held) {
    const heldEntry = await entryOf(held.code);
    // A held run that no longer checks out (its lesson changed) is replaced by any good one.
    if (heldEntry && compareRuns(entry, heldEntry) >= 0) return 'not-better';
  }
  await db
    .prepare(
      `INSERT INTO posts (key, player, mode, level, difficulty, name, score, code, posted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET name = excluded.name, score = excluded.score,
         code = excluded.code, posted = excluded.posted`,
    )
    .bind(
      key,
      entry.player,
      boardMode(entry),
      entry.level,
      entry.difficulty,
      entry.name,
      entry.score,
      code,
      new Date().toISOString(),
    )
    .run();
  return 'kept';
}

/** The Workers edge cache (`caches.default`), which the DOM's CacheStorage type does not name. */
export function edgeCache(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

/** Cache key for the whole board, dropped whenever a run is kept. */
export function boardCacheKey(request: Request): Request {
  return new Request(new URL('/board', request.url).toString(), { method: 'GET' });
}
