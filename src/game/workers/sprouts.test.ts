import { beforeAll, describe, expect, it } from 'vitest';
import { carrySpeed, crewStrength } from '../carry/carrySystem';
import { NO_INPUT, type InputState } from '../commands/input';
import { PERIL_SECONDS } from '../core/config';
import { damageEnemy } from '../enemies/combat';
import type { SimEventType } from '../simulation/events';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { rectBox } from '../world/carve';
import { LEVELS, type LevelDefinition } from '../world/level';
import { spawnHazard, spawnWorker } from '../world/spawn';
import { joinSquad, removeWorker, setIdle } from './squad';
import { SPROUT_KINDS, SPROUTS, squadSize } from './sprouts';

beforeAll(async () => {
  await initPhysics();
});

const FIELD: LevelDefinition = {
  ...LEVELS[0],
  id: 'sprouts',
  width: 60,
  depth: 30,
  dayLength: 300,
  startingWorkers: 8,
  squad: { ember: 2, dew: 2, stone: 2, spark: 2 },
  captain: { x: -10, z: 0 },
  kiln: { x: -20, z: 0 },
  obstacles: [],
  treasures: [{ id: 'far', x: 26, z: 12, weight: 40 }],
  pods: [],
  enemies: [],
};

function run(sim: Simulation, steps: number, input: Partial<InputState> = {}) {
  const seen = new Map<SimEventType, number>();
  for (let i = 0; i < steps && !sim.ended; i++) {
    sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: 0, ...input });
    for (const event of sim.events) seen.set(event.type, (seen.get(event.type) ?? 0) + 1);
  }
  return seen;
}

function workersOf(sim: Simulation, kind: string) {
  return [...sim.workers.entries()].filter(([, w]) => w.kind === kind);
}

describe('the kinds of Sproutling', () => {
  it('are each good at something no other kind is', () => {
    const fireproof = SPROUT_KINDS.filter((k) => SPROUTS[k].fireproof);
    const waders = SPROUT_KINDS.filter((k) => SPROUTS[k].wades);
    const shockproof = SPROUT_KINDS.filter((k) => SPROUTS[k].shockproof);
    const crystal = SPROUT_KINDS.filter((k) => SPROUTS[k].crystal === 1);
    const farthest = SPROUT_KINDS.reduce((a, b) =>
      SPROUTS[a].throwRange >= SPROUTS[b].throwRange ? a : b,
    );
    expect([fireproof, waders, shockproof, crystal]).toEqual([
      ['ember'],
      ['dew'],
      ['spark'],
      ['stone'],
    ]);
    expect(farthest).toBe('spark');
    expect(new Set(SPROUT_KINDS.map((k) => SPROUTS[k].name)).size).toBe(4);
  });

  it('start the day in the squad the lesson asks for', () => {
    const sim = new Simulation(FIELD);
    for (const kind of SPROUT_KINDS) expect(workersOf(sim, kind).length).toBe(2);
    expect(squadSize(FIELD.squad ?? {})).toBe(FIELD.startingWorkers);
    sim.dispose();
  });

  it('every lesson’s squad adds up to its starting count', () => {
    for (const level of LEVELS) {
      if (level.squad) expect(squadSize(level.squad), level.id).toBe(level.startingWorkers);
    }
  });
});

describe('Stonelings', () => {
  it('lift like two', () => {
    const sim = new Simulation(FIELD);
    const stones = workersOf(sim, 'stone').map(([e]) => e);
    const embers = workersOf(sim, 'ember').map(([e]) => e);
    expect(crewStrength(sim, stones.slice(0, 1))).toBe(2);
    expect(crewStrength(sim, embers.slice(0, 1))).toBe(1);
    const [[, haul]] = [...sim.carryables.entries()];
    const two = { ...haul, weight: 2, maxCarriers: 4 };
    expect(carrySpeed(sim, { ...two, carriers: stones.slice(0, 1) })).toBeGreaterThan(0);
    expect(carrySpeed(sim, { ...two, carriers: embers.slice(0, 1) })).toBe(0);
    sim.dispose();
  });

  it('are the only ones that really hurt crystal', () => {
    const sim = new Simulation({
      ...FIELD,
      gates: [{ ...rectBox([5, -4, 7, 4]), hp: 100, style: 'crystal' }],
    });
    const [[gate, enemy]] = [...sim.enemies.entries()];
    damageEnemy(sim, gate, enemy, 10, 'ember');
    expect(enemy.hp).toBeCloseTo(100 - 10 * SPROUTS.ember.crystal);
    damageEnemy(sim, gate, enemy, 10, 'stone');
    expect(enemy.hp).toBeCloseTo(100 - 10 * SPROUTS.ember.crystal - 10);
    sim.dispose();
  });
});

describe('water', () => {
  const POND: LevelDefinition = {
    ...FIELD,
    water: [rectBox([-4, -6, 4, 6])],
    treasures: [
      { id: 'sunk', x: 0, z: 0, weight: 2 },
      { id: 'far', x: 26, z: 12, weight: 40 },
    ],
  };

  it('is waded by Dewlings, who carry a sunk relic home through it', () => {
    const sim = new Simulation(POND);
    // Holding the throw sends both Dewlings; the volley stops when they run out.
    const seen = run(sim, 60 * 25, { selectKind: 'dew', throwHeld: true, cursorX: 0, cursorZ: 0 });
    expect(sim.stats.treasuresCollected).toContain('sunk');
    expect(seen.get('drowned') ?? 0).toBe(0);
    sim.dispose();
  });

  it('drowns anyone else thrown into it, unless the whistle reaches them in time', () => {
    const sim = new Simulation(POND);
    const seen = run(sim, 40, { selectKind: 'ember', throwHeld: true, cursorX: 0, cursorZ: 0 });
    // Let the volley land.
    run(sim, 30);
    const floundering = [...sim.workers.entries()].filter(([, w]) => w.peril === 'water');
    expect(floundering.length).toBeGreaterThan(0);
    // Whistle one out at once; leave the rest.
    const [saved, worker] = floundering[0];
    joinSquad(sim, saved, worker);
    run(sim, 60 * (PERIL_SECONDS + 1));
    expect(sim.workers.has(saved)).toBe(true);
    expect(sim.stats.workersLost).toBe(floundering.length - 1);
    expect(seen.get('splash')).toBeGreaterThan(0);
    sim.dispose();
  });

  it('turns the cursor away for nobody: a non-wader is never sent after a relic in the water on its own', () => {
    const sim = new Simulation(POND);
    // Idle Emberlings on the bank do not go in after it.
    for (const [entity, worker] of workersOf(sim, 'ember')) {
      const at = sim.transforms.require(entity);
      at.x = -5;
      at.z = 0;
      setIdle(sim, entity, worker);
    }
    run(sim, 60 * 3);
    for (const [, worker] of workersOf(sim, 'ember')) expect(worker.state).not.toBe('toCarry');
    sim.dispose();
  });
});

describe('fire, sparks and drips', () => {
  it('flame sets every kind but Emberlings alight, and the whistle puts it out', () => {
    const sim = new Simulation(FIELD);
    // Everyone stands in one spot, off duty.
    for (const [entity, worker] of sim.workers.entries()) {
      const at = sim.transforms.require(entity);
      at.x = 5;
      at.z = 0;
      setIdle(sim, entity, worker);
    }
    spawnHazard(sim, 'flame', { x: 5, z: 0 }, { x: 5, z: 0 }, 0.001);
    run(sim, 1);
    const burning = [...sim.workers.entries()].filter(([, w]) => w.peril === 'fire');
    expect(burning.every(([, w]) => w.kind !== 'ember')).toBe(true);
    expect(burning.length).toBe(6);
    const [saved, worker] = burning[0];
    joinSquad(sim, saved, worker);
    run(sim, 60 * (PERIL_SECONDS + 1));
    expect(sim.workers.has(saved)).toBe(true);
    expect(sim.stats.workersLost).toBe(5);
    sim.dispose();
  });

  it('an arc kills all but Sparklings outright', () => {
    const sim = new Simulation(FIELD);
    for (const [entity, worker] of sim.workers.entries()) {
      const at = sim.transforms.require(entity);
      at.x = 5;
      at.z = 0;
      setIdle(sim, entity, worker);
    }
    spawnHazard(sim, 'arc', { x: 5, z: 0 }, { x: 5, z: 0 }, 0.001);
    run(sim, 1);
    expect([...sim.workers.entries()].map(([, w]) => w.kind).sort()).toEqual(['spark', 'spark']);
    sim.dispose();
  });

  it('a drip knocks everyone flat but a Dewling', () => {
    const sim = new Simulation(FIELD);
    for (const [entity, worker] of sim.workers.entries()) {
      const at = sim.transforms.require(entity);
      at.x = 5;
      at.z = 0;
      setIdle(sim, entity, worker);
    }
    spawnHazard(sim, 'drip', { x: 5, z: 0 }, { x: 5, z: 0 }, 0.001);
    run(sim, 1);
    for (const [, worker] of sim.workers.entries()) {
      expect(worker.stun > 0).toBe(worker.kind !== 'dew');
    }
    sim.dispose();
  });

  it('vents and coils go off on their own beat', () => {
    const sim = new Simulation({
      ...FIELD,
      vents: [{ x: 10, z: 8, period: 4, offset: 1 }],
      coils: [{ a: { x: 0, z: -10 }, b: { x: 8, z: -10 }, period: 5, offset: 2 }],
    });
    const seen = run(sim, 60 * 12);
    expect(seen.get('flare')).toBe(3);
    expect(seen.get('zap')).toBeGreaterThanOrEqual(2);
    sim.dispose();
  });
});

describe('choosing who to throw', () => {
  it('throws only the chosen kind, and moves on to the next kind (after a fresh press) when it runs out', () => {
    const sim = new Simulation(FIELD);
    sim.step({ ...NO_INPUT, selectKind: 'stone', cursorX: 0, cursorZ: 0 });
    expect(sim.selected).toBe('stone');
    const thrown: string[] = [];
    const seenThrown = new Set<number>();
    for (let i = 0; i < 60 * 3; i++) {
      // Released now and then, as a player would after a switch.
      sim.step({ ...NO_INPUT, throwHeld: i % 40 < 30, cursorX: -4, cursorZ: 3 });
      for (const [entity, w] of sim.workers.entries()) {
        if (w.state === 'thrown' && !seenThrown.has(entity)) {
          seenThrown.add(entity);
          thrown.push(w.kind);
        }
      }
    }
    // Both Stonelings went first, then, once the throw was pressed again, another kind.
    expect(thrown.slice(0, 2)).toEqual(['stone', 'stone']);
    expect(thrown.length).toBeGreaterThan(2);
    expect(thrown.slice(2).every((k) => k !== 'stone')).toBe(true);
    sim.dispose();
  });

  it('lets a Sparkling be thrown farthest', () => {
    const sim = new Simulation(FIELD);
    sim.step({ ...NO_INPUT, selectKind: 'spark', cursorX: 20, cursorZ: 0 });
    expect(sim.cursor.x - sim.captainTransform.x).toBeCloseTo(SPROUTS.spark.throwRange, 1);
    sim.step({ ...NO_INPUT, selectKind: 'stone', cursorX: 20, cursorZ: 0 });
    expect(sim.cursor.x - sim.captainTransform.x).toBeCloseTo(SPROUTS.stone.throwRange, 1);
    sim.dispose();
  });
});

describe('growing', () => {
  it('a seed pod grows its own kind; a carcass grows its crew’s', () => {
    const sim = new Simulation({ ...FIELD, pods: [{ x: -14, z: 4, kind: 'spark' }] });
    run(sim, 60 * 12, { selectKind: 'dew', throwHeld: true, cursorX: -14, cursorZ: 4 });
    expect(sim.kiln.queue.length + workersOf(sim, 'spark').length).toBeGreaterThanOrEqual(2);
    run(sim, 60 * 3);
    expect(workersOf(sim, 'spark').length).toBe(4);
    sim.dispose();
  });

  it('new Sproutlings from a fight come in the kind that did the carrying', () => {
    const sim = new Simulation({ ...FIELD, squad: { dew: 8 } });
    spawnWorker(sim, -10, 2, 'follow', 'dew');
    expect(workersOf(sim, 'dew').length).toBe(9);
    sim.dispose();
  });
});

describe('the Kiln', () => {
  it('never lets a kind of the day die out: the next one it grows is of that kind', () => {
    const sim = new Simulation({
      ...FIELD,
      squad: { ember: 6, spark: 2 },
      pods: [{ x: -14, z: 4, kind: 'ember' }],
    });
    // Every Sparkling is lost.
    for (const [entity, worker] of workersOf(sim, 'spark')) removeWorker(sim, entity, worker);
    expect(workersOf(sim, 'spark')).toHaveLength(0);
    // An Emberling pod still grows a Sparkling first, then Emberlings.
    run(sim, 60 * 12, { selectKind: 'ember', throwHeld: true, cursorX: -14, cursorZ: 4 });
    run(sim, 60 * 3);
    expect(workersOf(sim, 'spark')).toHaveLength(1);
    expect(workersOf(sim, 'ember')).toHaveLength(7);
    sim.dispose();
  });

  it('does not bring back a kind the day never had', () => {
    const sim = new Simulation({ ...FIELD, squad: { ember: 8 }, pods: [{ x: -14, z: 4 }] });
    run(sim, 60 * 12, { throwHeld: true, cursorX: -14, cursorZ: 4 });
    run(sim, 60 * 3);
    expect(workersOf(sim, 'ember')).toHaveLength(10);
    sim.dispose();
  });
});

describe('the squad', () => {
  it('no longer steps out of a charge by itself', () => {
    const level: LevelDefinition = {
      ...FIELD,
      squad: undefined,
      startingWorkers: 20,
      captain: { x: -20, z: 0 },
      kiln: { x: -27, z: 0 },
      enemies: [{ x: 5, z: 0, kind: 'ramhorn' }],
    };
    const sim = new Simulation(level);
    for (let i = 0; i < 60 * 30 && !sim.ended; i++) {
      const [[enemy]] = [...sim.enemies.entries()];
      const at = sim.transforms.require(enemy);
      const dx = at.x - sim.captainTransform.x;
      const dz = at.z - sim.captainTransform.z;
      const d = Math.hypot(dx, dz);
      sim.step({
        ...NO_INPUT,
        moveX: d > 3 ? dx / d : 0,
        moveZ: d > 3 ? dz / d : 0,
        cursorX: 0,
        cursorZ: 0,
      });
    }
    expect(sim.stats.workersLost).toBeGreaterThan(0);
    sim.dispose();
  });
});
