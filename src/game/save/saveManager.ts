import type { Difficulty } from '../core/difficulty';
import { rankValue, RANKS, type Rank } from '../dandori/scoring';

export const SAVE_VERSION = '1';
const STORAGE_KEY = 'dandori-academy-save';

/** Lowest rank that unlocks the next lesson. */
export const UNLOCK_RANK: Rank = 'Silver';

/** Running totals across every day ever played. */
export interface SaveTotals {
  days: number;
  treasures: number;
  enemies: number;
  workersLost: number;
}

/**
 * Persistent progress. Field layout follows the project handoff document, with
 * `workerCounts` in place of its `pikminCounts`, plus `bestScores`, Hard-mode bests,
 * `achievements` and `totals`. Saves written before those fields existed still load.
 */
export interface SaveData {
  version: string;
  /** Highest lesson unlocked (1-based). */
  stage: number;
  /** Academy total: the sum of the best score on every lesson. */
  score: number;
  /** Most workers alive at the end of a day, per worker type. */
  workerCounts: Record<string, number>;
  /** Ids of every treasure ever delivered, prefixed with the level id. */
  treasuresCollected: string[];
  /** Best rank per level id. */
  bestRanks: Record<string, string>;
  /** Best score per level id. */
  bestScores: Record<string, number>;
  /** Best rank and score per level id on Hard. */
  bestRanksHard: Record<string, string>;
  bestScoresHard: Record<string, number>;
  /** Unlocked achievement ids, each with the ISO time it was earned. */
  achievements: Record<string, string>;
  totals: SaveTotals;
  /** Ids of side lessons whose way down has been found. */
  discovered: string[];
  /**
   * Splits of the fastest clear per lesson and difficulty (key `id` or `id:hard`): the time
   * each Sunshard arrived. The last entry is the clear time.
   */
  bestSplits: Record<string, number[]>;
}

export interface DayRecord {
  levelId: string;
  difficulty: Difficulty;
  stage: number;
  score: number;
  rank: Rank;
  workersAlive: number;
  workersLost: number;
  treasureIds: readonly string[];
  treasuresTotal: number;
  enemiesDefeated: number;
  enemiesTotal: number;
  /** Hits the Warden took during the day. */
  captainHits: number;
  timeLeft: number;
  dayLength: number;
  /** Kinds of boss beaten during the day. */
  bossesDefeated: readonly string[];
  bloomsCollected: number;
  /** Arrival time of each Sunshard, when every one came home; otherwise empty. */
  splits?: readonly number[];
  /** Relics found elsewhere on the day (in a cave gone down into), already keyed `levelId:id`. */
  extraTreasures?: readonly string[];
}

/** The subset of the Web Storage API the save manager needs. */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function emptySave(): SaveData {
  return {
    version: SAVE_VERSION,
    stage: 1,
    score: 0,
    workerCounts: {},
    treasuresCollected: [],
    bestRanks: {},
    bestScores: {},
    bestRanksHard: {},
    bestScoresHard: {},
    achievements: {},
    totals: { days: 0, treasures: 0, enemies: 0, workersLost: 0 },
    discovered: [],
    bestSplits: {},
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'number');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function parseTotals(value: unknown): SaveTotals {
  const totals = emptySave().totals;
  if (!isRecord(value)) return totals;
  for (const key of Object.keys(totals) as (keyof SaveTotals)[]) {
    const entry = value[key];
    if (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0) totals[key] = entry;
  }
  return totals;
}

function parseSplits(value: unknown): Record<string, number[]> {
  if (!isRecord(value)) return {};
  const splits: Record<string, number[]> = {};
  for (const [key, times] of Object.entries(value)) {
    if (
      Array.isArray(times) &&
      times.length > 0 &&
      times.every((t) => typeof t === 'number' && Number.isFinite(t))
    ) {
      splits[key] = times as number[];
    }
  }
  return splits;
}

/** Where a lesson's best splits are kept for a difficulty. */
export function splitKey(levelId: string, difficulty: Difficulty): string {
  return difficulty === 'hard' ? `${levelId}:hard` : levelId;
}

/** The splits record with `splits` kept if they finish faster than the stored ones. */
function fasterSplits(
  record: Record<string, number[]>,
  key: string,
  splits: readonly number[] | undefined,
): Record<string, number[]> {
  if (!splits || splits.length === 0) return record;
  const best = record[key];
  if (best && best.length === splits.length && best[best.length - 1] <= splits[splits.length - 1]) {
    return record;
  }
  return { ...record, [key]: [...splits] };
}

/** Validates parsed JSON and fills in fields added after version 1 first shipped. */
export function parseSave(value: unknown): SaveData | null {
  if (
    !isRecord(value) ||
    value.version !== SAVE_VERSION ||
    typeof value.stage !== 'number' ||
    !Number.isInteger(value.stage) ||
    value.stage < 1 ||
    typeof value.score !== 'number' ||
    !isNumberRecord(value.workerCounts) ||
    !Array.isArray(value.treasuresCollected) ||
    !value.treasuresCollected.every((id) => typeof id === 'string') ||
    !isRecord(value.bestRanks) ||
    !Object.values(value.bestRanks).every((rank) => typeof rank === 'string')
  ) {
    return null;
  }
  return {
    version: SAVE_VERSION,
    stage: value.stage,
    score: value.score,
    workerCounts: value.workerCounts,
    treasuresCollected: value.treasuresCollected as string[],
    bestRanks: value.bestRanks as Record<string, string>,
    bestScores: isNumberRecord(value.bestScores) ? value.bestScores : {},
    bestRanksHard: isStringRecord(value.bestRanksHard) ? value.bestRanksHard : {},
    bestScoresHard: isNumberRecord(value.bestScoresHard) ? value.bestScoresHard : {},
    achievements: isStringRecord(value.achievements) ? value.achievements : {},
    totals: parseTotals(value.totals),
    discovered: Array.isArray(value.discovered)
      ? value.discovered.filter((id): id is string => typeof id === 'string')
      : [],
    bestSplits: parseSplits(value.bestSplits),
  };
}

/** Reads the save, falling back to a fresh one if it is missing, corrupt or from another version. */
export function loadSave(storage: SaveStorage): SaveData {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return emptySave();
    return parseSave(JSON.parse(raw)) ?? emptySave();
  } catch {
    return emptySave();
  }
}

/** Writes the save. Returns false when storage is unavailable or full. */
export function writeSave(storage: SaveStorage, data: SaveData): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Lowest Normal rank that opens a lesson's Hard mode. */
export const HARD_UNLOCK_RANK: Rank = 'Gold';

/** Best rank earned on a level, or null if it has never been finished on that difficulty. */
export function bestRank(
  save: SaveData,
  levelId: string,
  difficulty: Difficulty = 'normal',
): Rank | null {
  const stored = (difficulty === 'hard' ? save.bestRanksHard : save.bestRanks)[levelId];
  return RANKS.find((rank) => rank === stored) ?? null;
}

export function bestScore(
  save: SaveData,
  levelId: string,
  difficulty: Difficulty = 'normal',
): number {
  return (difficulty === 'hard' ? save.bestScoresHard : save.bestScores)[levelId] ?? 0;
}

/** Whether a lesson's Hard mode is open: Gold or better on Normal. */
export function hardUnlocked(save: SaveData, levelId: string): boolean {
  const rank = bestRank(save, levelId);
  return rank !== null && rankValue(rank) >= rankValue(HARD_UNLOCK_RANK);
}

/**
 * Returns a new save with a finished day merged in. Bests only ever improve, and
 * a rank of UNLOCK_RANK or better opens the next lesson.
 */
export function recordDay(save: SaveData, day: DayRecord): SaveData {
  const hard = day.difficulty === 'hard';
  const previous = bestRank(save, day.levelId, day.difficulty);
  const improved = previous === null || rankValue(day.rank) > rankValue(previous);
  const unlocksNext = !hard && rankValue(day.rank) >= rankValue(UNLOCK_RANK);
  const ids = [
    ...day.treasureIds.map((id) => `${day.levelId}:${id}`),
    ...(day.extraTreasures ?? []),
  ];
  const scores = hard ? save.bestScoresHard : save.bestScores;
  const ranks = hard ? save.bestRanksHard : save.bestRanks;
  const nextScores = { ...scores, [day.levelId]: Math.max(scores[day.levelId] ?? 0, day.score) };
  const nextRanks = { ...ranks, [day.levelId]: improved ? day.rank : previous };
  const bestScores = hard ? save.bestScores : nextScores;
  const bestScoresHard = hard ? nextScores : save.bestScoresHard;
  const sum = (record: Record<string, number>): number =>
    Object.values(record).reduce((total, score) => total + score, 0);
  return {
    version: SAVE_VERSION,
    stage: Math.max(save.stage, unlocksNext ? day.stage + 1 : day.stage),
    score: sum(bestScores) + sum(bestScoresHard),
    workerCounts: {
      ...save.workerCounts,
      ember: Math.max(save.workerCounts.ember ?? 0, day.workersAlive),
    },
    treasuresCollected: [...new Set([...save.treasuresCollected, ...ids])],
    bestRanks: hard ? save.bestRanks : nextRanks,
    bestScores,
    bestRanksHard: hard ? nextRanks : save.bestRanksHard,
    bestScoresHard,
    achievements: save.achievements,
    discovered: save.discovered,
    bestSplits: fasterSplits(save.bestSplits, splitKey(day.levelId, day.difficulty), day.splits),
    totals: {
      days: save.totals.days + 1,
      treasures: save.totals.treasures + day.treasureIds.length,
      enemies: save.totals.enemies + day.enemiesDefeated,
      workersLost: save.totals.workersLost + day.workersLost,
    },
  };
}

/** Returns a save in which the side lesson's way down has been found; the same save if it already was. */
export function discover(save: SaveData, levelId: string): SaveData {
  if (save.discovered.includes(levelId)) return save;
  return { ...save, discovered: [...save.discovered, levelId] };
}

/** The fastest clear time on record for a lesson, or null. */
export function bestClearTime(
  save: SaveData,
  levelId: string,
  difficulty: Difficulty,
): number | null {
  const splits = save.bestSplits[splitKey(levelId, difficulty)];
  return splits ? splits[splits.length - 1] : null;
}
