import { beforeAll, describe, expect, it } from 'vitest';
import { tallyDay } from '../dandori/tally';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS } from '../world/level';
import { playGreedy } from '../world/testBot';
import { dayFeats } from './feats';

beforeAll(async () => {
  await initPhysics();
});

function playedFeats(id: string) {
  const level = LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(id);
  const sim = new Simulation(level);
  playGreedy(sim);
  const tally = tallyDay(level, {
    shardsHome: sim.stats.treasuresCollected.length,
    treasureValue: sim.stats.treasureValue,
    bonus: sim.stats.bonus,
    alive: sim.workers.size,
    lost: sim.stats.workersLost,
    grown: sim.stats.grown,
    timeLeft: sim.timeLeft,
  });
  const feats = dayFeats(sim, tally);
  sim.dispose();
  return feats;
}

describe('the feats of a real day', () => {
  it('see Sunshards fetched from water, vents, coils and crystal', () => {
    expect(playedFeats('divide-and-conquer').sunkHome).toBe(2);
    expect(playedFeats('the-guard').ventHome).toBe(1);
    expect(playedFeats('bramble-gate').coilHome).toBeGreaterThanOrEqual(1);
    const crystal = playedFeats('growing-pains');
    expect(crystal.crystalBroken).toBe(1);
    expect(crystal.grown).toBeGreaterThan(0);
  });

  it('count the beasts but not the mounds', () => {
    expect(playedFeats('many-hands').beasts).toBe(0);
    expect(playedFeats('the-guard').beasts).toBe(1);
  });
});
