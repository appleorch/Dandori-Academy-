import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS, type LevelDefinition } from '../world/level';
import { playGreedy } from '../world/testBot';

beforeAll(async () => {
  await initPhysics();
});

/* Slow: a whole day of the test player against the final boss. Runs with `npm run test:levels`. */
describe('the Hollow Warden', () => {
  it('can be beaten by the test player with a squad of every kind', () => {
    const field: LevelDefinition = {
      ...LEVELS[0],
      id: 'hollow-warden-trial',
      width: 70,
      depth: 46,
      dayLength: 600,
      startingWorkers: 40,
      squad: { ember: 10, dew: 10, stone: 10, spark: 10 },
      captain: { x: -30, z: 0 },
      kiln: { x: -33, z: 0 },
      obstacles: [],
      treasures: [{ id: 'shard-1', x: -20, z: 10, weight: 1 }],
      pods: [],
      enemies: [{ x: 12, z: 0, kind: 'hollowwarden', drop: 4 }],
    };
    const sim = new Simulation(field, { endsWhen: 'everything' });
    playGreedy(sim);
    const left = [...sim.enemies.entries()].filter(([, e]) => e.kind === 'hollowwarden');
    expect(left, `ended ${sim.ended} at ${sim.elapsed}`).toHaveLength(0);
    sim.dispose();
  }, 600_000);
});
