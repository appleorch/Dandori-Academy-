import {
  CARRY,
  DEWGLASS_BONUS_PER_WEIGHT,
  LODESTONE,
  LOG,
  POD,
  SAP,
  SHARD_VALUE_PER_WEIGHT,
} from '../core/config';
import { HARD } from '../core/difficulty';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import { ENEMY_SPECS, HAZARDS, type EnemyKind, type HazardKind } from '../enemies/enemyKinds';
import type { Box, Point } from '../navigation/NavGrid';
import { createMover } from '../navigation/steering';
import type { Carryable, WorkerState } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { mostCommon, type SproutKind } from '../workers/sprouts';
import type { BloomSpawn, TreasureSpawn } from './level';

const CARCASS_RADIUS = 0.9;
/** Score per point of weight for a Glowcap bloom. */
export const BLOOM_VALUE_PER_WEIGHT = 150;

export function spawnWorker(
  sim: Simulation,
  x: number,
  z: number,
  state: WorkerState,
  kind: SproutKind = 'ember',
): Entity {
  sim.knownKinds.add(kind);
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x, y: 0, z, facing: 0 });
  sim.workers.set(entity, {
    kind,
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
    peril: null,
    perilTime: 0,
    mover: createMover(),
  });
  return entity;
}

/** Registers a haul, filling in the defaults most hauls share. */
function addCarryable(
  sim: Simulation,
  at: Point,
  fields: Pick<Carryable, 'id' | 'kind' | 'weight' | 'maxCarriers' | 'radius'> &
    Partial<Omit<Carryable, 'seed'>> & { seed?: SproutKind },
): Entity {
  const entity = sim.ecs.create();
  sim.transforms.set(entity, { x: at.x, y: 0, z: at.z, facing: 0 });
  sim.carryables.set(entity, {
    value: 0,
    workerYield: 0,
    carriers: [],
    claimed: [],
    wiltsAt: Infinity,
    variant: 'shard',
    twin: null,
    cracked: false,
    moving: false,
    baseSpeed: CARRY.baseSpeed,
    bonusSpeed: CARRY.bonusSpeed,
    dest: -1,
    seed: null,
    ...fields,
  });
  sim.entityVersion++;
  return entity;
}

/** A Sunshard, Dewglass or Lodestone. Heavier ones are bigger, worth more and need more carriers. */
export function spawnTreasure(sim: Simulation, spawn: TreasureSpawn): Entity {
  const variant = spawn.variant ?? 'shard';
  const lodestone = variant === 'lodestone';
  return addCarryable(sim, spawn, {
    id: spawn.id,
    kind: 'treasure',
    variant,
    twin: spawn.twin ?? null,
    weight: spawn.weight,
    maxCarriers: spawn.weight * (lodestone ? LODESTONE.crew : 2),
    value:
      spawn.weight *
      (SHARD_VALUE_PER_WEIGHT + (variant === 'dewglass' ? DEWGLASS_BONUS_PER_WEIGHT : 0)),
    radius: 0.5 + 0.1 * spawn.weight,
    baseSpeed: lodestone ? LODESTONE.baseSpeed : CARRY.baseSpeed,
    bonusSpeed: lodestone ? LODESTONE.bonusSpeed : CARRY.bonusSpeed,
  });
}

/**
 * A seed pod: one carrier can take it home, where it grows into Sproutlings of its own kind,
 * or of the lesson's most common kind when it does not say.
 */
export function spawnPod(sim: Simulation, at: Point, index: number, kind?: SproutKind): Entity {
  const seed = kind ?? mostCommon(sim.level.squad ?? { ember: 1 });
  return addCarryable(sim, at, { id: `pod-${index}`, kind: 'pod', ...POD, seed });
}

/** A Sapdrop: delivered to the Kiln, it speeds every haul up for a while. */
export function spawnSap(sim: Simulation, at: Point, index: number): Entity {
  return addCarryable(sim, at, {
    id: `sap-${index}`,
    kind: 'sap',
    weight: SAP.weight,
    maxCarriers: SAP.maxCarriers,
    radius: SAP.radius,
  });
}

/** A Span-log, carried to a bridge site's bank rather than the Kiln. */
export function spawnLog(sim: Simulation, at: Point, index: number): Entity {
  return addCarryable(sim, at, { id: `log-${index}`, kind: 'log', ...LOG });
}

/** What a defeated enemy leaves behind. Hauling it home grows the workforce. */
export function spawnCarcass(sim: Simulation, x: number, z: number, kind: EnemyKind): Entity {
  const spec = ENEMY_SPECS[kind];
  return addCarryable(
    sim,
    { x, z },
    {
      id: `carcass-${sim.ecs.peekNext()}`,
      kind: 'carcass',
      weight: spec.carcassWeight,
      maxCarriers: spec.carcassWeight * 2,
      workerYield: spec.carcassYield,
      radius: CARCASS_RADIUS,
    },
  );
}

interface EnemyOptions {
  /** Health to use instead of the kind's default. */
  hp?: number;
  shape?: Box;
  parent?: Entity;
  /** Weight of the Sunshard it drops on defeat. */
  drop?: number;
  reveals?: 'pod' | 'sap';
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
    reveals: options.reveals ?? null,
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
    alert: false,
    targetX: x,
    targetZ: z,
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
  return addCarryable(sim, bloom, {
    id: `bloom-${index}`,
    kind: 'bloom',
    weight: bloom.weight,
    maxCarriers: bloom.weight * 2,
    value: bloom.weight * BLOOM_VALUE_PER_WEIGHT,
    radius: 0.5 + 0.1 * bloom.weight,
    wiltsAt: sim.elapsed + bloom.lifetime,
  });
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
