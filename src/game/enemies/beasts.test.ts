import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT, type InputState } from '../commands/input';
import type { Entity } from '../core/ecs';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS, type LevelDefinition } from '../world/level';
import { spawnWorker } from '../world/spawn';
import type { SproutKind } from '../workers/sprouts';
import { canBeHit, onImpact } from './beasts';
import { damageTaken, isTargetable } from './combat';
import type { EnemyKind } from './enemyKinds';

beforeAll(async () => {
  await initPhysics();
});

/** An empty field with one beast in the middle and the Warden well away. */
function field(kind: EnemyKind, extra: Partial<LevelDefinition> = {}): Simulation {
  return new Simulation({
    ...LEVELS[0],
    id: `beast-${kind}`,
    width: 60,
    depth: 40,
    dayLength: 300,
    startingWorkers: 0,
    squad: {},
    captain: { x: -25, z: 15 },
    kiln: { x: -27, z: 17 },
    obstacles: [],
    treasures: [{ id: 'far', x: 25, z: 15, weight: 1 }],
    pods: [],
    enemies: [{ x: 0, z: 0, kind }],
    ...extra,
  });
}

function beast(sim: Simulation) {
  const [entity, enemy] = [...sim.enemies.entries()][0];
  return { entity, enemy, at: sim.transforms.require(entity) };
}

function steps(sim: Simulation, seconds: number, input: Partial<InputState> = {}) {
  for (let i = 0; i < seconds * 60 && !sim.ended; i++) {
    sim.step({
      ...NO_INPUT,
      cursorX: sim.captainTransform.x,
      cursorZ: sim.captainTransform.z,
      ...input,
    });
  }
}

const worker = (sim: Simulation, x: number, z: number, kind: SproutKind = 'ember'): Entity =>
  spawnWorker(sim, x, z, 'idle', kind);

describe('Pollen Moth', () => {
  it('is out of reach on foot, swoops on a Sproutling and lets go when hit', () => {
    const sim = field('moth');
    const { entity, enemy } = beast(sim);
    expect(isTargetable(sim, entity, enemy)).toBe(false);
    const prey = worker(sim, 2, 0);
    sim.workers.require(prey).scan = 99;
    steps(sim, 2.5);
    expect(enemy.prey).toBe(prey);
    enemy.hp -= 12;
    steps(sim, 0.1);
    expect(enemy.prey).not.toBe(prey);
    expect(sim.workers.require(prey).stun).toBeLessThan(5);
  });

  it('carries off a Sproutling it is not made to drop', () => {
    const sim = field('moth');
    const { enemy } = beast(sim);
    const prey = worker(sim, 2, 0);
    sim.workers.require(prey).scan = 99;
    steps(sim, 2.5);
    expect(enemy.prey).toBe(prey);
    steps(sim, 6);
    expect(sim.workers.has(prey)).toBe(false);
  });
});

describe('Burrow Grub', () => {
  it('cannot be hit underground, erupts, and lies open on the surface', () => {
    const sim = field('grub');
    const { entity, enemy } = beast(sim);
    expect(canBeHit(enemy)).toBe(false);
    expect(damageTaken(sim, entity, enemy)).toBe(0);
    for (let i = 0; i < 4; i++) worker(sim, 0.5 * i, 0.5);
    enemy.state = 'windup';
    enemy.timer = 0.01;
    steps(sim, 0.1);
    expect(sim.stats.workersLost).toBeGreaterThan(0);
    expect(canBeHit(enemy)).toBe(true);
    expect(damageTaken(sim, entity, enemy)).toBe(1);
  });
});

describe('Shellback Beetle', () => {
  it('shrugs off hits until two Stoneling hits flip it open', () => {
    const sim = field('shellback');
    const { entity, enemy, at } = beast(sim);
    expect(damageTaken(sim, entity, enemy)).toBeLessThan(0.5);
    onImpact(sim, enemy, at, 'ember');
    onImpact(sim, enemy, at, 'stone');
    expect(damageTaken(sim, entity, enemy)).toBeLessThan(0.5);
    onImpact(sim, enemy, at, 'stone');
    expect(damageTaken(sim, entity, enemy)).toBe(1);
  });
});

describe('Sleeper Slug', () => {
  it('sleeps through a Sproutling next to it, and wakes a moment after being hurt', () => {
    const sim = field('slug');
    const { enemy } = beast(sim);
    const near = worker(sim, 1.6, 0);
    sim.workers.require(near).scan = 99;
    steps(sim, 3);
    expect(sim.workers.has(near)).toBe(true);
    enemy.hp -= 5;
    steps(sim, 1);
    expect(enemy.alert).toBe(false);
    steps(sim, 2.5);
    expect(enemy.special).toBe(2);
  });
});

describe('Pike Newt', () => {
  it('hunts only in and beside the water', () => {
    const sim = field('newt', { water: [{ x: 0, z: 0, w: 8, d: 8 }] });
    const { enemy } = beast(sim);
    const dry = worker(sim, 8, 0);
    sim.workers.require(dry).scan = 99;
    steps(sim, 0.5);
    expect(enemy.alert).toBe(false);
    const bank = worker(sim, 5, 0);
    sim.workers.require(bank).scan = 99;
    steps(sim, 0.5);
    expect(enemy.alert).toBe(true);
  });
});

describe('Thornback Hedgehog', () => {
  it('spines whoever clings on, unless it is curled up', () => {
    const sim = field('hedgehog');
    const { entity, enemy } = beast(sim);
    const clinger = worker(sim, 0.8, 0);
    const w = sim.workers.require(clinger);
    w.state = 'attacking';
    w.target = entity;
    enemy.latched.push(clinger);
    enemy.state = 'recover';
    enemy.timer = 3;
    steps(sim, 2);
    expect(sim.workers.has(clinger)).toBe(true);
    enemy.state = 'roam';
    steps(sim, 1.5);
    expect(sim.workers.has(clinger)).toBe(false);
  });
});

describe('Mimic Cap', () => {
  it('is left alone as a Glowcap until someone comes close, then bites', () => {
    const sim = field('mimic');
    const { entity, enemy } = beast(sim);
    expect(isTargetable(sim, entity, enemy)).toBe(false);
    for (let i = 0; i < 3; i++) worker(sim, 1 + i * 0.1, 0.2 * i);
    steps(sim, 1);
    expect(enemy.special).toBe(1);
    expect(sim.stats.workersLost).toBeGreaterThan(0);
    expect(isTargetable(sim, entity, enemy)).toBe(true);
  });
});

describe('Spark Wasp Nest', () => {
  it('sends wasps while anyone is near, whose stings spare Sparklings', () => {
    const sim = field('waspnest');
    const spark = worker(sim, 5, 0, 'spark');
    sim.workers.require(spark).scan = 99;
    steps(sim, 0.2);
    const wasps = () => [...sim.enemies.entries()].filter(([, e]) => e.kind === 'sparkwasp');
    expect(wasps().length).toBe(1);
    steps(sim, 8);
    expect(sim.workers.has(spark)).toBe(true);
    const ember = worker(sim, 5, 2);
    sim.workers.require(ember).scan = 99;
    steps(sim, 6);
    expect(sim.workers.has(ember)).toBe(false);
  });
});
