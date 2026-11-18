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
  forDifficulty,
  LEVELS,
  shardCount,
  treasureTotal,
  type LevelDefinition,
} from '../world/level';
import { BLOOM_VALUE_PER_WEIGHT } from '../world/spawn';

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
}

/** Two FNV-1a hashes with different offsets: 16 hex digits, plenty to tell lessons apart. */
export function fingerprint(level: LevelDefinition): string {
  const text = JSON.stringify(level);
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
  const base = LEVELS.find((level) => level.id === levelId);
  return base ? forDifficulty(base, difficulty) : null;
}

const prints = new Map<string, string>();
/** Fingerprint of a lesson as shipped in this build, on a difficulty. */
export function lessonPrint(levelId: string, difficulty: Difficulty): string | null {
  const key = `${levelId}:${difficulty}`;
  const known = prints.get(key);
  if (known) return known;
  const level = lessonOf(levelId, difficulty);
  if (!level) return null;
  const print = fingerprint(level);
  prints.set(key, print);
  return print;
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
  const level = lessonOf(run.level, run.difficulty);
  if (!level) return 'unknown lesson';
  if (run.print !== lessonPrint(run.level, run.difficulty))
    return 'played on another version of this lesson';
  const counts = [
    run.score,
    run.treasure,
    run.timeBonus,
    run.workerBonus,
    run.lossPenalty,
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
  if (run.rank !== rankFor(run.score, cleared, level)) return 'wrong rank for the score';
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

/** A run as a signed code, ready to paste. */
export async function encodeRun(run: RunEntry): Promise<string> {
  const body = toBase64Url(JSON.stringify(run));
  return `${body}.${await hmac(body)}`;
}

/** The run in a code, if its signature is good and its shape is a run's; otherwise null. */
export async function decodeRun(code: string): Promise<RunEntry | null> {
  const match = /^([A-Za-z0-9_-]+)\.([0-9a-f]{64})$/.exec(code.trim());
  if (!match) return null;
  const [, body, signature] = match;
  if ((await hmac(body)) !== signature) return null;
  try {
    const run: unknown = JSON.parse(fromBase64Url(body));
    if (typeof run !== 'object' || run === null || (run as { v?: unknown }).v !== 1) return null;
    const entry = run as RunEntry;
    if (typeof entry.level !== 'string' || typeof entry.at !== 'string') return null;
    if (entry.difficulty !== 'normal' && entry.difficulty !== 'hard') return null;
    return entry;
  } catch {
    return null;
  }
}
