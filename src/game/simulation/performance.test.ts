import { beforeAll, describe, expect, it } from 'vitest';
import { dayField, newCampaign } from '../campaign/campaign';
import { NO_INPUT } from '../commands/input';
import { WORKER } from '../core/config';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';

/**
 * Generous budget for ten seconds of the biggest field with a full squad. A normal machine
 * takes a fraction of it; it is there to catch something becoming many times slower, not noise.
 */
const BUDGET_MS = 4000;
const STEPS = 600;

beforeAll(async () => {
  await initPhysics();
});

describe('simulation performance', () => {
  it('runs ten seconds of the Wild Quad with a full field of Sproutlings well within budget', () => {
    const state = { ...newCampaign(), stock: { ember: 40, dew: 20, stone: 20, spark: 20 } };
    const { level } = dayField(state);
    expect(level.startingWorkers).toBe(WORKER.maxOnField);
    const sim = new Simulation(level, { endsWhen: 'clock' });
    // The Warden walks east through the field with the whole squad in tow.
    const input = { ...NO_INPUT, moveX: 1, moveZ: 0.2 };
    const start = performance.now();
    for (let i = 0; i < STEPS; i++) sim.step(input);
    const elapsed = performance.now() - start;
    sim.dispose();
    expect(sim.workers.size).toBe(WORKER.maxOnField);
    expect(elapsed, `${elapsed.toFixed(0)} ms for ${STEPS} steps`).toBeLessThan(BUDGET_MS);
  });
});
