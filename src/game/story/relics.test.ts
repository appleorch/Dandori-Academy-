import { beforeAll, describe, expect, it } from 'vitest';
import { RANKS } from '../dandori/scoring';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS } from '../world/level';
import { evaluation, Headmaster } from './headmaster';
import { recoveredRelics, relicFor, relicLocations, RELICS } from './relics';

beforeAll(async () => {
  await initPhysics();
});

describe('the Relics of Harmony', () => {
  it('have unique ids, names and a line of description each', () => {
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(RELICS.length);
    expect(new Set(RELICS.map((r) => r.name)).size).toBe(RELICS.length);
    for (const relic of RELICS) expect(relic.description.length).toBeGreaterThan(20);
  });

  it('give every treasure in every lesson a relic of the right kind', () => {
    for (const level of LEVELS) {
      for (const treasure of level.treasures) {
        const relic = relicFor(level.id, treasure.id, treasure.variant);
        if (treasure.variant === 'dewglass')
          expect(['glass', 'porcelain']).toContain(relic.material);
        else if (treasure.variant === 'lodestone') expect(relic.material).toBe('iron');
        else expect(['glass', 'porcelain', 'iron']).not.toContain(relic.material);
      }
    }
  });

  it('can all be found somewhere, and always in the same place', () => {
    for (const relic of RELICS) expect(relicLocations(relic.id).length).toBeGreaterThan(0);
    const level = LEVELS[0];
    const id = level.treasures[0].id;
    expect(relicFor(level.id, id).id).toBe(relicFor(level.id, id).id);
  });

  it('are counted as recovered from the save’s delivered treasures', () => {
    const level = LEVELS[0];
    const keys = level.treasures.map((t) => `${level.id}:${t.id}`);
    const found = recoveredRelics(keys);
    expect(found.size).toBeGreaterThan(0);
    expect(found.size).toBeLessThanOrEqual(keys.length);
    expect(recoveredRelics(['nonsense']).size).toBe(0);
  });
});

describe('the Headmaster', () => {
  it('opens every day with a line, and the examinations with their own', () => {
    const exam = LEVELS.find((l) => l.id === 'the-long-drop') ?? LEVELS[0];
    const sim = new Simulation(exam);
    const line = new Headmaster(sim).update(0.1);
    expect(line?.text).toContain('Long Drop');
    sim.dispose();
  });

  it('cheers a chain, and keeps quiet between remarks', () => {
    const sim = new Simulation(LEVELS[0]);
    const headmaster = new Headmaster(sim);
    headmaster.update(0.1);
    headmaster.events([{ type: 'chain', x: 0, z: 0, amount: 3 }]);
    expect(headmaster.update(1)).toBeNull();
    const line = headmaster.update(10);
    expect(line?.mood).toBe('cheer');
    expect(headmaster.update(10)).toBeNull();
    sim.dispose();
  });

  it('sounds the alarm when Emberlings are lost in a rush', () => {
    const sim = new Simulation(LEVELS[0]);
    const headmaster = new Headmaster(sim);
    headmaster.update(0.1);
    headmaster.events(
      [0, 1, 2].map(() => ({ type: 'workerLost' as const, x: 0, z: 0, amount: 0 })),
    );
    const line = headmaster.update(4);
    expect(line?.mood).toBe('alarm');
    sim.dispose();
  });

  it('has a verdict for every rank', () => {
    for (const rank of RANKS) expect(evaluation(rank, 'many-hands').length).toBeGreaterThan(10);
  });
});
