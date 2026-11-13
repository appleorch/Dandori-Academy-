export const RANKS = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;
export type Rank = (typeof RANKS)[number];

export const POINTS_PER_SECOND = 10;
export const POINTS_PER_WORKER = 5;
export const PENALTY_PER_LOSS = 10;
/** Fraction of the par score needed for each rank, best first. */
const THRESHOLDS: readonly (readonly [Rank, number])[] = [
  ['Platinum', 1],
  ['Gold', 0.8],
  ['Silver', 0.55],
];

export interface DayStats {
  treasureValue: number;
  treasuresCollected: number;
  treasuresTotal: number;
  timeLeft: number;
  workersAlive: number;
  workersLost: number;
}

export interface ScoreBreakdown {
  treasure: number;
  timeBonus: number;
  workerBonus: number;
  lossPenalty: number;
  total: number;
  rank: Rank;
}

/** Lowest total that earns a rank on a lesson with the given par. Bronze needs nothing. */
export function rankScore(rank: Rank, parScore: number): number {
  const ratio = THRESHOLDS.find(([candidate]) => candidate === rank)?.[1] ?? 0;
  return Math.ceil(parScore * ratio);
}

export function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank);
}

/**
 * Scores a finished day. Leftover time only counts when every treasure is home,
 * so finishing the whole job quickly is what earns the top ranks.
 */
export function evaluateDay(stats: DayStats, parScore: number): ScoreBreakdown {
  const cleared = stats.treasuresCollected === stats.treasuresTotal;
  const treasure = stats.treasureValue;
  // Rounded up, like the on-screen clock, so "0:30 left" is worth 30 seconds.
  const timeBonus = cleared ? Math.ceil(stats.timeLeft) * POINTS_PER_SECOND : 0;
  const workerBonus = stats.workersAlive * POINTS_PER_WORKER;
  const lossPenalty = stats.workersLost * PENALTY_PER_LOSS;
  const total = Math.max(0, treasure + timeBonus + workerBonus - lossPenalty);
  const rank =
    THRESHOLDS.find(([candidate]) => total >= rankScore(candidate, parScore))?.[0] ?? 'Bronze';
  return { treasure, timeBonus, workerBonus, lossPenalty, total, rank };
}
