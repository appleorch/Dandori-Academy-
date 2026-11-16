export const DIFFICULTIES = ['normal', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * Hard mode. Each lesson's Hard mode opens once Normal is cleared at Gold, and keeps
 * its own best rank and score. The Platinum finish time stays the same; the day is
 * shorter, so there is less slack, and everything on the field hits harder.
 */
export const HARD = {
  /** Multiplier on every creature's health (gates keep the lesson's own). */
  enemyHp: 1.25,
  /** Multiplier on attack telegraphs: less time to react. */
  windup: 0.85,
  captainHp: 2,
  /** Drips flatten up to this many workers instead of only knocking them down. */
  dripKills: 3,
  penaltyPerLoss: 20,
  dayLength: 0.9,
} as const;

export const NORMAL_PENALTY_PER_LOSS = 10;

export function penaltyPerLoss(difficulty: Difficulty): number {
  return difficulty === 'hard' ? HARD.penaltyPerLoss : NORMAL_PENALTY_PER_LOSS;
}
