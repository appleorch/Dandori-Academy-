/**
 * The Academy board server, https://dandori-board.dandori-academy.workers.dev
 *
 * - `GET /board`: every kept run as signed posts, in the shape of `leaderboard/board.json`.
 * - `POST /runs` with `{ "code": "<signed post>" }`, or `{ "codes": [...] }` (up to 200).
 * - Every half hour it also collects runs that went to the old relay (ntfy.sh) while a player
 *   could not reach it.
 *
 * Deploy with `npm run deploy:board`. Strike a player off with
 * `npx wrangler d1 execute dandori-board --remote --config worker/wrangler.toml
 *   --command "INSERT INTO banned (player) VALUES ('<16 hex digits>')"`.
 */
import { readRelay } from '../src/game/leaderboard/board';
import { boardCacheKey, CORS, edgeCache, json, takePost, type Env } from './board';

async function readBoard(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const key = boardCacheKey(request);
  const hit = await edgeCache().match(key);
  if (hit) return hit;
  const { results } = await env.DB.prepare(
    `SELECT code FROM posts WHERE player NOT IN (SELECT player FROM banned)
     ORDER BY mode, level, difficulty, score DESC`,
  ).all<{ code: string }>();
  const response = json(
    { v: 1, updated: new Date().toISOString(), posts: results.map((row) => row.code) },
    200,
    { 'Cache-Control': 'public, max-age=30' },
  );
  ctx.waitUntil(edgeCache().put(key, response.clone()));
  return response;
}

async function postRuns(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const text = await request.text();
  if (text.length > 1_000_000) return json({ error: 'Too large.' }, 413);
  let body: { code?: unknown; codes?: unknown };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return json({ error: 'Not JSON.' }, 400);
  }
  const many = Array.isArray(body.codes);
  const codes = many ? (body.codes as unknown[]).slice(0, 200) : [body.code];
  const results = [];
  for (const code of codes) results.push(await takePost(env.DB, code as string));
  if (results.includes('kept')) ctx.waitUntil(edgeCache().delete(boardCacheKey(request)));
  if (many) return json({ results });
  const result = results[0];
  return json({ result }, result === 'invalid' ? 422 : result === 'banned' ? 403 : 200);
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (pathname === '/board' && request.method === 'GET') return readBoard(request, env, ctx);
    if (pathname === '/runs' && request.method === 'POST') return postRuns(request, env, ctx);
    if (pathname === '/') return json({ ok: true, board: '/board', post: '/runs' });
    return json({ error: 'Not found.' }, 404);
  },

  async scheduled(_event, env): Promise<void> {
    const codes = await readRelay();
    let kept = 0;
    for (const code of codes) if ((await takePost(env.DB, code)) === 'kept') kept += 1;
    console.log(`Relay: ${codes.length} posts, ${kept} new best runs kept.`);
  },
} satisfies ExportedHandler<Env>;
