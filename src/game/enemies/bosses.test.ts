import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { emptySave, parseSave } from '../save/saveManager';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { BOSS_RELICS, relicFor } from '../story/relics';
import { LEVELS, type LevelDefinition } from '../world/level';
import { spawnWorker } from '../world/spawn';
import { flightHeight, walkersCanReach } from './beasts';
import { isTargetable } from './combat';
import { ENEMY_SPECS, type EnemyKind } from './enemyKinds';

beforeAll(async () => {
  await initPhysics();
});

function field(kind: EnemyKind, extra: Partial<LevelDefinition> = {}): Simulation {
  return new Simulation({
    ...LEVELS[0],
    id: `boss-${kind}`,
    width: 70,
    depth: 50,
    dayLength: 600,
    startingWorkers: 0,
    squad: {},
    captain: { x: -30, z: 20 },
    kiln: { x: -32, z: 22 },
    obstacles: [],
    treasures: [{ id: 'far', x: 30, z: 20, weight: 1 }],
    pods: [],
    enemies: [{ x: 0, z: 0, kind }],
    ...extra,
  });
}

const boss = (sim: Simulation) => {
  const found = [...sim.enemies.entries()].find(([, e]) => ENEMY_SPECS[e.kind].boss);
  if (!found) throw new Error('no boss on the field');
  const [entity, enemy] = found;
  return { entity, enemy, at: sim.transforms.require(entity) };
};

function steps(sim: Simulation, seconds: number) {
  for (let i = 0; i < seconds * 60 && !sim.ended; i++) {
    sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: sim.captainTransform.z });
  }
}

describe('three phases', () => {
  it('gives every boss two phase marks', () => {
    for (const kind of [
      'gravelmaw',
      'lanternroot',
      'bellwether',
      'snuffer',
      'galewing',
      'mirelord',
    ] as const) {
      expect(ENEMY_SPECS[kind].phases, kind).toHaveLength(2);
    }
  });

  it('has the Gravelmaw come up under the crowd in its last phase', () => {
    const sim = field('gravelmaw');
    const { enemy, at } = boss(sim);
    for (let i = 0; i < 6; i++)
      spawnWorker(sim, 6 + (i % 3) * 0.5, 4 + Math.floor(i / 3) * 0.5, 'idle');
    for (const [, w] of sim.workers.entries()) w.scan = 99;
    enemy.hp = enemy.maxHp * 0.3;
    enemy.state = 'recover';
    enemy.timer = 0.01;
    steps(sim, 0.1);
    expect(Math.hypot(at.x - 6.5, at.z - 4.2)).toBeLessThan(3);
    expect(enemy.state).toBe('windup');
  });

  it('calls help in the last phase: Bogspitters, Pollen Moths, Pike Newts', () => {
    for (const [kind, brood] of [
      ['lanternroot', 'spitter'],
      ['galewing', 'moth'],
      ['mirelord', 'newt'],
    ] as const) {
      const sim = field(kind, kind === 'mirelord' ? { water: [{ x: 0, z: 0, w: 16, d: 16 }] } : {});
      const { enemy } = boss(sim);
      enemy.hp = enemy.maxHp * 0.3;
      steps(sim, 0.05);
      const called = [...sim.enemies.entries()].filter(([, e]) => e.kind === brood);
      expect(called.length, kind).toBe(2);
    }
  });
});

describe('the Galewing', () => {
  it('circles out of walking reach, dives on the crowd, and lies open after', () => {
    const sim = field('galewing');
    const { entity, enemy } = boss(sim);
    expect(flightHeight(enemy)).toBeGreaterThan(0);
    expect(isTargetable(sim, entity, enemy)).toBe(false);
    for (let i = 0; i < 4; i++) spawnWorker(sim, 6 + i * 0.4, 0, 'idle');
    for (const [, w] of sim.workers.entries()) w.scan = 99;
    steps(sim, 2);
    expect(walkersCanReach(enemy)).toBe(true);
    expect(enemy.state).toBe('recover');
    steps(sim, 5);
    expect(walkersCanReach(enemy)).toBe(false);
  });
});

describe('the Mire Lord', () => {
  it('hunts only on the banks of its pool', () => {
    const sim = field('mirelord', { water: [{ x: 0, z: 0, w: 16, d: 16 }] });
    const { enemy } = boss(sim);
    const dry = spawnWorker(sim, 20, 0, 'idle');
    sim.workers.require(dry).scan = 99;
    steps(sim, 0.5);
    expect(enemy.alert).toBe(false);
    const bank = spawnWorker(sim, 9, 0, 'idle');
    sim.workers.require(bank).scan = 99;
    steps(sim, 0.5);
    expect(enemy.alert).toBe(true);
  });
});

describe('rewards and intros', () => {
  it('gives each boss its own named relic', () => {
    for (const kind of [
      'gravelmaw',
      'lanternroot',
      'bellwether',
      'snuffer',
      'galewing',
      'mirelord',
    ]) {
      expect(relicFor('anywhere', `${kind}-shard`)).toBe(BOSS_RELICS[`${kind}-shard`]);
    }
  });

  it('remembers which fields have shown their boss intro, and reads saves from before', () => {
    const save = { ...emptySave(), bossIntros: ['gravelmaws-pit'] };
    expect(parseSave(JSON.parse(JSON.stringify(save)))?.bossIntros).toEqual(['gravelmaws-pit']);
    const old = JSON.parse(JSON.stringify(emptySave()));
    delete old.bossIntros;
    expect(parseSave(old)?.bossIntros).toEqual([]);
  });
});
