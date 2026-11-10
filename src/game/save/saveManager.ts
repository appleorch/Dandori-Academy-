import { rankValue, RANKS, type Rank } from '../dandori/scoring';

export const SAVE_VERSION = '1';
const STORAGE_KEY = 'dandori-academy-save';

/**
 * Persistent progress. Field layout follows the project handoff document, with
 * `workerCounts` in place of its `pikminCounts`.
 */
export interface SaveData {
  version: string;
  /** Highest stage reached. */
  stage: number;
  /** Best total score across all days. */
  score: number;
  /** Most workers alive at the end of a day, per worker type. */
  workerCounts: Record<string, number>;
  /** Ids of every treasure ever delivered, prefixed with the level id. */
  treasuresCollected: string[];
  /** Best rank per level id. */
  bestRanks: Record<string, string>;
}

export interface DayRecord {
  levelId: string;
  stage: number;
  score: number;
  rank: Rank;
  workersAlive: number;
  treasureIds: readonly string[];
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
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSaveData(value: unknown): value is SaveData {
  return (
    isRecord(value) &&
    value.version === SAVE_VERSION &&
    typeof value.stage === 'number' &&
    typeof value.score === 'number' &&
    isRecord(value.workerCounts) &&
    Object.values(value.workerCounts).every((count) => typeof count === 'number') &&
    Array.isArray(value.treasuresCollected) &&
    value.treasuresCollected.every((id) => typeof id === 'string') &&
    isRecord(value.bestRanks) &&
    Object.values(value.bestRanks).every((rank) => typeof rank === 'string')
  );
}

/** Reads the save, falling back to a fresh one if it is missing, corrupt or from another version. */
export function loadSave(storage: SaveStorage): SaveData {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return emptySave();
    const parsed: unknown = JSON.parse(raw);
    return isSaveData(parsed) ? parsed : emptySave();
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

/** Returns a new save with a finished day merged in. Bests only ever improve. */
export function recordDay(save: SaveData, day: DayRecord): SaveData {
  const previous = save.bestRanks[day.levelId];
  const previousValue = RANKS.includes(previous as Rank) ? rankValue(previous as Rank) : -1;
  const ids = day.treasureIds.map((id) => `${day.levelId}:${id}`);
  return {
    version: SAVE_VERSION,
    stage: Math.max(save.stage, day.stage),
    score: Math.max(save.score, day.score),
    workerCounts: {
      ...save.workerCounts,
      ember: Math.max(save.workerCounts.ember ?? 0, day.workersAlive),
    },
    treasuresCollected: [...new Set([...save.treasuresCollected, ...ids])],
    bestRanks: {
      ...save.bestRanks,
      [day.levelId]: rankValue(day.rank) > previousValue ? day.rank : previous,
    },
  };
}
