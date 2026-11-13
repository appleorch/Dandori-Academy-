import { treasureTotal, type LevelDefinition } from '../world/level';
import { POINTS_PER_SECOND, POINTS_PER_WORKER, rankScore, type Rank } from './scoring';

export interface RankTarget {
  rank: Rank;
  /** Lowest total score that earns the rank. */
  score: number;
  /**
   * Seconds that must still be on the clock when the last Sunshard arrives, if the
   * starting squad is all alive and nobody was lost. Null when collecting every
   * Sunshard is enough at any time.
   */
  timeLeft: number | null;
}

/** What it takes to earn Silver, Gold and Platinum on a lesson. */
export function rankTargets(level: LevelDefinition): RankTarget[] {
  const base = treasureTotal(level) + level.startingWorkers * POINTS_PER_WORKER;
  return (['Silver', 'Gold', 'Platinum'] as const).map((rank) => {
    const score = rankScore(rank, level.parScore);
    const missing = score - base;
    return { rank, score, timeLeft: missing > 0 ? Math.ceil(missing / POINTS_PER_SECOND) : null };
  });
}
