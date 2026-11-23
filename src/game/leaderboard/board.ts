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
 * The Academy board needs no server of its own. Runs travel through a public relay and come to
 * rest in a file in the game's own repository:
 *
 * 1. When a day ends with a new personal best, the game posts the signed run to a topic on
 *    ntfy.sh, a free public message relay that browsers may post to and read from without an
 *    account. The relay keeps messages for 12 hours.
 * 2. A scheduled GitHub Action in the repository (`.github/workflows/leaderboard.yml`) reads
 *    the topic every half hour, checks every run against the game's own rules, and commits the
 *    survivors to `leaderboard/board.json`.
 * 3. The board reads that file (served by GitHub, which browsers may also read), plus whatever
 *    reached the relay in the last 12 hours, so a new run shows up at once.
 *
 * Every run is checked again wherever it is read, so neither the relay nor the file is trusted.
 */
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
}

/** The file the GitHub Action keeps. */
export interface BoardFile {
  v: 1;
  updated: string;
  /** Signed posts, one per player per lesson and difficulty. */
  posts: string[];
}

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
  return { ...post.run, player: post.player, name: post.name, code };
}

/** Which board a run belongs on: its challenge, or 'classic' for runs from the scored story. */
export type BoardMode = ChallengeId | 'classic';

export function boardMode(entry: Pick<BoardEntry, 'mode'>): BoardMode {
  return entry.mode ?? 'classic';
}

/** Each player's best run on a lesson, difficulty and board, best first. */
export function standings(
  entries: readonly BoardEntry[],
  levelId: string,
  difficulty: Difficulty,
  mode: BoardMode = 'classic',
): BoardEntry[] {
  return keepBest(entries).filter(
    (entry) =>
      entry.level === levelId && entry.difficulty === difficulty && boardMode(entry) === mode,
  );
}

/**
 * One run per player per board, lesson and difficulty (their best), and at most
 * `KEPT_PER_LESSON` on each.
 */
export function keepBest(entries: readonly BoardEntry[]): BoardEntry[] {
  const best = new Map<string, BoardEntry>();
  for (const entry of entries) {
    const key = `${entry.player}|${boardMode(entry)}|${entry.level}|${entry.difficulty}`;
    const held = best.get(key);
    if (!held || compareRuns(entry, held) < 0) best.set(key, entry);
  }
  const lessons = new Map<string, BoardEntry[]>();
  for (const entry of best.values()) {
    const key = `${boardMode(entry)}|${entry.level}|${entry.difficulty}`;
    lessons.set(key, [...(lessons.get(key) ?? []), entry]);
  }
  return [...lessons.values()].flatMap((list) => list.sort(compareRuns).slice(0, KEPT_PER_LESSON));
}

/** Signed posts from the relay's answer: one JSON event per line, runs in the messages. */
export function parseRelay(text: string): string[] {
  const codes: string[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as { event?: unknown; message?: unknown };
      if (event.event !== 'message' || typeof event.message !== 'string') continue;
      const body = JSON.parse(event.message) as { dandori?: unknown; code?: unknown };
      if (body.dandori === 1 && typeof body.code === 'string') codes.push(body.code);
    } catch {
      // Anything else on the topic is not a run.
    }
  }
  return codes;
}

/** The message that carries a post over the relay. */
export function relayMessage(code: string): string {
  return JSON.stringify({ dandori: 1, code });
}

/** Posts a run to the relay. True once the relay has taken it. */
export async function sendPost(
  post: BoardPost,
  fetcher: Fetcher = defaultFetcher,
): Promise<boolean> {
  try {
    const response = await fetcher(`${RELAY}/${BOARD_TOPIC}`, {
      method: 'POST',
      body: relayMessage(await encodePost(post)),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Every post on the relay from the last 12 hours. Throws if the relay cannot be reached. */
export async function readRelay(fetcher: Fetcher = defaultFetcher): Promise<string[]> {
  const response = await fetcher(`${RELAY}/${BOARD_TOPIC}/json?poll=1&since=${RELAY_HOURS}h`);
  if (!response.ok) throw new Error(`The relay answered ${response.status}.`);
  return parseRelay(await response.text());
}

/** The posts in the board file. A file that is not there yet is an empty board. */
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
  /** Which sources answered: the board file and the relay. */
  file: boolean;
  relay: boolean;
}

/** The whole board: the file and the relay together. Throws only if neither can be read. */
export async function fetchBoard(fetcher: Fetcher = defaultFetcher): Promise<Board> {
  const [file, relay] = await Promise.allSettled([readBoardFile(fetcher), readRelay(fetcher)]);
  if (file.status === 'rejected' && relay.status === 'rejected') {
    throw new Error('The board could not be reached. Check your connection and try again.');
  }
  const codes = [
    ...(file.status === 'fulfilled' ? file.value : []),
    ...(relay.status === 'fulfilled' ? relay.value : []),
  ];
  return {
    entries: keepBest(await checkPosts(codes)),
    file: file.status === 'fulfilled',
    relay: relay.status === 'fulfilled',
  };
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
