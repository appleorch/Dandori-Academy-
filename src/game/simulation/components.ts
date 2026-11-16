import type { Entity } from '../core/ecs';
import type { EnemyKind, HazardKind } from '../enemies/enemyKinds';
import type { Box } from '../navigation/NavGrid';
import type { Mover } from '../navigation/steering';

/** Ground position (x, z), height above ground (y) and heading in radians (0 faces +z). */
export interface Transform {
  x: number;
  y: number;
  z: number;
  facing: number;
}

export interface Captain {
  hp: number;
  invuln: number;
  throwCooldown: number;
  /** Current whistle radius; 0 while not whistling. */
  whistleRadius: number;
}

export type WorkerState =
  'idle' | 'follow' | 'thrown' | 'rush' | 'toCarry' | 'carrying' | 'toAttack' | 'attacking';

export interface Worker {
  state: WorkerState;
  /** The haul or enemy this worker is assigned to, or NO_ENTITY. */
  target: Entity;
  stun: number;
  scan: number;
  /** Angle at which the worker clings to an enemy. */
  slot: number;
  throwFromX: number;
  throwFromZ: number;
  throwToX: number;
  throwToZ: number;
  throwTime: number;
  throwDuration: number;
  /** Where a charge order sent the worker, and how long it may keep running. */
  rushX: number;
  rushZ: number;
  rushTime: number;
  mover: Mover;
}

export type CarryKind = 'treasure' | 'carcass' | 'pod' | 'bloom';

export interface Carryable {
  id: string;
  kind: CarryKind;
  /** Carriers needed before it moves. */
  weight: number;
  maxCarriers: number;
  /** Score awarded on delivery. */
  value: number;
  /** New workers the Kiln produces on delivery. */
  workerYield: number;
  radius: number;
  /** Workers holding the object. */
  carriers: Entity[];
  /** Workers holding it or on their way; never exceeds maxCarriers. */
  claimed: Entity[];
  /** Simulation time at which it wilts unless lifted first; Infinity for most hauls. */
  wiltsAt: number;
}

export type EnemyState = 'roam' | 'windup' | 'charge' | 'recover';

export interface Enemy {
  kind: EnemyKind;
  /** Footprint of a gate, which blocks paths until broken; null for creatures. */
  shape: Box | null;
  /** The Lanternroot a root-knot belongs to, or NO_ENTITY. */
  parent: Entity;
  /** Late phases unlocked as health falls; 0 at full health. */
  phase: number;
  /** Charges made since it last recovered. */
  charges: number;
  /** Shard weight dropped on defeat, or 0. */
  drop: number;
  hp: number;
  maxHp: number;
  radius: number;
  homeX: number;
  homeZ: number;
  state: EnemyState;
  timer: number;
  shake: number;
  /** Unit direction of the current charge. */
  aimX: number;
  aimZ: number;
  /** Workers trampled by the current charge. */
  trampled: number;
  wanderX: number;
  wanderZ: number;
  wanderTimer: number;
  /** Workers clinging to the enemy and damaging it. */
  latched: Entity[];
  mover: Mover;
}

/**
 * Something about to hit the ground: a glob or pebble in flight, a falling drip,
 * or the ring under a rearing boss. It resolves when `time` reaches `duration`;
 * a negative `time` delays it.
 */
export interface Hazard {
  kind: HazardKind;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  time: number;
  duration: number;
  radius: number;
}

export interface Kiln {
  /** Workers waiting to be produced. */
  queue: number;
  spawnTimer: number;
}
