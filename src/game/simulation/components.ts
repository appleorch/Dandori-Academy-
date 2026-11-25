import type { Entity } from '../core/ecs';
import type { EnemyKind, HazardKind } from '../enemies/enemyKinds';
import type { Box } from '../navigation/NavGrid';
import type { Mover } from '../navigation/steering';
import type { SproutKind } from '../workers/sprouts';

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
  /**
   * Set when the chosen kind ran out mid-volley and another took over: no more throws until
   * the throw is released, so a volley meant for Dewlings never carries on into the water
   * with someone who would drown there.
   */
  throwLatched: boolean;
  /** Current whistle radius; 0 while not whistling. */
  whistleRadius: number;
}

export type WorkerState =
  | 'idle'
  | 'follow'
  | 'thrown'
  | 'rush'
  | 'toCarry'
  | 'carrying'
  | 'toAttack'
  | 'attacking'
  /** Story only: a sprout in the ground by the Kiln, waiting for the Warden to pluck it. */
  | 'planted';

/** A danger a worker can be saved from by a whistle in time: on fire, or out of its depth. */
export type Peril = 'fire' | 'water';

export interface Worker {
  kind: SproutKind;
  /** Days of growth (see `stageOf`); always 0 outside the story. */
  growth: number;
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
  /** What is about to finish it off, and the seconds left to whistle it out; null when safe. */
  peril: Peril | null;
  perilTime: number;
  mover: Mover;
}

export type CarryKind = 'treasure' | 'carcass' | 'pod' | 'bloom' | 'sap' | 'log';

/** What a treasure is made of: plain Sunshard, fragile Dewglass, or a crawling Lodestone. */
export type ShardVariant = 'shard' | 'dewglass' | 'lodestone';

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
  variant: ShardVariant;
  /** Rune shared with its twin: both home within a few seconds earns a bonus. */
  twin: string | null;
  /** Dewglass only: cracked once its moving crew broke up. */
  cracked: boolean;
  /** Whether it was moving last step, to notice a crew breaking up. */
  moving: boolean;
  /** Speed with exactly `weight` carriers, and what a full crew adds on top. */
  baseSpeed: number;
  bonusSpeed: number;
  /** Span-logs: the bridge site it is heading for, or -1 for none chosen yet. */
  dest: number;
  /** Seed pods: the kind of Sproutling it grows into; null for hauls that grow the crew's own kind. */
  seed: SproutKind | null;
  /** Carcasses: the beast it was. */
  from: EnemyKind | null;
}

export type EnemyState = 'roam' | 'windup' | 'charge' | 'recover';

export interface Enemy {
  kind: EnemyKind;
  /** Footprint of a gate, which blocks paths until broken; null for creatures. */
  shape: Box | null;
  /** The Lanternroot a root-knot belongs to, or NO_ENTITY. */
  parent: Entity;
  /**
   * Its place in the lesson's list of enemies (or of gates, for a gate), or -1 for anything
   * that arrived during the day. The story uses it to remember what was beaten.
   */
  spawn: number;
  /** Late phases unlocked as health falls; 0 at full health. */
  phase: number;
  /** Charges made since it last recovered. */
  charges: number;
  /** Shard weight dropped on defeat, or 0. */
  drop: number;
  /** What a dug-up mound leaves besides a shard: a pod, a Sapdrop, or nothing. */
  reveals: 'pod' | 'sap' | null;
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
  /** True while it has picked prey and is hunting or attacking; shown as an alert icon. */
  alert: boolean;
  /** Where its current attack is aimed, for the ground warning. */
  targetX: number;
  targetZ: number;
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
  /** Sproutlings waiting to be grown, in order. */
  queue: SproutKind[];
  spawnTimer: number;
}
