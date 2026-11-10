import type { Entity } from '../core/ecs';
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
  'idle' | 'follow' | 'thrown' | 'toCarry' | 'carrying' | 'toAttack' | 'attacking';

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
  mover: Mover;
}

export type CarryKind = 'treasure' | 'carcass';

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
}

export type EnemyState = 'roam' | 'windup' | 'recover';

export interface Enemy {
  hp: number;
  maxHp: number;
  radius: number;
  homeX: number;
  homeZ: number;
  state: EnemyState;
  timer: number;
  shake: number;
  wanderX: number;
  wanderZ: number;
  wanderTimer: number;
  /** Workers clinging to the enemy and damaging it. */
  latched: Entity[];
  mover: Mover;
}

export interface Kiln {
  /** Workers waiting to be produced. */
  queue: number;
  spawnTimer: number;
}
