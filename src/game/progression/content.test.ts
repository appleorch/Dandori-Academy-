import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './achievements';
import { OUTFITS } from './outfits';
import { emptySave } from '../save/saveManager';
import { allRelics, relicFor } from '../story/relics';
import { RELIC_SETS, SET_RELICS, setsField } from '../story/relicSets';
import { ESCORT_FIELDS } from '../world/levels/challenges/escort';

describe('the collection', () => {
  it('has 150 relics, each its own, eight sets of eight', () => {
    const relics = allRelics();
    expect(relics).toHaveLength(150);
    expect(new Set(relics.map((r) => r.id)).size).toBe(150);
    expect(RELIC_SETS).toHaveLength(8);
    for (const relicSet of RELIC_SETS) expect(relicSet.relics).toHaveLength(8);
  });

  it('finds set relics in the Escort fields and the daily fields, and nowhere else', () => {
    const escort = ESCORT_FIELDS[0];
    expect(setsField(escort.id)).toBe(true);
    expect(SET_RELICS).toContainEqual(relicFor(escort.id, escort.treasures[0].id));
    expect(SET_RELICS).toContainEqual(relicFor('hunt-daily-2026-11-25', 'shard-3'));
    expect(SET_RELICS).not.toContainEqual(relicFor('many-hands', 'shard-1'));
  });

  it('a completed set earns its outfit', () => {
    const relicSet = RELIC_SETS[0];
    const outfit = OUTFITS.find((o) => o.id === `set-${relicSet.id}`);
    expect(outfit?.unlocked(emptySave())).toBe(false);
    // Find the treasure on daily fields that turn into each of the set's relics.
    const keys: string[] = [];
    for (let day = 1; day <= 28 && keys.length < 8; day++) {
      for (let shard = 1; shard <= 14; shard++) {
        const level = `hunt-daily-2026-01-${String(day).padStart(2, '0')}`;
        const relic = relicFor(level, `shard-${shard}`);
        const index = relicSet.relics.indexOf(relic);
        if (
          index >= 0 &&
          !keys.some((k) => relicFor(...(k.split(':') as [string, string])) === relic)
        )
          keys.push(`${level}:shard-${shard}`);
      }
    }
    expect(keys).toHaveLength(8);
    expect(outfit?.unlocked({ ...emptySave(), treasuresCollected: keys })).toBe(true);
  });
});

describe('outfits and achievements', () => {
  it('has twenty more outfits, each its own, many with a new shape', () => {
    expect(new Set(OUTFITS.map((o) => o.id)).size).toBe(OUTFITS.length);
    expect(OUTFITS.length).toBeGreaterThanOrEqual(33);
    expect(OUTFITS.filter((o) => o.hatStyle && o.hatStyle !== 'brim').length).toBeGreaterThan(12);
  });

  it('has forty more achievements, some secret, none repeated', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('daily-30');
    expect(ids).toContain('escort-12');
    expect(ids).toContain('set-tea');
    expect(ACHIEVEMENTS.filter((a) => a.secret).length).toBeGreaterThan(4);
    // Nothing is earned by an empty save.
    for (const achievement of ACHIEVEMENTS)
      expect(achievement.earned(emptySave(), null)).toBe(false);
  });
});
