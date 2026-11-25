import { MODES } from '../modes/modes';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { dayFor, generateField, TEMPLATE_RULE, type FieldTemplate } from './generator';
import { challengeFields } from './levels/challenges/field';
import { defineLevel, levelById, registerLevel, type LevelDefinition } from './level';
import { playGreedy } from './testBot';

/**
 * Generated fields, checked: the test player plays each one through before it is offered, and
 * its time there becomes the field's pace (and so its medals and its day). A field the test
 * player cannot finish within ten minutes is thrown away and the next seed tried.
 *
 * The daily challenge is a Treasure Hunt field made from the day's date (UTC), so every player
 * gets the same field, and the board a board of its own for it.
 */

/** A field from a seed, played through by the test player: its spec with its pace, or null. */
export function measureField(seed: number, template: FieldTemplate, id: string) {
  const rule = TEMPLATE_RULE[template];
  const field = generateField(seed, template, id);
  const [spec] = challengeFields(rule, [{ ...field, pace: 0 }]);
  const level = defineLevel(spec);
  const sim = new Simulation(level, {
    endsWhen: MODES[rule].endsWhen,
    growth: MODES[rule].growth,
  });
  try {
    playGreedy(sim);
    const cleared =
      sim.stats.treasuresCollected.length === sim.stats.treasuresTotal && sim.ended !== 'timeUp';
    if (!cleared) return null;
    const pace = Math.ceil(sim.elapsed);
    return { ...field, pace, dayLength: dayFor(pace) };
  } finally {
    sim.dispose();
  }
}

/** The first seed from `seed` on (a thousand apart) whose field the test player finishes. */
export function checkedField(seed: number, template: FieldTemplate, id: string, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const field = measureField(seed + i * 1000, template, id);
    if (field) return field;
  }
  return null;
}

/** Today's key, by the UTC date: the same for everyone, wherever they are. */
export function dailyKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The daily field's id for a day: a Treasure Hunt field, so on the Treasure Hunt rule. */
export function dailyId(key: string): string {
  return `hunt-daily-${key}`;
}

export function isDaily(levelId: string): boolean {
  return /^hunt-daily-\d{4}-\d{2}-\d{2}$/.test(levelId);
}

/** A day's seed: its date, hashed. */
export function dailySeed(key: string): number {
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % 1_000_000;
}

/** A day's field, made and checked (and kept, so it is only made once per visit). */
export async function ensureDaily(key: string): Promise<LevelDefinition | null> {
  const id = dailyId(key);
  const known = levelById(id);
  if (known) return known;
  await initPhysics();
  const field = checkedField(dailySeed(key), 'hunt', `daily-${key}`);
  if (!field) return null;
  const [spec] = challengeFields('hunt', [field]);
  const level = defineLevel({ ...spec, name: `Daily: ${field.name}` });
  registerLevel(level);
  return level;
}
