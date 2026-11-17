import { beforeAll, describe, expect, it } from 'vitest';
import { destinationOf } from '../carry/carrySystem';
import { NO_INPUT, type InputState } from '../commands/input';
import { BEACON } from '../core/config';
import { damageTaken, isShielded } from '../enemies/combat';
import { ENEMY_SPECS } from '../enemies/enemyKinds';
import { carve, rectBox, type Rect } from '../world/carve';
import { LEVELS, type LevelDefinition } from '../world/level';
import type { SimEventType } from './events';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';

const FIELD: LevelDefinition = {
  ...LEVELS[0],
  id: 'dungeon-mechanics',
  width: 80,
  depth: 30,
  dayLength: 400,
  startingWorkers: 12,
  captain: { x: -30, z: 0 },
  kiln: { x: -34, z: 0 },
  obstacles: [],
  treasures: [{ id: 'far', x: 30, z: 0, weight: 2 }],
  pods: [],
  enemies: [],
  beacons: [{ x: 24, z: 0 }],
};

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

describe('carving a dungeon', () => {
  const rooms: Rect[] = [
    [-10, -4, -2, 4],
    [-2, -2, 6, 0],
    [6, -6, 12, 6],
  ];
  const rock = carve(24, 12, rooms);
  const solid = (x: number, z: number): boolean =>
    rock.some((box) => Math.abs(x - box.x) < box.w / 2 && Math.abs(z - box.z) < box.d / 2);

  it('leaves the rooms open and fills everything else', () => {
    expect(solid(-6, 0)).toBe(false);
    expect(solid(2, -1)).toBe(false);
    expect(solid(9, -5)).toBe(false);
    expect(solid(2, 3)).toBe(true);
    expect(solid(-11, 0)).toBe(true);
    expect(solid(0, -5)).toBe(true);
  });

  it('covers exactly the area that is not a room, without overlapping', () => {
    const open = rooms.reduce((sum, [x0, z0, x1, z1]) => sum + (x1 - x0) * (z1 - z0), 0);
    const filled = rock.reduce((sum, box) => sum + box.w * box.d, 0);
    expect(filled).toBe(24 * 12 - open);
  });

  it('turns corners into a centred box', () => {
    expect(rectBox([2, -4, 6, 2])).toEqual({ x: 4, z: -1, w: 4, d: 6 });
  });
});

describe('beacons', () => {
  it('are cold until the Warden walks up to them', () => {
    const sim = new Simulation(FIELD);
    expect(sim.beacons[0].lit).toBe(false);
    const seen = run(sim, 60 * 12, { moveX: 1 });
    expect(seen.get('beaconLit')).toBe(1);
    expect(sim.beacons[0].lit).toBe(true);
    expect(Math.abs(sim.captainTransform.x - 24)).toBeLessThan(BEACON.lightRange + 60);
  });

  it('take deliveries once lit, when they are the shorter walk', () => {
    const sim = new Simulation(FIELD);
    const [haul, carryable] = [...sim.carryables.entries()][0];
    const at = sim.transforms.require(haul);
    expect(destinationOf(sim, carryable, at).x).toBe(FIELD.kiln.x);
    sim.beacons[0].lit = true;
    expect(destinationOf(sim, carryable, at).x).toBe(24);
    // A haul right beside the Kiln still goes to the Kiln.
    expect(destinationOf(sim, carryable, { x: -30, z: 2 }).x).toBe(FIELD.kiln.x);
  });

  it('count a Sunshard delivered to them, and hatch pods where they were delivered', () => {
    const sim = new Simulation({
      ...FIELD,
      captain: { x: 25, z: 1.5 },
      pods: [{ x: 28, z: -3 }],
      // A second, immovable shard keeps the day from ending at the first delivery.
      treasures: [...FIELD.treasures, { id: 'anchor', x: 36, z: 12, weight: 40 }],
    });
    run(sim, 30);
    expect(sim.beacons[0].lit).toBe(true);
    const seen = run(sim, 60 * 20, { cursorX: 30, cursorZ: 0, throwHeld: true });
    expect(seen.get('deliver')).toBe(1);
    expect(sim.stats.treasuresCollected).toEqual(['far']);
    run(sim, 60 * 20, { cursorX: 28, cursorZ: -3, throwHeld: true });
    // The new Emberlings appear at the beacon, not back at the Kiln.
    const nearBeacon = [...sim.workers.entries()].filter(([entity]) => {
      const at = sim.transforms.require(entity);
      return Math.hypot(at.x - 24, at.z) < 8;
    });
    expect(sim.workers.size).toBe(14);
    expect(nearBeacon.length).toBe(14);
  });
});

describe('the Snuffer', () => {
  const lair: LevelDefinition = {
    ...FIELD,
    captain: { x: -30, z: 0 },
    treasures: [{ id: 'far', x: 36, z: 10, weight: 40 }],
    enemies: [{ x: 20, z: 0, kind: 'snuffer' }],
  };

  it('cannot be hurt in the dark, and is only armoured inside a beacon’s glow', () => {
    const sim = new Simulation(lair);
    const [entity, boss] = [...sim.enemies.entries()][0];
    expect(isShielded(sim, entity, boss)).toBe(true);
    expect(damageTaken(sim, entity, boss)).toBe(0);
    sim.beacons[0].lit = true;
    expect(isShielded(sim, entity, boss)).toBe(false);
    expect(damageTaken(sim, entity, boss)).toBe(ENEMY_SPECS.snuffer.armour);
    boss.state = 'recover';
    expect(damageTaken(sim, entity, boss)).toBe(1);
    // Out of the glow it is safe again, winded or not.
    sim.transforms.require(entity).x = 24 - BEACON.glow - 1;
    expect(damageTaken(sim, entity, boss)).toBe(0);
  });

  it('snuffs the beacons around it and calls Skitters when its health drops a third', () => {
    const sim = new Simulation(lair);
    const [, boss] = [...sim.enemies.entries()][0];
    sim.beacons[0].lit = true;
    boss.hp = boss.maxHp * 0.6;
    const seen = run(sim, 2);
    expect(seen.get('snuff')).toBe(1);
    expect(sim.beacons[0].lit).toBe(false);
    const skitters = [...sim.enemies.entries()].filter(([, enemy]) => enemy.kind === 'skitter');
    expect(skitters.length).toBe(2);
    expect(boss.phase).toBe(1);
  });
});

describe('The Undercroft', () => {
  const level = LEVELS[LEVELS.length - 1];

  it('is the last lesson, set in a cave, with beacons and a little door', () => {
    expect(level.id).toBe('the-undercroft');
    expect(level.theme).toBe('cave');
    expect(level.beacons?.length).toBe(3);
    expect(level.secret).toBeDefined();
  });

  it('keeps the far side of the chasm, the vault and the alcove shut at the start', () => {
    const sim = new Simulation(level);
    const reach = (x: number, z: number): boolean =>
      Number.isFinite(sim.kilnField.dist[sim.nav.cellIndexAt(x, z)]);
    expect(reach(6, 5)).toBe(true);
    expect(reach(22, 0)).toBe(false);
    expect(reach(46, 10)).toBe(false);
    expect(reach(-41, 27)).toBe(false);
    sim.dispose();
  });
});
