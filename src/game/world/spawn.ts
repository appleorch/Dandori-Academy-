import { POD, SHARD_VALUE_PER_WEIGHT } from '../core/config';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import { ENEMY, ENEMY_SPECS, type EnemyKind } from '../enemies/enemyKinds';
import type { Point } from '../navigation/NavGrid';
import { createMover } from '../navigation/steering';
import type { WorkerState } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import type { TreasureSpawn } from './level';

const CARCASS_RADIUS = 0.9;

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
    rushX: 0,
    rushZ: 0,
    rushTime: 0,
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

/** An Emberpod: one carrier can take it home, where it hatches into new workers. */
export function spawnPod(sim: Simulation, at: Point, index: number): Entity {
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x: at.x, y: 0, z: at.z, facing: 0 });
  sim.carryables.set(entity, {
    id: `pod-${index}`,
    kind: 'pod',
    value: 0,
    carriers: [],
    claimed: [],
    ...POD,
  });
  sim.entityVersion++;
  return entity;
}

/** What a defeated enemy leaves behind. Hauling it home grows the workforce. */
export function spawnCarcass(sim: Simulation, x: number, z: number, kind: EnemyKind): Entity {
  const spec = ENEMY_SPECS[kind];
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x, y: 0, z, facing: 0 });
  sim.carryables.set(entity, {
    id: `carcass-${entity}`,
    kind: 'carcass',
    weight: spec.carcassWeight,
    maxCarriers: spec.carcassWeight * 2,
    value: 0,
    workerYield: spec.carcassYield,
    radius: CARCASS_RADIUS,
    carriers: [],
    claimed: [],
  });
  sim.entityVersion++;
  return entity;
}

export function spawnEnemy(sim: Simulation, x: number, z: number, kind: EnemyKind): Entity {
  const spec = ENEMY_SPECS[kind];
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x, y: 0, z, facing: 0 });
  sim.enemies.set(entity, {
    kind,
    hp: spec.hp,
    maxHp: spec.hp,
    radius: spec.radius,
    homeX: x,
    homeZ: z,
    state: 'roam',
    timer: 0,
    shake: 0,
    aimX: 0,
    aimZ: 1,
    trampled: 0,
    wanderX: x,
    wanderZ: z,
    wanderTimer: 0,
    latched: [],
    mover: createMover(),
  });
  sim.entityVersion++;
  return entity;
}

/** Launches a glob from one point to another. */
export function spawnHazard(sim: Simulation, from: Point, to: Point): Entity {
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x: from.x, y: 1, z: from.z, facing: 0 });
  sim.hazards.set(entity, {
    fromX: from.x,
    fromZ: from.z,
    toX: to.x,
    toZ: to.z,
    time: 0,
    duration: ENEMY.spitFlight,
    radius: ENEMY.splashRadius,
  });
  sim.entityVersion++;
  return entity;
}
