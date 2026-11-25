import { penaltyPerLoss, type Difficulty } from '../core/difficulty';
import { WORKER } from '../core/config';
import {
  POINTS_PER_SECOND,
  POINTS_PER_WORKER,
  rankFor,
  RANKS,
  type Rank,
} from '../dandori/scoring';
import {
  bonusParts,
  forDifficulty,
  defineLevel,
  levelById,
  shardCount,
  sproutlingsPossible,
  treasureTotal,
  type LevelDefinition,
} from '../world/level';
import { BLOOM_VALUE_PER_WEIGHT } from '../world/spawn';
import {
  carcassWeight,
  CHALLENGE_IDS,
  challengeOpen,
  scoreChallenge,
  shardWeight,
  type ChallengeFacts,
  type ChallengeId,
  type ChallengeScore,
} from '../modes/modes';

/**
 * A finished day, written down so it can be shared: the numbers behind its score, which
 * lesson it was on, and a fingerprint of that lesson as it was played, so runs on a lesson
 * that has since been rebalanced are never ranked against runs on the new one.
 */
export interface RunEntry {
  v: 1;
  /** Game version the run was played on: shown, not checked. */
  game: string;
  level: string;
  difficulty: Difficulty;
  /** Fingerprint of the lesson as played; see `fingerprint`. */
  print: string;
  score: number;
  treasure: number;
  timeBonus: number;
  workerBonus: number;
  lossPenalty: number;
  /**
   * Glowcap points within `treasure` and `score`: they never count towards the rank. Missing on
   * runs from 0.17.0, which were ranked with Glowcaps in (see `checkRun`).
   */
  glowcaps?: number;
  rank: Rank;
  shards: number;
  shardsTotal: number;
  /** Seconds of the day used: the clear time, when every Sunshard came home. */
  time: number;
  /** Whole seconds left on the clock, as the time bonus counted them. */
  timeLeft: number;
  alive: number;
  lost: number;
  /** When it was played, as an ISO date. */
  at: string;
  /**
   * The challenge the run was played in. Missing on runs from before the challenges, which were
   * story days scored the way the story was then (the board calls them Classic).
   */
  mode?: ChallengeId;
  /** Challenge runs: weight brought home, of it carcasses, beasts left standing, and whether
   * everything was collected and the Warden and squad made it to the end. */
  weight?: number;
  /** Challenge runs: of the weight, the Glowcaps' (their points are in `glowcaps`). */
  glowcapWeight?: number;
  carcassWeight?: number;
  beastsLeft?: number;
  everything?: boolean;
  survived?: boolean;
  /** Played in local co-op, by two Wardens: on a board of its own. */
  coop?: boolean;
}

/** Two FNV-1a hashes with different offsets: 16 hex digits, plenty to tell lessons apart. */
export function fingerprint(level: LevelDefinition): string {
  return hash(JSON.stringify(level));
}

/**
 * Fingerprint of what a lesson plays like: everything but its words and its rank thresholds.
 * Runs are compared by score, which those never change, so rewording a briefing or moving a
 * rank target leaves the board as it is; moving a wall or a shard starts it afresh.
 */
export function playPrint(level: LevelDefinition): string {
  const skip = new Set<string>(NOT_PLAY);
  // Only the lesson's own fields are skipped, never a nested one that shares a name.
  return hash(
    JSON.stringify(level, function (this: unknown, key: string, value: unknown) {
      return this === level && skip.has(key) ? undefined : value;
    }),
  );
}

/** What a lesson says and what its ranks ask for: none of it changes how it plays. */
const NOT_PLAY = [
  'name',
  'brief',
  'wallLook',
  'props',
  'platinumTime',
  'parScore',
  'diamondTime',
  'diamondScore',
] as const satisfies readonly (keyof LevelDefinition)[];

/**
 * The par a lesson had in 0.17.0, when Glowcaps still counted towards the rank: the same as now
 * with every Glowcap's points added. Runs posted then are checked against it.
 */
function legacyPar(level: LevelDefinition): LevelDefinition {
  const glowcaps = bonusParts(level).glowcapPoints;
  return {
    ...level,
    parScore: level.parScore + glowcaps,
    diamondScore: level.diamondScore + glowcaps,
  };
}

function hash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ code, 0x01000193) >>> 0;
    b = (b ^ (b >>> 13)) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** The lesson a run was played on, as it was played (Normal or Hard). */
export function lessonOf(levelId: string, difficulty: Difficulty): LevelDefinition | null {
  const base = levelById(levelId);
  return base ? forDifficulty(base, difficulty) : null;
}

/**
 * Lesson Platinum times as they were when the lessons' boards closed to new runs (0.19.0), for
 * lessons whose time has been re-measured since. Runs on a lesson (the Classic board, and the
 * challenges as they were played on lessons) were ranked against these, so they are checked
 * against them for good.
 */
const CLOSED_PLATINUM: Readonly<Record<string, number>> = {
  'rush-hour': 294,
  // Re-measured in 0.25.0, when the bosses gained a third phase.
  'gravelmaws-pit': 118,
  'three-roots': 136,
  'graduation-day': 563,
  'restoration-day': 666,
  'the-root-cellar': 149,
};

/** A lesson as its board knows it: with the Platinum time it had when the board closed. */
function boardLesson(levelId: string, difficulty: Difficulty): LevelDefinition | null {
  const base = levelById(levelId);
  if (!base) return null;
  const closed = CLOSED_PLATINUM[levelId];
  // Dressing added since (props, a look for the walls) never changed how a lesson played.
  const { props: _props, wallLook: _look, ...plain } = base;
  void _props;
  void _look;
  const asClosed = closed === undefined ? plain : defineLevel({ ...plain, platinumTime: closed });
  return forDifficulty(asClosed, difficulty);
}

const prints = new Map<string, string>();
/** Fingerprint of a lesson as shipped in this build, on a difficulty. */
export function lessonPrint(levelId: string, difficulty: Difficulty): string | null {
  const key = `${levelId}:${difficulty}`;
  const known = prints.get(key);
  if (known) return known;
  const level = lessonOf(levelId, difficulty);
  if (!level) return null;
  const print = playPrint(level);
  prints.set(key, print);
  return print;
}

/** Fingerprint a lesson had in 0.17.0 (its whole definition, with that version's par). */
export function legacyPrint(levelId: string, difficulty: Difficulty): string | null {
  const level = boardLesson(levelId, difficulty);
  return level ? fingerprint(legacyPar(level)) : null;
}

/** Whether a run was played on the lesson as it is now (or as it was in 0.17.0, for its runs). */
export function playedOnThisLesson(run: RunEntry): boolean {
  return run.glowcaps === undefined && run.mode === undefined
    ? run.print === legacyPrint(run.level, run.difficulty)
    : run.print === lessonPrint(run.level, run.difficulty);
}

/** What a finished day needs to say about itself to become a run. */
export interface FinishedDay {
  levelId: string;
  difficulty: Difficulty;
  score: {
    total: number;
    treasure: number;
    timeBonus: number;
    workerBonus: number;
    lossPenalty: number;
    glowcaps: number;
    rank: Rank;
  };
  shards: number;
  shardsTotal: number;
  elapsed: number;
  timeLeft: number;
  alive: number;
  lost: number;
}

/** A finished day as a run, or null for a lesson this build does not have. */
export function makeRun(day: FinishedDay, game: string, at: Date): RunEntry | null {
  const print = lessonPrint(day.levelId, day.difficulty);
  if (!print) return null;
  return {
    v: 1,
    game,
    level: day.levelId,
    difficulty: day.difficulty,
    print,
    score: day.score.total,
    treasure: day.score.treasure,
    timeBonus: day.score.timeBonus,
    workerBonus: day.score.workerBonus,
    lossPenalty: day.score.lossPenalty,
    glowcaps: day.score.glowcaps,
    rank: day.score.rank,
    shards: day.shards,
    shardsTotal: day.shardsTotal,
    time: Math.round(day.elapsed * 100) / 100,
    timeLeft: Math.max(0, Math.ceil(day.timeLeft)),
    alive: day.alive,
    lost: day.lost,
    at: at.toISOString(),
  };
}

/**
 * Most a lesson's Sunshards can be worth on one day: their value with every twin bonus, every
 * Glowcap and its Dewglass whole. Generous on purpose; it only has to catch nonsense.
 */
function treasureCeiling(level: LevelDefinition): number {
  const blooms = (level.blooms ?? []).reduce((sum, bloom) => sum + bloom.weight, 0);
  return treasureTotal(level) * 2 + blooms * BLOOM_VALUE_PER_WEIGHT;
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * Why a run cannot be right, or null if it adds up. Every part of the score is recomputed
 * from the lesson's own rules, the rank from the score, and the clear time is checked
 * against the clock and against what is humanly possible.
 */
export function checkRun(run: RunEntry): string | null {
  // A challenge field is checked as it is now; a lesson as it was when its board closed.
  const level = levelById(run.level)?.challenge
    ? lessonOf(run.level, run.difficulty)
    : boardLesson(run.level, run.difficulty);
  if (!level) return 'unknown lesson';
  if (!playedOnThisLesson(run)) return 'played on another version of this lesson';
  if (run.mode !== undefined) return checkChallengeRun(run, run.mode, level);
  // A run from 0.17.0 has no Glowcap count: it was ranked on its whole score, against that
  // version's par, which counted every Glowcap.
  const legacy = run.glowcaps === undefined;
  const glowcaps = run.glowcaps ?? 0;
  const counts = [
    run.score,
    run.treasure,
    run.timeBonus,
    run.workerBonus,
    run.lossPenalty,
    glowcaps,
    run.shards,
    run.shardsTotal,
    run.timeLeft,
    run.alive,
    run.lost,
  ];
  if (!counts.every(isCount)) return 'malformed numbers';
  if (typeof run.time !== 'number' || !Number.isFinite(run.time) || run.time < 0)
    return 'malformed time';
  if (!RANKS.includes(run.rank)) return 'unknown rank';
  if (run.shardsTotal !== shardCount(level)) return 'wrong Sunshard count';
  if (run.shards > run.shardsTotal) return 'more Sunshards than the lesson has';
  if (run.time > level.dayLength + 0.01) return 'longer than the day';
  if (Math.abs(run.time + run.timeLeft - level.dayLength) > 1.01) return 'clock does not add up';
  if (run.alive > WORKER.maxOnField) return 'more Sproutlings than the field holds';
  if (run.treasure > treasureCeiling(level)) return 'more treasure than the lesson holds';
  const cleared = run.shards === run.shardsTotal;
  if (run.timeBonus !== (cleared ? run.timeLeft * POINTS_PER_SECOND : 0)) return 'wrong time bonus';
  if (run.workerBonus !== run.alive * POINTS_PER_WORKER) return 'wrong survivor bonus';
  if (run.lossPenalty !== run.lost * penaltyPerLoss(run.difficulty)) return 'wrong loss penalty';
  const total = Math.max(0, run.treasure + run.timeBonus + run.workerBonus - run.lossPenalty);
  if (run.score !== total) return 'score does not add up';
  const blooms = (level.blooms ?? []).reduce((sum, bloom) => sum + bloom.weight, 0);
  if (glowcaps > run.treasure || glowcaps > blooms * BLOOM_VALUE_PER_WEIGHT) {
    return 'more Glowcaps than the lesson grows';
  }
  const rank = legacy
    ? rankFor(run.score, cleared, legacyPar(level))
    : rankFor(run.score - glowcaps, cleared, level);
  if (run.rank !== rank) return 'wrong rank for the score';
  // Diamond is already well ahead of the test bot; half of it is out of anyone's reach.
  if (cleared && run.time < level.diamondTime * 0.5) return 'faster than possible';
  return null;
}

/** The order runs are ranked in: higher score, then quicker clear, then whoever was first. */
export function compareRuns(a: RunEntry, b: RunEntry): number {
  return b.score - a.score || a.time - b.time || a.at.localeCompare(b.at);
}

/*
 * Run codes. A code is the run as JSON, base64url-encoded, then a dot and an HMAC-SHA256 of
 * that text. The key ships with the game, so this cannot stop a determined cheat who reads
 * the source; what it stops is anyone editing a posted run by hand, and every number is
 * checked by `checkRun` all the same. The board is a public list of GitHub issues, so every
 * entry is tied to the GitHub account that posted it, and the repository owner can strike
 * one off with a `rejected` label.
 */
const KEY_TEXT = 'dandori-academy:leaderboard:v1:the-kiln-remembers';

let keyPromise: Promise<CryptoKey> | null = null;
function key(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(KEY_TEXT),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return keyPromise;
}

async function hmac(text: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await key(), new TextEncoder().encode(text));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

/** Any value as a signed code: base64url JSON, a dot, and its HMAC. */
async function encodeSigned(value: unknown): Promise<string> {
  const body = toBase64Url(JSON.stringify(value));
  return `${body}.${await hmac(body)}`;
}

/** The value in a signed code, or null if the signature does not match. */
async function decodeSigned(code: string): Promise<unknown> {
  const match = /^([A-Za-z0-9_-]+)\.([0-9a-f]{64})$/.exec(code.trim());
  if (!match) return null;
  const [, body, signature] = match;
  if ((await hmac(body)) !== signature) return null;
  try {
    return JSON.parse(fromBase64Url(body)) as unknown;
  } catch {
    return null;
  }
}

function isRun(value: unknown): value is RunEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<RunEntry>;
  return (
    entry.v === 1 &&
    typeof entry.level === 'string' &&
    typeof entry.at === 'string' &&
    (entry.difficulty === 'normal' || entry.difficulty === 'hard')
  );
}

/** A run as a signed code. */
export async function encodeRun(run: RunEntry): Promise<string> {
  return encodeSigned(run);
}

/** The run in a code, if its signature is good and its shape is a run's; otherwise null. */
export async function decodeRun(code: string): Promise<RunEntry | null> {
  const value = await decodeSigned(code);
  return isRun(value) ? value : null;
}

/** A run as posted to the Academy board: who played it, and the run itself. */
export interface BoardPost {
  v: 1;
  /** The player's random id; see `Settings.playerId`. */
  player: string;
  /** The Warden name shown beside the run. */
  name: string;
  run: RunEntry;
  /**
   * The SHA-256 (hex) of the run's replay log, which travels beside the post on the relay: the
   * board replays it to check the run. Missing on posts from before replays (0.38.0).
   */
  log?: string;
}

/** A post as a signed code, the form it travels and is stored in. */
export async function encodePost(post: BoardPost): Promise<string> {
  return encodeSigned(post);
}

/** The post in a code, if its signature is good and its shape is a post's; otherwise null. */
export async function decodePost(code: string): Promise<BoardPost | null> {
  const value = await decodeSigned(code);
  if (typeof value !== 'object' || value === null) return null;
  const post = value as Partial<BoardPost>;
  if (post.v !== 1 || typeof post.player !== 'string' || !/^[0-9a-f]{16}$/.test(post.player)) {
    return null;
  }
  if (typeof post.name !== 'string' || post.name.length === 0 || post.name.length > 20) return null;
  if (post.log !== undefined && (typeof post.log !== 'string' || !/^[0-9a-f]{64}$/.test(post.log)))
    return null;
  return isRun(post.run) ? (post as BoardPost) : null;
}

/** A finished challenge day as a run for the board. */
export function makeChallengeRun(
  day: {
    levelId: string;
    difficulty: Difficulty;
    mode: ChallengeId;
    facts: ChallengeFacts;
    score: ChallengeScore;
    elapsed: number;
    coop?: boolean;
  },
  game: string,
  at: Date,
): RunEntry | null {
  const print = lessonPrint(day.levelId, day.difficulty);
  if (!print) return null;
  const { facts } = day;
  return {
    v: 1,
    game,
    level: day.levelId,
    difficulty: day.difficulty,
    print,
    mode: day.mode,
    score: day.score.total,
    rank: day.score.rank,
    treasure: facts.treasureValue,
    timeBonus: 0,
    workerBonus: 0,
    lossPenalty: 0,
    shards: facts.shardsHome,
    shardsTotal: facts.shardsTotal,
    time: Math.round(day.elapsed * 100) / 100,
    timeLeft: Math.max(0, Math.ceil(facts.timeLeft)),
    alive: facts.alive,
    lost: facts.lost,
    glowcaps: facts.glowcapValue,
    weight: facts.weight,
    glowcapWeight: facts.glowcapWeight,
    carcassWeight: facts.carcassWeight,
    beastsLeft: facts.beastsLeft,
    everything: facts.everything,
    survived: facts.survived,
    at: at.toISOString(),
    ...(day.coop ? { coop: true } : {}),
  };
}

/** Most weight a lesson can send home in a day: every Sunshard, Glowcap and carcass, twice over. */
function weightCeiling(level: LevelDefinition): number {
  const blooms = (level.blooms ?? []).reduce((sum, bloom) => sum + bloom.weight, 0);
  return (shardWeight(level) + carcassWeight(level) + blooms) * 2;
}

/**
 * Why a challenge run cannot be right, or null if it adds up: its score is worked out again by
 * the challenge's own rule from what it says it did, and what it says it did must fit the lesson.
 */
function checkChallengeRun(
  run: RunEntry,
  mode: ChallengeId,
  level: LevelDefinition,
): string | null {
  if (!(CHALLENGE_IDS as readonly string[]).includes(mode)) return 'unknown challenge';
  if (!challengeOpen(mode, level)) return 'no such challenge on this lesson';
  const counts = [
    run.score,
    run.treasure,
    run.shards,
    run.shardsTotal,
    run.timeLeft,
    run.alive,
    run.lost,
    run.weight,
    run.carcassWeight,
    run.beastsLeft,
    run.glowcaps,
    run.glowcapWeight,
  ];
  if (!counts.every(isCount)) return 'malformed numbers';
  if (typeof run.everything !== 'boolean' || typeof run.survived !== 'boolean') {
    return 'malformed flags';
  }
  if (typeof run.time !== 'number' || !Number.isFinite(run.time) || run.time < 0) {
    return 'malformed time';
  }
  if (!RANKS.includes(run.rank)) return 'unknown rank';
  if (run.shardsTotal !== shardCount(level)) return 'wrong Sunshard count';
  if (run.shards > run.shardsTotal) return 'more Sunshards than the lesson has';
  // A field with no clock has no day to run over, and never any time left.
  if (level.untimed) {
    if (run.timeLeft !== 0) return 'time left on a day with no clock';
  } else {
    if (run.time > level.dayLength + 0.01) return 'longer than the day';
    if (Math.abs(run.time + run.timeLeft - level.dayLength) > 1.01) return 'clock does not add up';
  }
  if (run.alive > WORKER.maxOnField) return 'more Sproutlings than the field holds';
  if (mode === 'trial' && level.untimed && run.alive + run.lost > level.startingWorkers) {
    return 'more Sproutlings than the Trial starts with';
  }
  if (run.treasure > treasureCeiling(level)) return 'more treasure than the lesson holds';
  const weight = run.weight ?? 0;
  if (weight > weightCeiling(level) || (run.carcassWeight ?? 0) > weight) {
    return 'more weight than the lesson holds';
  }
  if (run.everything && (run.shards !== run.shardsTotal || run.beastsLeft !== 0)) {
    return 'claims everything collected without it';
  }
  if (mode === 'growing' && run.alive > sproutlingsPossible(level) * 2)
    return 'too many Sproutlings';
  const blooms = (level.blooms ?? []).reduce((sum, bloom) => sum + bloom.weight, 0);
  if ((run.glowcapWeight ?? 0) > blooms * 2 || (run.glowcaps ?? 0) > run.treasure) {
    return 'more Glowcaps than the lesson grows';
  }
  const scored = scoreChallenge(mode, level, {
    treasureValue: run.treasure,
    glowcapValue: run.glowcaps ?? 0,
    glowcapWeight: run.glowcapWeight ?? 0,
    weight,
    carcassWeight: run.carcassWeight ?? 0,
    shardsHome: run.shards,
    shardsTotal: run.shardsTotal,
    beastsLeft: run.beastsLeft ?? 0,
    everything: run.everything,
    alive: run.alive,
    lost: run.lost,
    timeLeft: run.timeLeft,
    survived: run.survived,
  });
  if (run.score !== scored.total) return 'score does not add up';
  if (run.rank !== scored.rank) return 'wrong rank for the score';
  const fastest = mode === 'growing' ? 0 : level.diamondTime * 0.5;
  if (run.everything && run.time < fastest) return 'faster than possible';
  return null;
}
