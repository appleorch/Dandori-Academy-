export const RANKS = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;
export type Rank = (typeof RANKS)[number];

const POINTS_PER_SECOND = 10;
const POINTS_PER_WORKER = 5;
const PENALTY_PER_LOSS = 10;
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
  const timeBonus = cleared ? Math.floor(stats.timeLeft) * POINTS_PER_SECOND : 0;
  const workerBonus = stats.workersAlive * POINTS_PER_WORKER;
  const lossPenalty = stats.workersLost * PENALTY_PER_LOSS;
  const total = Math.max(0, treasure + timeBonus + workerBonus - lossPenalty);
  const ratio = total / parScore;
  const rank = THRESHOLDS.find(([, needed]) => ratio >= needed)?.[0] ?? 'Bronze';
  return { treasure, timeBonus, workerBonus, lossPenalty, total, rank };
}
