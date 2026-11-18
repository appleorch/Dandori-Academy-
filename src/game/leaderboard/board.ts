import type { Difficulty } from '../core/difficulty';
import { LEVELS } from '../world/level';
import { checkRun, compareRuns, decodeRun, encodeRun, type RunEntry } from './runCode';

/**
 * The shared leaderboard needs no server of its own: each entry is an issue on the game's
 * public GitHub repository, opened by the player from a pre-filled link, and the board is
 * read back through GitHub's public API, which browsers may call directly. GitHub provides
 * the identity (the account that opened the issue) and the moderation (a `rejected` label).
 */
export const BOARD_REPO = 'appleorch/Dandori-Academy-';
export const TITLE_PREFIX = '[Leaderboard]';
/** Labels the repository owner can put on an entry to strike it off the board. */
const STRUCK = ['rejected', 'invalid', 'spam'];
/** Pages of 100 issues read at most: plenty, and well inside GitHub's anonymous rate limit. */
const MAX_PAGES = 5;
const FENCE = 'dandori-run';

export interface BoardEntry extends RunEntry {
  /** GitHub login of the player who posted it. */
  player: string;
  url: string;
}

/** What GitHub's issues API returns, as far as the board needs it. */
export interface GitHubIssue {
  title: string;
  body?: string | null;
  html_url: string;
  user?: { login: string } | null;
  labels?: (string | { name?: string })[];
  pull_request?: unknown;
}

const LEVEL_NAMES = new Map(LEVELS.map((level) => [level.id, level.name]));

/** The link that opens a new GitHub issue with the run filled in, ready to submit. */
export function submitUrl(run: RunEntry, code: string): string {
  const name = LEVEL_NAMES.get(run.level) ?? run.level;
  const title = `${TITLE_PREFIX} ${name} (${run.difficulty === 'hard' ? 'Hard' : 'Normal'}): ${run.score} pts, ${run.rank}`;
  const cleared = run.shards === run.shardsTotal;
  const body = [
    `**${name}** on ${run.difficulty === 'hard' ? 'Hard' : 'Normal'}: **${run.score}** points, **${run.rank}**.`,
    '',
    `- Sunshards: ${run.shards}/${run.shardsTotal}`,
    `- ${cleared ? `Cleared in ${run.time.toFixed(1)}s` : `Day used: ${run.time.toFixed(1)}s`}`,
    `- Sproutlings alive: ${run.alive}, lost: ${run.lost}`,
    `- Game version ${run.game}`,
    '',
    'Submit this issue as it is to post the run. The code below is checked by the game; editing it removes the run from the board.',
    '',
    '```' + FENCE,
    code,
    '```',
  ].join('\n');
  const params = new URLSearchParams({ title, body });
  return `https://github.com/${BOARD_REPO}/issues/new?${params.toString()}`;
}

/** A signed, pre-filled link for a run. */
export async function runLink(run: RunEntry): Promise<string> {
  return submitUrl(run, await encodeRun(run));
}

function labelNames(issue: GitHubIssue): string[] {
  return (issue.labels ?? []).map((label) =>
    (typeof label === 'string' ? label : (label.name ?? '')).toLowerCase(),
  );
}

/** The run posted in an issue, if it is a board entry, its code is genuine and its numbers add up. */
export async function entryOf(issue: GitHubIssue): Promise<BoardEntry | null> {
  if (issue.pull_request || !issue.title.startsWith(TITLE_PREFIX) || !issue.user) return null;
  if (labelNames(issue).some((label) => STRUCK.includes(label))) return null;
  const match = new RegExp('```' + FENCE + '\\s+(\\S+)\\s+```').exec(issue.body ?? '');
  if (!match) return null;
  const run = await decodeRun(match[1]);
  if (!run || checkRun(run) !== null) return null;
  return { ...run, player: issue.user.login, url: issue.html_url };
}

/** Each player's best run on a lesson and difficulty, best first. */
export function standings(
  entries: readonly BoardEntry[],
  levelId: string,
  difficulty: Difficulty,
): BoardEntry[] {
  const best = new Map<string, BoardEntry>();
  for (const entry of entries) {
    if (entry.level !== levelId || entry.difficulty !== difficulty) continue;
    const held = best.get(entry.player);
    if (!held || compareRuns(entry, held) < 0) best.set(entry.player, entry);
  }
  return [...best.values()].sort(compareRuns);
}

export type Fetcher = (
  url: string,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Every genuine entry on the board, read from GitHub. Throws if GitHub cannot be reached. */
export async function fetchBoard(fetcher: Fetcher = (url) => fetch(url)): Promise<BoardEntry[]> {
  const entries: BoardEntry[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await fetcher(
      `https://api.github.com/repos/${BOARD_REPO}/issues?state=all&per_page=100&page=${page}`,
    );
    if (!response.ok) {
      throw new Error(
        response.status === 403 || response.status === 429
          ? 'GitHub is limiting requests from this network for now. Try again in a while.'
          : `GitHub answered ${response.status}.`,
      );
    }
    const issues = (await response.json()) as GitHubIssue[];
    if (!Array.isArray(issues)) break;
    for (const issue of issues) {
      const entry = await entryOf(issue);
      if (entry) entries.push(entry);
    }
    if (issues.length < 100) break;
  }
  return entries;
}
