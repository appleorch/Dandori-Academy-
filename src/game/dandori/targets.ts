import { rankedBonusTotal, treasureTotal, type LevelDefinition } from '../world/level';
import { POINTS_PER_SECOND, POINTS_PER_WORKER, rankScore, type Rank } from './scoring';

/** The ranks with a target worth showing: Copper and Bronze need next to nothing. */
export const TARGET_RANKS = ['Silver', 'Gold', 'Platinum', 'Diamond'] as const satisfies Rank[];

export interface RankTarget {
  rank: Rank;
  /** Lowest total score that earns the rank. */
  score: number;
  /**
   * Seconds that must still be on the clock when the last Sunshard arrives, if every twin pair
   * came home on time and every Dewglass whole, the starting squad is all alive and nobody was
   * lost. Glowcaps never count towards a rank. Null when collecting every
   * Sunshard is enough at any time.
   */
  timeLeft: number | null;
}

/** What it takes to earn Silver, Gold, Platinum and Diamond on a lesson. */
export function rankTargets(level: LevelDefinition): RankTarget[] {
  const base =
    treasureTotal(level) + rankedBonusTotal(level) + level.startingWorkers * POINTS_PER_WORKER;
  return TARGET_RANKS.map((rank) => {
    const score = rankScore(rank, level);
    const missing = score - base;
    return { rank, score, timeLeft: missing > 0 ? Math.ceil(missing / POINTS_PER_SECOND) : null };
  });
}
