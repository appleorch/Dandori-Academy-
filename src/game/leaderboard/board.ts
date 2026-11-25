import type { DayLog } from '../replay/replay';
import { cleanWardenName } from '../core/settings';
import type { Difficulty } from '../core/difficulty';
import type { ChallengeId } from '../modes/modes';
import {
  checkRun,
  compareRuns,
  decodePost,
  encodePost,
  type BoardPost,
  type RunEntry,
} from './runCode';

/**
 * The Academy board lives on a small server: a Cloudflare Worker over a D1 database
 * (`worker/`). It never resets.
 *
 * 1. When a day ends with a new personal best, the game posts the signed run to
 *    `BOARD_API/runs`. The server checks it with these same rules and keeps each player's best
 *    run per board, lesson and difficulty.
 * 2. The board reads `BOARD_API/board`.
 * 3. If the server cannot be reached, runs go to the old public relay (ntfy.sh, kept 12 hours)
 *    and the board reads the relay plus `leaderboard/board.json`, a backup of the server's board
 *    that a scheduled GitHub Action keeps. The server collects the relay every half hour.
 *
 * Every run is checked again wherever it is read, so neither the server nor the relay is trusted.
 */
/** The board server. The web, itch.io and desktop builds all use the same one. */
export const BOARD_API = 'https://dandori-board.dandori-academy.workers.dev';
export const BOARD_REPO = 'appleorch/Dandori-Academy-';
export const RELAY = 'https://ntfy.sh';
export const BOARD_TOPIC = 'dandori-academy-runs-v1-q7k2m9x4';
export const BOARD_FILE = 'leaderboard/board.json';
export const BOARD_FILE_URL = `https://raw.githubusercontent.com/${BOARD_REPO}/main/${BOARD_FILE}`;
/** How long the relay keeps a message, which is how far back the board reads it. */
export const RELAY_HOURS = 12;
/** Most runs kept per lesson and difficulty, one per player. */
export const KEPT_PER_LESSON = 100;

export interface BoardEntry extends RunEntry {
  player: string;
  name: string;
  /** The signed post the entry came from. */
  code: string;
  /** The SHA-256 of the run's replay log, if it was posted with one. */
  logHash?: string;
  /** Whether the board's server replayed the run and got the same result. */
  verified?: boolean;
}

/** A post as it comes off the relay: the signed code, and the replay log carried beside it. */
export interface RelayPost {
  code: string;
  log?: DayLog;
}

/** The file the GitHub Action keeps. */
export interface BoardFile {
  v: 1;
  updated: string;
  /** Signed posts, one per player per lesson and difficulty. */
  posts: string[];
  /** Of the posts, those whose replay the server ran and found to give the result claimed. */
  verified?: string[];
  /** Hashes of the replay logs kept beside the board (`leaderboard/logs/<hash>.json`). */
  logs?: string[];
}

/** Where kept replay logs are, by hash. */
export const BOARD_LOGS_DIR = 'leaderboard/logs';
export const BOARD_LOGS_URL = `https://raw.githubusercontent.com/${BOARD_REPO}/main/${BOARD_LOGS_DIR}`;
/** Replays kept per board (mode, field and difficulty): the top few, for ghosts and watching. */
export const LOGS_KEPT = 3;

/** What the board needs from `fetch`. */
export type Fetcher = (
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

const defaultFetcher: Fetcher = (url, init) => fetch(url, init);

/** The entry in a signed post, if it is genuine, its name is one the board shows, and it adds up. */
export async function entryOf(code: string): Promise<BoardEntry | null> {
  const post = await decodePost(code);
  if (!post || cleanWardenName(post.name) !== post.name) return null;
  if (checkRun(post.run) !== null) return null;
  return { ...post.run, player: post.player, name: post.name, code, logHash: post.log };
}

/**
 * Which board a run belongs on: its challenge, 'lessons' for Time Attack, or 'classic' for runs
 * from the scored story.
 */
export type BoardMode = ChallengeId | 'lessons' | 'classic';

export function boardMode(entry: Pick<BoardEntry, 'mode'>): BoardMode {
  return entry.mode ?? 'classic';
}

/** Each player's best run on a lesson, difficulty and board, best first. */
export function standings(
  entries: readonly BoardEntry[],
  levelId: string,
  difficulty: Difficulty,
  mode: BoardMode = 'classic',
  coop = false,
): BoardEntry[] {
  return keepBest(entries).filter(
    (entry) =>
      entry.level === levelId &&
      entry.difficulty === difficulty &&
      boardMode(entry) === mode &&
      (entry.coop === true) === coop,
  );
}

/** The board a run is kept on: its mode's, and apart from the solo runs if played in co-op. */
export function boardGroup(entry: Pick<BoardEntry, 'mode' | 'coop'>): string {
  return `${boardMode(entry)}${entry.coop ? '+coop' : ''}`;
}

/**
 * One run per player per board, lesson and difficulty (their best), and at most
 * `KEPT_PER_LESSON` on each.
 */
export function keepBest(entries: readonly BoardEntry[]): BoardEntry[] {
  const best = new Map<string, BoardEntry>();
  for (const entry of entries) {
    const key = `${entry.player}|${boardGroup(entry)}|${entry.level}|${entry.difficulty}`;
    const held = best.get(key);
    if (!held || compareRuns(entry, held) < 0) best.set(key, entry);
  }
  const lessons = new Map<string, BoardEntry[]>();
  for (const entry of best.values()) {
    const key = `${boardGroup(entry)}|${entry.level}|${entry.difficulty}`;
    lessons.set(key, [...(lessons.get(key) ?? []), entry]);
  }
  return [...lessons.values()].flatMap((list) => list.sort(compareRuns).slice(0, KEPT_PER_LESSON));
}

/** What the relay's answer holds: posts in its messages, and links to posts sent as files. */
export function parseRelayPosts(text: string): { posts: RelayPost[]; attachments: string[] } {
  const posts: RelayPost[] = [];
  const attachments: string[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as {
        event?: unknown;
        message?: unknown;
        attachment?: { url?: unknown };
      };
      if (event.event !== 'message') continue;
      // A long message (a post with its replay) is kept by the relay as a file.
      if (typeof event.attachment?.url === 'string') {
        attachments.push(event.attachment.url);
        continue;
      }
      if (typeof event.message !== 'string') continue;
      const post = relayPostOf(event.message);
      if (post) posts.push(post);
    } catch {
      // Anything else on the topic is not a run.
    }
  }
  return { posts, attachments };
}

/** The post in one relay message, or null. */
export function relayPostOf(message: string): RelayPost | null {
  try {
    const body = JSON.parse(message) as { dandori?: unknown; code?: unknown; log?: unknown };
    if (body.dandori !== 1 || typeof body.code !== 'string') return null;
    const log = isDayLog(body.log) ? body.log : undefined;
    return log ? { code: body.code, log } : { code: body.code };
  } catch {
    return null;
  }
}

function isDayLog(value: unknown): value is DayLog {
  if (typeof value !== 'object' || value === null) return false;
  const log = value as Partial<DayLog>;
  return (
    log.v === 1 &&
    typeof log.sim === 'number' &&
    typeof log.level === 'string' &&
    typeof log.mode === 'string' &&
    typeof log.inputs === 'string' &&
    Array.isArray(log.events)
  );
}

/** Signed posts from the relay's answer: one JSON event per line, runs in the messages. */
export function parseRelay(text: string): string[] {
  return parseRelayPosts(text).posts.map((post) => post.code);
}

/** The message that carries a post over the relay, with its replay log if there is one. */
export function relayMessage(code: string, log?: DayLog): string {
  return JSON.stringify(log ? { dandori: 1, code, log } : { dandori: 1, code });
}

/**
 * Posts a run to the server, and to the relay too when it brings its replay (the board's
 * collection replays it from there to verify it), or when the server is away. True once
 * either has it.
 */
export async function sendPost(
  post: BoardPost,
  fetcher: Fetcher = defaultFetcher,
  log?: DayLog,
): Promise<boolean> {
  const code = await encodePost(post);
  let taken = false;
  try {
    const response = await fetcher(`${BOARD_API}/runs`, {
      method: 'POST',
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json' },
    });
    // 422 and 403 (a run the server refuses, a banned player) will never be taken: stop trying.
    taken = response.ok || response.status === 422 || response.status === 403;
  } catch {
    // Fall through to the relay.
  }
  if (taken && !log) return true;
  try {
    const response = await fetcher(`${RELAY}/${BOARD_TOPIC}`, {
      method: 'POST',
      body: relayMessage(code, log),
    });
    return taken || response.ok;
  } catch {
    return taken;
  }
}

/** Every run the server keeps. Throws if the server cannot be reached. */
export async function readServer(fetcher: Fetcher = defaultFetcher): Promise<string[]> {
  const response = await fetcher(`${BOARD_API}/board`);
  if (!response.ok) throw new Error(`The board server answered ${response.status}.`);
  return parseBoardFile(await response.text());
}

/** Every post on the relay from the last 12 hours. Throws if the relay cannot be reached. */
export async function readRelay(fetcher: Fetcher = defaultFetcher): Promise<string[]> {
  return (await readRelayPosts(fetcher)).map((post) => post.code);
}

/** Every post on the relay from the last 12 hours, with replays, fetching those kept as files. */
export async function readRelayPosts(fetcher: Fetcher = defaultFetcher): Promise<RelayPost[]> {
  const response = await fetcher(`${RELAY}/${BOARD_TOPIC}/json?poll=1&since=${RELAY_HOURS}h`);
  if (!response.ok) throw new Error(`The relay answered ${response.status}.`);
  const { posts, attachments } = parseRelayPosts(await response.text());
  for (const url of attachments) {
    // Only the relay's own files are fetched.
    if (!url.startsWith(`${RELAY}/`)) continue;
    try {
      const file = await fetcher(url);
      const post = file.ok ? relayPostOf(await file.text()) : null;
      if (post) posts.push(post);
    } catch {
      // A file gone or unreachable is a post missed this time.
    }
  }
  return posts;
}

/** The posts in the board file. A file that is not there yet is an empty board. */
export function parseBoardFileFull(text: string): BoardFile {
  try {
    const file = JSON.parse(text) as Partial<BoardFile>;
    const strings = (list: unknown) =>
      Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : [];
    return {
      v: 1,
      updated: typeof file.updated === 'string' ? file.updated : '',
      posts: strings(file.posts),
      verified: strings(file.verified),
      logs: strings(file.logs),
    };
  } catch {
    return { v: 1, updated: '', posts: [], verified: [], logs: [] };
  }
}

export function parseBoardFile(text: string): string[] {
  try {
    const file = JSON.parse(text) as Partial<BoardFile>;
    return Array.isArray(file.posts) ? file.posts.filter((post) => typeof post === 'string') : [];
  } catch {
    return [];
  }
}

export async function readBoardFile(fetcher: Fetcher = defaultFetcher): Promise<string[]> {
  const response = await fetcher(BOARD_FILE_URL);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`GitHub answered ${response.status}.`);
  return parseBoardFile(await response.text());
}

/** Turns signed posts into checked entries, dropping duplicates, fakes and banned players. */
export async function checkPosts(
  codes: readonly string[],
  banned: ReadonlySet<string> = new Set(),
): Promise<BoardEntry[]> {
  const entries: BoardEntry[] = [];
  for (const code of new Set(codes)) {
    const entry = await entryOf(code);
    if (entry && !banned.has(entry.player)) entries.push(entry);
  }
  return entries;
}

export interface Board {
  entries: BoardEntry[];
  /** Which sources answered: the server, or else the backup file and the relay. */
  server: boolean;
  file: boolean;
  relay: boolean;
  /** Replay logs to hand: those riding on the relay, by hash. */
  logs: Map<string, DayLog>;
  /** Hashes of the replays kept beside the board file. */
  kept: Set<string>;
}

/** The whole board file, with which runs are verified and which replays are kept. */
export async function readBoardFileFull(fetcher: Fetcher = defaultFetcher): Promise<BoardFile> {
  const response = await fetcher(BOARD_FILE_URL);
  if (response.status === 404) return { v: 1, updated: '', posts: [], verified: [], logs: [] };
  if (!response.ok) throw new Error(`GitHub answered ${response.status}.`);
  return parseBoardFileFull(await response.text());
}

/**
 * The whole board: the server's, or, when the server is away, the backup file and the relay
 * together. Throws only if nothing can be read.
 */
export async function fetchBoard(fetcher: Fetcher = defaultFetcher): Promise<Board> {
  // The server's board, and the backup file (which also says which runs were verified by
  // replay and which replays are kept) and the relay (which carries replays) beside it.
  const [server, file, relay] = await Promise.allSettled([
    readServer(fetcher),
    readBoardFileFull(fetcher),
    readRelayPosts(fetcher),
  ]);
  if (server.status === 'rejected' && file.status === 'rejected' && relay.status === 'rejected') {
    throw new Error('The board could not be reached. Check your connection and try again.');
  }
  const fileValue = file.status === 'fulfilled' ? file.value : null;
  const posts = relay.status === 'fulfilled' ? relay.value : [];
  const verified = new Set(fileValue?.verified ?? []);
  const logs = new Map<string, DayLog>();
  const codes = [
    ...(server.status === 'fulfilled' ? server.value : (fileValue?.posts ?? [])),
    ...posts.map((post) => post.code),
  ];
  const entries = keepBest(await checkPosts(codes)).map((entry) =>
    verified.has(entry.code) ? { ...entry, verified: true } : entry,
  );
  // Replays on the relay are matched to their posts by the hash the post signed.
  const wanted = new Set(entries.map((entry) => entry.logHash).filter(Boolean));
  if (wanted.size > 0 && posts.some((post) => post.log)) {
    const { logHash } = await import('../replay/replayStore');
    for (const post of posts) {
      if (!post.log) continue;
      const hash = logHash(post.log);
      if (wanted.has(hash)) logs.set(hash, post.log);
    }
  }
  return {
    entries,
    server: server.status === 'fulfilled',
    file: fileValue !== null,
    relay: relay.status === 'fulfilled',
    logs,
    kept: new Set(fileValue?.logs ?? []),
  };
}

/** A run's replay, from the relay's answer or the logs kept beside the board; null if neither. */
export async function fetchLog(
  hash: string,
  board: Pick<Board, 'logs' | 'kept'>,
  fetcher: Fetcher = defaultFetcher,
): Promise<DayLog | null> {
  const riding = board.logs.get(hash);
  if (riding) return riding;
  if (!board.kept.has(hash)) return null;
  try {
    const response = await fetcher(`${BOARD_LOGS_URL}/${hash}.json`);
    if (!response.ok) return null;
    const log: unknown = JSON.parse(await response.text());
    return isDayLog(log) ? log : null;
  } catch {
    return null;
  }
}

/**
 * The next board file: what is kept already plus whatever is new, checked again, one run per
 * player per lesson. Used by the GitHub Action; the same rules as the game's own board.
 */
export async function nextBoardFile(
  kept: readonly string[],
  incoming: readonly string[],
  banned: ReadonlySet<string>,
  now: Date,
): Promise<BoardFile> {
  const entries = keepBest(await checkPosts([...kept, ...incoming], banned));
  entries.sort(
    (a, b) =>
      a.level.localeCompare(b.level) ||
      a.difficulty.localeCompare(b.difficulty) ||
      compareRuns(a, b),
  );
  return { v: 1, updated: now.toISOString(), posts: entries.map((entry) => entry.code) };
}

/** What replaying a run's log showed: the same result, a different one, or nothing (it could
 * not be replayed here, as on another simulation version). */
export type Verdict = 'same' | 'different' | 'unchecked';

/** The next board file, checked by replay, and the replay logs to keep beside it. */
export interface Collected {
  file: BoardFile;
  /** Logs new this time that the file keeps, by hash: to be written beside the board. */
  logs: Map<string, DayLog>;
}

/**
 * The board's collection, as the GitHub Action runs it: the posts kept already and those new on
 * the relay, checked by the game's arithmetic first and then, where a post brought its replay,
 * by replaying it (`verify`). A run whose replay gives a different result is dropped; one that
 * cannot be replayed here stays, unverified. Runs verified before stay verified. The best few
 * on each board keep their replays, for watching and racing.
 */
export async function collectBoard(
  previous: BoardFile,
  incoming: readonly RelayPost[],
  banned: ReadonlySet<string>,
  now: Date,
  verify: (entry: BoardEntry, log: DayLog) => Promise<Verdict>,
  hasLog: (hash: string) => boolean,
  hashOf: (log: DayLog) => string,
): Promise<Collected> {
  const logs = new Map<string, DayLog>();
  for (const post of incoming) if (post.log) logs.set(hashOf(post.log), post.log);
  const before = new Set(previous.verified ?? []);
  const checked: BoardEntry[] = [];
  for (const entry of await checkPosts(
    [...previous.posts, ...incoming.map((post) => post.code)],
    banned,
  )) {
    if (before.has(entry.code)) {
      checked.push({ ...entry, verified: true });
      continue;
    }
    const log = entry.logHash ? logs.get(entry.logHash) : undefined;
    const verdict = log ? await verify(entry, log) : 'unchecked';
    if (verdict === 'different') continue;
    checked.push({ ...entry, verified: verdict === 'same' });
  }
  const entries = keepBest(checked);
  entries.sort(
    (a, b) =>
      a.level.localeCompare(b.level) ||
      a.difficulty.localeCompare(b.difficulty) ||
      compareRuns(a, b),
  );
  // The top few of each board keep their replays, where one is to hand.
  const kept = new Set<string>();
  const counted = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.logHash || !(logs.has(entry.logHash) || hasLog(entry.logHash))) continue;
    const key = `${boardGroup(entry)}|${entry.level}|${entry.difficulty}`;
    const count = counted.get(key) ?? 0;
    if (count >= LOGS_KEPT) continue;
    counted.set(key, count + 1);
    kept.add(entry.logHash);
  }
  return {
    file: {
      v: 1,
      updated: now.toISOString(),
      posts: entries.map((entry) => entry.code),
      verified: entries.filter((entry) => entry.verified).map((entry) => entry.code),
      logs: [...kept],
    },
    logs: new Map([...logs].filter(([hash]) => kept.has(hash))),
  };
}
