import { describe, expect, it } from 'vitest';
import { generateField, seeded, dayFor } from './generator';
import { ESCORT_FIELDS } from './levels/challenges/escort';
import { dailyId, dailyKey, dailySeed, isDaily } from './daily';

describe('the field generator', () => {
  it('makes the same field from the same seed, and different fields from others', () => {
    expect(generateField(42, 'hunt', 'a')).toEqual(generateField(42, 'hunt', 'a'));
    expect(generateField(42, 'hunt', 'a')).not.toEqual(generateField(43, 'hunt', 'a'));
    const random = seeded(1);
    const values = Array.from({ length: 1000 }, random);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it('keeps everything inside the field and clear of everything else, over many seeds', () => {
    for (let seed = 0; seed < 300; seed++) {
      for (const template of ['hunt', 'escort'] as const) {
        const field = generateField(seed, template, 'x');
        const inside = (x: number, z: number) =>
          Math.abs(x) < field.width / 2 && Math.abs(z) < field.depth / 2;
        for (const item of [...field.treasures, ...field.pods, ...field.enemies]) {
          expect(inside(item.x, item.z), `${template} ${seed}`).toBe(true);
          for (const wall of field.obstacles) {
            const clear =
              Math.abs(item.x - wall.x) > wall.w / 2 || Math.abs(item.z - wall.z) > wall.d / 2;
            expect(clear, `${template} ${seed}: ${JSON.stringify(item)} in a wall`).toBe(true);
          }
        }
        expect(field.treasures.length).toBeGreaterThan(0);
        if (template === 'escort') {
          expect(field.treasures).toHaveLength(1);
          expect(field.treasures[0].variant).toBe('lodestone');
          expect(field.ambushes?.length ?? 0).toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives a day half as long again as the pace', () => {
    expect(dayFor(100)).toBe(160);
    expect(dayFor(20)).toBe(60);
  });
});

describe('the daily challenge and the Escort fields', () => {
  it('names each day by its UTC date, with a seed of its own', () => {
    const key = dailyKey(new Date('2026-11-25T23:30:00Z'));
    expect(key).toBe('2026-11-25');
    expect(isDaily(dailyId(key))).toBe(true);
    expect(isDaily('hunt-scattered-light')).toBe(false);
    expect(dailySeed('2026-11-25')).not.toBe(dailySeed('2026-11-26'));
  });

  it('has twelve Escort fields, each with its own name, easiest first', () => {
    expect(ESCORT_FIELDS).toHaveLength(12);
    expect(new Set(ESCORT_FIELDS.map((f) => f.name)).size).toBe(12);
    const paces = ESCORT_FIELDS.map((f) => f.challenge?.pace ?? 0);
    expect([...paces].sort((a, b) => a - b)).toEqual(paces);
  });
});
