import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT, type InputState } from '../commands/input';
import { CAPTAIN, POD } from '../core/config';
import { ENEMY, ENEMY_SPECS, type EnemyKind } from '../enemies/enemyKinds';
import { LEVELS, type LevelDefinition } from '../world/level';
import type { SimEventType } from './events';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';

const ARENA: LevelDefinition = {
  ...LEVELS[0],
  id: 'arena',
  width: 60,
  depth: 30,
  dayLength: 120,
  startingWorkers: 12,
  captain: { x: 0, z: 0 },
  kiln: { x: -20, z: 0 },
  obstacles: [],
  treasures: [{ id: 'far', x: 26, z: 12, weight: 40 }],
  pods: [],
  enemies: [],
};

function arena(kind: EnemyKind, x: number, extra: Partial<LevelDefinition> = {}): Simulation {
  return new Simulation({ ...ARENA, enemies: [{ x, z: 0, kind }], ...extra });
}

/** Steps the simulation and returns how often each event fired. */
function run(sim: Simulation, steps: number, input: Partial<InputState> = {}) {
  const seen = new Map<SimEventType, number>();
  for (let i = 0; i < steps && !sim.ended; i++) {
    sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: 0, ...input });
    for (const event of sim.events) seen.set(event.type, (seen.get(event.type) ?? 0) + 1);
  }
  return seen;
}

beforeAll(async () => {
  await initPhysics();
});

describe('Mossback', () => {
  it('shakes off a small squad and eats the dazed unless they are whistled away', () => {
    const lossesAfterShake = (whistle: boolean): number => {
      const sim = arena('mossback', 6, { startingWorkers: 6 });
      run(sim, 90, { cursorX: 6, throwHeld: true });
      let shaken = false;
      for (let i = 0; i < 60 * 8 && !shaken; i++) shaken = (run(sim, 1).get('shake') ?? 0) > 0;
      expect(shaken).toBe(true);
      const before = sim.stats.workersLost;
      const [entity] = [...sim.enemies.entries()][0];
      const at = sim.transforms.require(entity);
      run(sim, 100, { cursorX: at.x, cursorZ: at.z, whistleHeld: whistle, moveX: -1 });
      const lost = sim.stats.workersLost - before;
      sim.dispose();
      return lost;
    };
    expect(lossesAfterShake(false)).toBeGreaterThan(0);
    expect(lossesAfterShake(true)).toBe(0);
  });

  it('pulls throws aimed beside it onto its back', () => {
    const sim = arena('mossback', 7);
    const seen = run(sim, 50, { cursorX: 8.6, cursorZ: 1, throwHeld: true });
    expect(seen.get('throw')).toBeGreaterThanOrEqual(4);
    expect(seen.get('latch')).toBeGreaterThanOrEqual(3);
    sim.dispose();
  });

  it('falls to a full squad that keeps the pressure on', () => {
    const sim = arena('mossback', 7);
    for (let i = 0; i < 60 * 20 && sim.enemies.size > 0; i++) {
      const [entity] = [...sim.enemies.entries()][0];
      const at = sim.transforms.require(entity);
      sim.step({ ...NO_INPUT, cursorX: at.x, cursorZ: at.z, throwHeld: true });
    }
    expect(sim.stats.enemiesDefeated).toBe(1);
    sim.dispose();
  });
});

describe('Ramhorn', () => {
  it('charges through the squad, crushes a limited number and ends up winded', () => {
    const sim = arena('ramhorn', 8, { startingWorkers: 30 });
    const seen = run(sim, 60 * 3);
    expect(seen.get('chargeWindup')).toBe(1);
    expect(seen.get('slam')).toBe(1);
    expect(sim.stats.workersLost).toBeGreaterThan(0);
    expect(sim.stats.workersLost).toBeLessThanOrEqual(ENEMY.trampleKills);
    expect(sim.captainState.hp).toBe(CAPTAIN.maxHp - 1);
    const [, enemy] = [...sim.enemies.entries()][0];
    expect(enemy.state).toBe('recover');
    sim.dispose();
  });

  it('misses a captain who steps out of the charge line', () => {
    const sim = arena('ramhorn', 9, { startingWorkers: 0, treasures: ARENA.treasures });
    // No workers would end the day at once, so keep one pod's worth in the Kiln queue.
    sim.kiln.queue = 1;
    run(sim, 60 * 3, { moveZ: 1 });
    expect(sim.captainState.hp).toBe(CAPTAIN.maxHp);
    sim.dispose();
  });
});

describe('Bogspitter', () => {
  it('lobs a glob that flattens whoever stays put and knocks the captain back', () => {
    const sim = arena('spitter', 8, { startingWorkers: 8 });
    const seen = run(sim, 60 * 2.5);
    expect(seen.get('spit')).toBeGreaterThanOrEqual(1);
    expect(seen.get('splat')).toBeGreaterThanOrEqual(1);
    expect(sim.stats.workersLost).toBeGreaterThan(0);
    expect(sim.stats.workersLost).toBeLessThanOrEqual(2 * ENEMY.splashKills);
    expect(sim.captainState.hp).toBeLessThan(CAPTAIN.maxHp);
    expect(Math.abs(sim.captainTransform.x) + Math.abs(sim.captainTransform.z)).toBeGreaterThan(1);
    sim.dispose();
  });

  it('hits nothing when the squad keeps moving', () => {
    const sim = arena('spitter', 8, { startingWorkers: 8 });
    run(sim, 60 * 4, { moveZ: 1 });
    run(sim, 60 * 4, { moveZ: -1 });
    expect(sim.stats.workersLost).toBe(0);
    expect(sim.captainState.hp).toBe(CAPTAIN.maxHp);
    sim.dispose();
  });
});

describe('squad orders and pods', () => {
  it('rushes the whole squad onto a target', () => {
    const sim = arena('mossback', 9);
    run(sim, 1, { cursorX: 9, rush: true });
    expect(sim.countWorkers().squad).toBe(0);
    const seen = run(sim, 60 * 2, { cursorX: 9 });
    expect(seen.get('latch')).toBeGreaterThanOrEqual(8);
    sim.dispose();
  });

  it('turns a delivered pod into new workers without it counting as treasure', () => {
    const sim = new Simulation({ ...ARENA, startingWorkers: 2, pods: [{ x: -12, z: 0 }] });
    const seen = run(sim, 60 * 8, { cursorX: -9, cursorZ: 0, throwHeld: true });
    expect(seen.get('grow')).toBe(1);
    expect(seen.get('spawn')).toBe(POD.workerYield);
    expect(sim.workers.size).toBe(2 + POD.workerYield);
    expect(sim.stats.treasuresCollected).toEqual([]);
    expect(sim.ended).toBeNull();
    sim.dispose();
  });

  it('gives every enemy kind a carcass worth hauling', () => {
    for (const spec of Object.values(ENEMY_SPECS)) {
      expect(spec.carcassYield).toBeGreaterThan(spec.carcassWeight);
      expect(spec.windup).toBeGreaterThan(0.5);
    }
  });
});
