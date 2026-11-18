import {
  BLOOM_VALUE_PER_WEIGHT,
  DEWGLASS_BONUS_PER_WEIGHT,
  SHARD_VALUE_PER_WEIGHT,
  TWIN,
} from '../core/config';
import { HARD, type Difficulty } from '../core/difficulty';
import { POINTS_PER_SECOND, POINTS_PER_WORKER } from '../dandori/scoring';
import type { LevelDefinition, LevelSpec, LevelTheme } from './levelTypes';
import { CURRICULUM } from './levels/curriculum';
import { DEPTHS } from './levels/depths';
import { FIELD_WORK } from './levels/fieldWork';
import { KINDLING } from './levels/kindling';
import { LONG_ROAD } from './levels/longRoad';
import { WILD_MARCHES } from './levels/wildMarches';

export type * from './levelTypes';

/** The setting each stretch of the academy is taught in. */
function themeOf(stage: number): LevelTheme {
  if (stage <= 5) return 'meadow';
  if (stage <= 10) return 'autumn';
  if (stage <= 16) return 'marsh';
  return 'dusk';
}

/** Total value of every Sunshard in a lesson. */
export function treasureTotal(
  level: Pick<LevelDefinition, 'treasures' | 'enemies' | 'roots'>,
): number {
  const weights =
    level.treasures.reduce((sum, t) => sum + t.weight, 0) +
    level.enemies.reduce((sum, enemy) => sum + (enemy.drop ?? 0), 0) +
    (level.roots ?? []).reduce((sum, root) => sum + root.drop, 0);
  return weights * SHARD_VALUE_PER_WEIGHT;
}

/**
 * Most bonus score a lesson offers on top of its Sunshards' value: every Glowcap, every
 * Dewglass brought home whole, and every twin pair delivered on time.
 */
export function bonusTotal(level: Pick<LevelDefinition, 'treasures' | 'blooms'>): number {
  const blooms = (level.blooms ?? []).reduce((sum, bloom) => sum + bloom.weight, 0);
  const valueOf = (shard: LevelDefinition['treasures'][number]) =>
    shard.weight *
    (SHARD_VALUE_PER_WEIGHT + (shard.variant === 'dewglass' ? DEWGLASS_BONUS_PER_WEIGHT : 0));
  let bonus = blooms * BLOOM_VALUE_PER_WEIGHT;
  const pairs = new Map<string, number[]>();
  for (const shard of level.treasures) {
    if (shard.variant === 'dewglass') bonus += shard.weight * DEWGLASS_BONUS_PER_WEIGHT;
    if (shard.twin) pairs.set(shard.twin, [...(pairs.get(shard.twin) ?? []), valueOf(shard)]);
  }
  for (const values of pairs.values()) {
    if (values.length === 2) bonus += Math.round((values[0] + values[1]) * TWIN.bonus);
  }
  return bonus;
}

/** Number of Sunshards in a lesson, counting those that bosses drop. */
export function shardCount(
  level: Pick<LevelDefinition, 'treasures' | 'enemies' | 'roots'>,
): number {
  return (
    level.treasures.length +
    level.enemies.filter((enemy) => (enemy.drop ?? 0) > 0).length +
    (level.roots ?? []).length
  );
}

/** Diamond asks for a clear in this share of the Platinum time. */
export const DIAMOND_SHARE = 0.85;

/**
 * Par is exactly the score of a Platinum-pace day: every Sunshard home at `platinumTime`
 * with every bonus taken (Glowcaps, twins on time, Dewglass whole), the starting squad alive
 * and nobody lost. Diamond is the same day with every Sunshard home by `diamondTime`. The
 * bonuses are in par so that taking them never stands in for pace.
 */
function withPar(spec: LevelSpec, difficulty: Difficulty = 'normal'): LevelDefinition {
  const base = treasureTotal(spec) + bonusTotal(spec) + spec.startingWorkers * POINTS_PER_WORKER;
  const diamondTime = Math.floor(spec.platinumTime * DIAMOND_SHARE);
  return {
    ...spec,
    theme: spec.theme ?? themeOf(spec.stage),
    difficulty,
    parScore: base + (spec.dayLength - spec.platinumTime) * POINTS_PER_SECOND,
    diamondTime,
    diamondScore: base + (spec.dayLength - diamondTime) * POINTS_PER_SECOND,
  };
}

/** The academy's lessons in play order, then the side lessons found by going down. */
export const LEVELS: readonly LevelDefinition[] = [
  ...KINDLING,
  ...FIELD_WORK,
  ...WILD_MARCHES,
  ...LONG_ROAD,
  ...DEPTHS.filter((spec) => !spec.side),
  ...CURRICULUM,
  ...DEPTHS.filter((spec) => spec.side),
].map((spec) => withPar(spec));

/** A lesson as played on the given difficulty: Hard has a shorter day and its own par. */
export function forDifficulty(level: LevelDefinition, difficulty: Difficulty): LevelDefinition {
  if (difficulty === level.difficulty) return level;
  // The Normal day length: the lesson's own, or the stock lesson's when converting back from Hard.
  const normalDay =
    level.difficulty === 'normal'
      ? level.dayLength
      : (LEVELS.find((candidate) => candidate.id === level.id)?.dayLength ?? level.dayLength);
  const dayLength = difficulty === 'hard' ? Math.round(normalDay * HARD.dayLength) : normalDay;
  // withPar replaces the par and difficulty.
  return withPar({ ...level, dayLength }, difficulty);
}

/** The numbered run, without the side lessons. */
export const MAIN_LEVELS: readonly LevelDefinition[] = LEVELS.filter((level) => !level.side);

/** The lesson that holds the way down to a side lesson. */
export function entranceTo(levelId: string): LevelDefinition | undefined {
  return LEVELS.find((level) => level.descent?.to === levelId);
}
