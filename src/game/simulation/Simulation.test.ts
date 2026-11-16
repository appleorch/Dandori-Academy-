import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT, type InputState } from '../commands/input';
import { LEVELS, type LevelDefinition } from '../world/level';

const FIRST_LIGHT = LEVELS[3];
import { initPhysics } from './physics';
import { Simulation } from './Simulation';

const OPEN_FIELD: LevelDefinition = {
  ...FIRST_LIGHT,
  id: 'test',
  width: 40,
  depth: 20,
  dayLength: 60,
  startingWorkers: 6,
  captain: { x: 0, z: 0 },
  kiln: { x: -8, z: 0 },
  obstacles: [],
  treasures: [{ id: 'near', x: 6, z: 0, weight: 2 }],
  pods: [],
  enemies: [],
};

function run(sim: Simulation, steps: number, input: Partial<InputState> = {}): void {
  for (let i = 0; i < steps; i++) sim.step({ ...NO_INPUT, ...input });
}

beforeAll(async () => {
  await initPhysics();
});

describe('Simulation', () => {
  it('throws workers at a treasure, which is carried home and ends the day', () => {
    const sim = new Simulation(OPEN_FIELD);
    run(sim, 60, { cursorX: 6, cursorZ: 0, throwHeld: true });
    expect(sim.countWorkers().squad).toBeLessThan(6);
    run(sim, 60 * 20, { cursorX: 6, cursorZ: 0 });
    expect(sim.ended).toBe('allCollected');
    expect(sim.stats.treasureValue).toBe(200);
    expect(sim.stats.treasuresCollected).toEqual(['near']);
    expect(sim.carryables.size).toBe(0);
    expect(sim.countWorkers().working).toBe(0);
    sim.dispose();
  });

  it('does not move a treasure with too few carriers', () => {
    const sim = new Simulation({
      ...OPEN_FIELD,
      startingWorkers: 2,
      treasures: [{ id: 'heavy', x: 6, z: 0, weight: 3 }],
    });
    run(sim, 60 * 5, { cursorX: 6, cursorZ: 0, throwHeld: true });
    const [[entity, treasure]] = [...sim.carryables.entries()];
    expect(treasure.carriers.length).toBe(2);
    expect(sim.transforms.require(entity).x).toBe(6);
    sim.dispose();
  });

  it('whistles working and idle workers back into the squad', () => {
    const sim = new Simulation({
      ...OPEN_FIELD,
      treasures: [{ id: 'heavy', x: 6, z: 0, weight: 20 }],
    });
    run(sim, 60 * 2, { cursorX: 6, cursorZ: 0, throwHeld: true });
    expect(sim.countWorkers().working).toBe(6);
    run(sim, 60, { cursorX: 6, cursorZ: 0, whistleHeld: true });
    expect(sim.countWorkers().squad).toBe(6);
    const [[, treasure]] = [...sim.carryables.entries()];
    expect(treasure.claimed).toEqual([]);
    run(sim, 1, { dismiss: true });
    expect(sim.countWorkers().squad).toBe(0);
    sim.dispose();
  });

  it('keeps the captain out of walls', () => {
    const sim = new Simulation({
      ...OPEN_FIELD,
      obstacles: [{ x: 4, z: 0, w: 2, d: 10 }],
      treasures: [{ id: 'far', x: 12, z: 0, weight: 1 }],
    });
    run(sim, 60 * 3, { moveX: 1 });
    expect(sim.captainTransform.x).toBeGreaterThan(2);
    expect(sim.captainTransform.x).toBeLessThan(3 - 0.4);
    run(sim, 60 * 10, { moveX: -1 });
    expect(sim.captainTransform.x).toBeGreaterThan(-20);
    sim.dispose();
  });

  it('defeats an enemy, hauls the carcass home and grows the workforce', () => {
    const sim = new Simulation({
      ...OPEN_FIELD,
      startingWorkers: 12,
      treasures: [{ id: 'unreachable-in-time', x: 18, z: 8, weight: 30 }],
      enemies: [{ x: 9, z: 0, kind: 'mossback' }],
    });
    run(sim, 60 * 40, { cursorX: 9, cursorZ: 0, throwHeld: true });
    expect(sim.stats.enemiesDefeated).toBe(1);
    expect(sim.enemies.size).toBe(0);
    const alive = sim.countWorkers().total;
    expect(alive).toBe(12 - sim.stats.workersLost + 4);
    sim.dispose();
  });

  it('ends on time up and is deterministic', () => {
    const play = (): Simulation => {
      const sim = new Simulation(FIRST_LIGHT);
      for (let i = 0; i < 60 * 30; i++) {
        sim.step({
          ...NO_INPUT,
          moveX: i % 240 < 120 ? 1 : 0,
          moveZ: i % 300 < 100 ? -1 : 1,
          cursorX: sim.captainTransform.x + 5,
          cursorZ: sim.captainTransform.z - 3,
          throwHeld: i % 90 < 30,
          whistleHeld: i % 400 > 360,
        });
      }
      return sim;
    };
    const a = play();
    const b = play();
    expect(a.captainTransform).toEqual(b.captainTransform);
    expect([...a.transforms.entries()]).toEqual([...b.transforms.entries()]);
    expect(a.stats).toEqual(b.stats);
    a.dispose();
    b.dispose();

    const short = new Simulation({ ...OPEN_FIELD, dayLength: 1, treasures: OPEN_FIELD.treasures });
    run(short, 61);
    expect(short.ended).toBe('timeUp');
    short.dispose();
  });
});
