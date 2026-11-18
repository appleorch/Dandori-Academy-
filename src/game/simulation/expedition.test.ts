import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { LEVELS } from '../world/level';
import { Expedition } from './expedition';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';

const SURFACE = LEVELS.find((level) => level.id === 'matched-pairs') ?? LEVELS[0];

function walk(sim: Simulation, steps: number): void {
  for (let i = 0; i < steps && !sim.ended; i++) {
    sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: sim.captainTransform.z });
  }
}

function count(sim: Simulation, state?: string): number {
  let n = 0;
  for (const [, worker] of sim.workers.entries()) if (!state || worker.state === state) n++;
  return n;
}

beforeAll(async () => {
  await initPhysics();
});

describe('expedition', () => {
  it('starts from a lesson with a way down', () => {
    expect(SURFACE.descent?.to).toBe('the-cistern');
  });

  it('takes the squad down, freezes the surface, and brings everyone back up', () => {
    const expedition = new Expedition(new Simulation(SURFACE));
    const surface = expedition.surface;
    walk(surface, 60);
    const squad = count(surface, 'follow');
    const others = count(surface) - squad;
    expect(squad).toBeGreaterThan(0);
    const clock = surface.timeLeft;

    expect(expedition.blocked()).toBeNull();
    expect(expedition.descend()).toBe(true);
    expect(expedition.below).toBe(true);
    const cave = expedition.active;
    expect(cave.level.id).toBe('the-cistern');
    expect(cave.visit).toBe(true);
    expect(count(cave, 'follow')).toBe(squad);
    expect(count(surface)).toBe(others);

    // Time passes below; the surface clock and the cave's own do not move.
    const caveClock = cave.timeLeft;
    walk(cave, 600);
    expect(cave.timeLeft).toBe(caveClock);
    expect(surface.timeLeft).toBe(clock);
    expect(cave.ended).toBeNull();

    expedition.ascend();
    expect(expedition.below).toBe(false);
    expect(expedition.active).toBe(surface);
    expect(count(surface)).toBe(others + squad);
    expect(count(cave)).toBe(0);
    // The surface picks up where it left off.
    walk(surface, 60);
    expect(surface.timeLeft).toBeLessThan(clock);
    expedition.dispose();
  });

  it('keeps a cave as it was left, and counts each relic found below once', () => {
    const expedition = new Expedition(new Simulation(SURFACE));
    expedition.descend();
    const cave = expedition.active;
    cave.stats.treasuresCollected.push('a');
    cave.stats.treasureValue += 100;
    expedition.ascend();
    expect(expedition.haul.relics).toEqual(['the-cistern:a']);
    expect(expedition.haul.value).toBe(100);

    expedition.descend();
    expect(expedition.active).toBe(cave);
    cave.stats.treasuresCollected.push('b');
    cave.stats.treasureValue += 50;
    expedition.ascend();
    expect(expedition.haul.relics).toEqual(['the-cistern:a', 'the-cistern:b']);
    expect(expedition.haul.value).toBe(150);
    // Cave relics are for the Field Guide: they never touch the day's score.
    expect(expedition.surface.stats.treasureValue).toBe(0);
    expedition.dispose();
  });

  it('needs a squad to go down, and is closed once the cave is emptied', () => {
    const expedition = new Expedition(new Simulation(SURFACE));
    const surface = expedition.surface;
    for (const [, worker] of surface.workers.entries()) worker.state = 'idle';
    expect(expedition.blocked()).toMatch(/squad/);
    expect(expedition.descend()).toBe(false);
    for (const [, worker] of surface.workers.entries()) worker.state = 'follow';
    expect(expedition.descend()).toBe(true);
    const cave = expedition.active;
    cave.ended = 'allCollected';
    expedition.settle();
    expect(expedition.below).toBe(false);
    expect(expedition.blocked()).toMatch(/Nothing left/);
    expect(surface.ended).toBeNull();
    expedition.dispose();
  });

  it('carries losses below up to the day, and a Warden who falls below ends it', () => {
    const expedition = new Expedition(new Simulation(SURFACE));
    expedition.descend();
    const cave = expedition.active;
    cave.stats.workersLost += 3;
    cave.stats.enemiesDefeated += 2;
    cave.ended = 'captainDown';
    expedition.settle();
    expect(expedition.below).toBe(false);
    expect(expedition.surface.ended).toBe('captainDown');
    expect(expedition.surface.stats.workersLost).toBe(3);
    expect(expedition.surface.stats.enemiesDefeated).toBe(2);
    expedition.dispose();
  });

  it('has no way down where the lesson has none', () => {
    const expedition = new Expedition(new Simulation(LEVELS[0]));
    expect(expedition.blocked()).not.toBeNull();
    expect(expedition.descend()).toBe(false);
    expedition.dispose();
  });
});
