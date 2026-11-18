import { NORMAL_PENALTY_PER_LOSS } from '../core/difficulty';

/** Every rank, worst first. */
export const RANKS = ['Copper', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
export type Rank = (typeof RANKS)[number];

export const POINTS_PER_SECOND = 10;
export const POINTS_PER_WORKER = 5;
/** Share of the par score each rank below Platinum needs. Copper needs nothing. */
const SHARES: Partial<Record<Rank, number>> = { Bronze: 0.35, Silver: 0.55, Gold: 0.75 };
/** Ranks that also need every Sunshard home, whatever the score. */
const NEEDS_CLEAR: readonly Rank[] = ['Platinum', 'Diamond'];

/**
 * What a lesson's ranks are measured against. Par is a Platinum day: every Sunshard home by
 * the Platinum time with nobody lost. Diamond is the same day finished by the Diamond time.
 */
export interface Par {
  parScore: number;
  diamondScore: number;
}

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

/** Lowest total that earns a rank on a lesson. Copper needs nothing. */
export function rankScore(rank: Rank, par: Par): number {
  if (rank === 'Diamond') return par.diamondScore;
  if (rank === 'Platinum') return par.parScore;
  return Math.ceil(par.parScore * (SHARES[rank] ?? 0));
}

/** Whether a rank needs every Sunshard home as well as its score. */
export function needsClear(rank: Rank): boolean {
  return NEEDS_CLEAR.includes(rank);
}

export function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank);
}

/**
 * Scores a finished day. Leftover time only counts when every treasure is home, and
 * Platinum and Diamond need every treasure home, so finishing the whole job quickly is
 * what earns the top ranks.
 */
export function evaluateDay(
  stats: DayStats,
  par: Par,
  lossPenaltyEach: number = NORMAL_PENALTY_PER_LOSS,
): ScoreBreakdown {
  const cleared = stats.treasuresCollected === stats.treasuresTotal;
  const treasure = stats.treasureValue;
  // Rounded up, like the on-screen clock, so "0:30 left" is worth 30 seconds.
  const timeBonus = cleared ? Math.ceil(stats.timeLeft) * POINTS_PER_SECOND : 0;
  const workerBonus = stats.workersAlive * POINTS_PER_WORKER;
  const lossPenalty = stats.workersLost * lossPenaltyEach;
  const total = Math.max(0, treasure + timeBonus + workerBonus - lossPenalty);
  return {
    treasure,
    timeBonus,
    workerBonus,
    lossPenalty,
    total,
    rank: rankFor(total, cleared, par),
  };
}

/** The best rank a total earns, given whether every Sunshard came home. */
export function rankFor(total: number, cleared: boolean, par: Par): Rank {
  let rank: Rank = 'Copper';
  for (const candidate of RANKS) {
    if (total < rankScore(candidate, par)) continue;
    if (needsClear(candidate) && !cleared) continue;
    rank = candidate;
  }
  return rank;
}
