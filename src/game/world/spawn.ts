import { SHARD_VALUE_PER_WEIGHT } from '../core/config';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import { createMover } from '../navigation/steering';
import type { WorkerState } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import type { TreasureSpawn } from './level';

const ENEMY_HP = 80;
const ENEMY_RADIUS = 1.1;
const CARCASS = { weight: 3, maxCarriers: 6, workerYield: 4, radius: 0.9 } as const;

export function spawnWorker(sim: Simulation, x: number, z: number, state: WorkerState): Entity {
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x, y: 0, z, facing: 0 });
  sim.workers.set(entity, {
    state,
    target: NO_ENTITY,
    stun: 0,
    scan: 0,
    slot: 0,
    throwFromX: 0,
    throwFromZ: 0,
    throwToX: 0,
    throwToZ: 0,
    throwTime: 0,
    throwDuration: 0,
    mover: createMover(),
  });
  return entity;
}

/** A Sunshard. Heavier shards are bigger, worth more and need more carriers. */
export function spawnTreasure(sim: Simulation, spawn: TreasureSpawn): Entity {
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x: spawn.x, y: 0, z: spawn.z, facing: 0 });
  sim.carryables.set(entity, {
    id: spawn.id,
    kind: 'treasure',
    weight: spawn.weight,
    maxCarriers: spawn.weight * 2,
    value: spawn.weight * SHARD_VALUE_PER_WEIGHT,
    workerYield: 0,
    radius: 0.5 + 0.1 * spawn.weight,
    carriers: [],
    claimed: [],
  });
  sim.entityVersion++;
  return entity;
}

/** What a defeated enemy leaves behind. Hauling it home grows the workforce. */
export function spawnCarcass(sim: Simulation, x: number, z: number): Entity {
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x, y: 0, z, facing: 0 });
  sim.carryables.set(entity, {
    id: `carcass-${entity}`,
    kind: 'carcass',
    value: 0,
    carriers: [],
    claimed: [],
    ...CARCASS,
  });
  sim.entityVersion++;
  return entity;
}

export function spawnEnemy(sim: Simulation, x: number, z: number): Entity {
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x, y: 0, z, facing: 0 });
  sim.enemies.set(entity, {
    hp: ENEMY_HP,
    maxHp: ENEMY_HP,
    radius: ENEMY_RADIUS,
    homeX: x,
    homeZ: z,
    state: 'roam',
    timer: 0,
    shake: 0,
    wanderX: x,
    wanderZ: z,
    wanderTimer: 0,
    latched: [],
    mover: createMover(),
  });
  sim.entityVersion++;
  return entity;
}
