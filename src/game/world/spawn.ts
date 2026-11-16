import { POD, SHARD_VALUE_PER_WEIGHT } from '../core/config';
import { HARD } from '../core/difficulty';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import { ENEMY_SPECS, HAZARDS, type EnemyKind, type HazardKind } from '../enemies/enemyKinds';
import type { Box, Point } from '../navigation/NavGrid';
import { createMover } from '../navigation/steering';
import type { WorkerState } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import type { BloomSpawn, TreasureSpawn } from './level';

const CARCASS_RADIUS = 0.9;
/** Score per point of weight for a Glowcap bloom. */
export const BLOOM_VALUE_PER_WEIGHT = 150;

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
    wiltsAt: Infinity,
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
    wiltsAt: Infinity,
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
    wiltsAt: Infinity,
  });
  sim.entityVersion++;
  return entity;
}

interface EnemyOptions {
  /** Health to use instead of the kind's default. */
  hp?: number;
  shape?: Box;
  parent?: Entity;
  /** Weight of the Sunshard it drops on defeat. */
  drop?: number;
}

export function spawnEnemy(
  sim: Simulation,
  x: number,
  z: number,
  kind: EnemyKind,
  options: EnemyOptions = {},
): Entity {
  const spec = ENEMY_SPECS[kind];
  const hp = options.hp ?? spec.hp * (sim.hard ? HARD.enemyHp : 1);
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x, y: 0, z, facing: 0 });
  sim.enemies.set(entity, {
    kind,
    shape: options.shape ?? null,
    parent: options.parent ?? NO_ENTITY,
    phase: 0,
    charges: 0,
    drop: options.drop ?? 0,
    hp,
    maxHp: hp,
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

/** A Glowcap: a bonus haul worth more than its weight in score, which wilts if left too long. */
export function spawnBloom(sim: Simulation, bloom: BloomSpawn, index: number): Entity {
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x: bloom.x, y: 0, z: bloom.z, facing: 0 });
  sim.carryables.set(entity, {
    id: `bloom-${index}`,
    kind: 'bloom',
    weight: bloom.weight,
    maxCarriers: bloom.weight * 2,
    value: bloom.weight * BLOOM_VALUE_PER_WEIGHT,
    workerYield: 0,
    radius: 0.5 + 0.1 * bloom.weight,
    carriers: [],
    claimed: [],
    wiltsAt: sim.elapsed + bloom.lifetime,
  });
  sim.entityVersion++;
  return entity;
}

/** Starts a hazard heading for `to`. A negative `delay` holds it back before it starts. */
export function spawnHazard(
  sim: Simulation,
  kind: HazardKind,
  from: Point,
  to: Point,
  duration: number = HAZARDS[kind].flight,
  delay = 0,
): Entity {
  const spec = HAZARDS[kind];
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x: from.x, y: spec.drop || 1, z: from.z, facing: 0 });
  sim.hazards.set(entity, {
    kind,
    fromX: from.x,
    fromZ: from.z,
    toX: to.x,
    toZ: to.z,
    time: -delay,
    duration,
    radius: spec.radius,
  });
  sim.entityVersion++;
  return entity;
}
