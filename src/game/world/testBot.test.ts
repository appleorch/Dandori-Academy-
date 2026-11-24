import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { defineLevel, type LevelSpec } from './level';
import { playGreedy } from './testBot';

beforeAll(async () => {
  await initPhysics();
});

/** A small open field to build the cases from. */
const BASE: LevelSpec = {
  id: 'bot-case',
  stage: 0,
  name: 'Bot case',
  brief: '',
  width: 80,
  depth: 40,
  dayLength: 400,
  platinumTime: 400,
  seed: 7,
  startingWorkers: 14,
  captain: { x: -33, z: 1 },
  kiln: { x: -36, z: 0 },
  obstacles: [],
  treasures: [],
  pods: [],
  enemies: [],
};

function play(spec: LevelSpec) {
  const sim = new Simulation(defineLevel(spec), { endsWhen: 'everything' });
  playGreedy(sim);
  const result = { ended: sim.ended, home: sim.stats.treasuresCollected.length };
  sim.dispose();
  return result;
}

describe('the test player', () => {
  it('opens a gate before going for a Span-log behind it whose bridge is on the same side', () => {
    // A wall from edge to edge with a gate in it; behind it a Span-log, a river with a bridge
    // site on the near bank, and a shard across the river.
    const result = play({
      ...BASE,
      obstacles: [
        { x: -16, z: -12, w: 2, d: 16 },
        { x: -16, z: 12, w: 2, d: 16 },
      ],
      gates: [{ x: -16, z: 0, w: 2, d: 8, hp: 100 }],
      water: [
        { x: 10, z: -12, w: 4, d: 16 },
        { x: 10, z: 13, w: 4, d: 14 },
      ],
      bridges: [{ x: 10, z: 2, w: 4, d: 8, bank: { x: 5.5, z: 2 }, needs: 1 }],
      logs: [{ x: -4, z: 12 }],
      treasures: [
        { id: 'near', x: -26, z: 8, weight: 2 },
        { id: 'far', x: 24, z: 0, weight: 3 },
      ],
    });
    expect(result.ended).toBe('allCollected');
    expect(result.home).toBe(2);
  }, 120_000);

  it('builds the bridge before going for a beast on the far bank', () => {
    // A river from edge to edge; the only way over is a bridge built from the Span-log.
    const result = play({
      ...BASE,
      water: [
        { x: 4, z: -12, w: 4, d: 16 },
        { x: 4, z: 13, w: 4, d: 14 },
      ],
      bridges: [{ x: 4, z: 2, w: 4, d: 8, bank: { x: -0.5, z: 2 }, needs: 1 }],
      logs: [{ x: -20, z: -10 }],
      treasures: [{ id: 'near', x: -20, z: 10, weight: 2 }],
      enemies: [{ x: 24, z: 2, kind: 'mossback' }],
    });
    expect(result.ended).toBe('allCollected');
  }, 120_000);
});
