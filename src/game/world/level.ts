import { SHARD_VALUE_PER_WEIGHT } from '../core/config';
import { HARD, type Difficulty } from '../core/difficulty';
import { POINTS_PER_SECOND, POINTS_PER_WORKER } from '../dandori/scoring';
import type { EnemyKind } from '../enemies/enemyKinds';
import type { ShardVariant } from '../simulation/components';
import type { Box, Point } from '../navigation/NavGrid';
import { carve, rectBox, type Rect } from './carve';

/** The look and sound of a lesson's setting. It changes nothing about the rules. */
export type LevelTheme = 'meadow' | 'autumn' | 'marsh' | 'dusk' | 'cave';

export interface TreasureSpawn extends Point {
  id: string;
  weight: number;
  /** Plain Sunshard by default. */
  variant?: ShardVariant;
  /** Rune shared with exactly one other treasure: both home within 10 s earns a bonus. */
  twin?: string;
}

/** A river crossing waiting to be built: a water box that becomes walkable once enough Span-logs arrive at its bank. */
export interface BridgeSpawn extends Box {
  bank: Point;
  needs: number;
}

export interface EnemySpawn extends Point {
  kind: EnemyKind;
  /** Weight of the Sunshard it drops when beaten. It counts towards the lesson's total. */
  drop?: number;
  /** Mounds only: something else buried inside. */
  reveals?: 'pod' | 'sap';
}

/** A bramble wall across a path, with the health it takes to break. */
export interface GateSpawn extends Box {
  hp: number;
}

/** A spot where a dewdrop falls every `period` seconds, starting `offset` seconds in. */
export interface DripSpawn extends Point {
  period: number;
  offset: number;
}

/** A Glowcap that appears `at` seconds into the day and wilts `lifetime` seconds later. */
export interface BloomSpawn extends Point {
  weight: number;
  at: number;
  lifetime: number;
}

/** A Lanternroot boss, the three knots that shield it, and the shard it drops. */
export interface RootSpawn extends Point {
  knots: readonly Point[];
  drop: number;
}

export interface LevelDefinition {
  id: string;
  /** 1-based stage number stored in the save file. */
  stage: number;
  name: string;
  /** One or two sentences shown on the lesson list: what this lesson teaches. */
  brief: string;
  width: number;
  depth: number;
  dayLength: number;
  /**
   * Seconds into the day by which every Sunshard must be home, with no Emberlings
   * lost, to earn Platinum. Set about 10% slower than the greedy test bot (30% on the
   * first three lessons, 20% on boss fights, which vary more), so a planned day beats it
   * and a sloppy one does not. `npm run balance` measures every lesson into BALANCE.md.
   */
  platinumTime: number;
  /** Score that earns Platinum. Derived from `platinumTime`; see `withPar`. */
  parScore: number;
  /** Normal, or Hard with the modifiers in core/difficulty. */
  difficulty: Difficulty;
  seed: number;
  startingWorkers: number;
  captain: Point;
  kiln: Point;
  obstacles: Box[];
  treasures: TreasureSpawn[];
  /** Emberpods: light hauls that hatch into new workers. */
  pods: Point[];
  enemies: EnemySpawn[];
  gates?: GateSpawn[];
  drips?: DripSpawn[];
  blooms?: BloomSpawn[];
  /** A Lanternroot boss and its knots. */
  roots?: RootSpawn[];
  /** Water: blocks walking and hauling, never throwing. */
  water?: Box[];
  bridges?: BridgeSpawn[];
  /** Span-logs, carried to the nearest unbuilt bridge's bank. */
  logs?: Point[];
  /** Sapdrops: delivered to the Kiln, they speed up every haul for a while. */
  saps?: Point[];
  /** Beacons: cold until the Warden reaches them, then a second place to deliver hauls. */
  beacons?: Point[];
  theme: LevelTheme;
  /** A small door in the rock. Something is going on behind it. */
  secret?: Point;
}

const MANY_HANDS: LevelSpec = {
  id: 'many-hands',
  stage: 1,
  name: 'Many Hands',
  brief:
    'Five Sunshards, ten Emberlings, no danger. Give every shard exactly the carriers it needs and nobody waits around.',
  width: 40,
  depth: 26,
  dayLength: 60,
  platinumTime: 25,
  seed: 1,
  startingWorkers: 10,
  captain: { x: -11, z: 1 },
  kiln: { x: -15, z: 0 },
  obstacles: [],
  treasures: [
    { id: 'shard-1', x: -6, z: -7, weight: 1 },
    { id: 'shard-2', x: -6, z: 7, weight: 1 },
    { id: 'shard-3', x: 0, z: 0, weight: 2 },
    { id: 'shard-4', x: 6, z: -6, weight: 3 },
    { id: 'shard-5', x: 8, z: 6, weight: 3 },
  ],
  pods: [],
  enemies: [],
};

const OVER_THE_WALL: LevelSpec = {
  id: 'over-the-wall',
  stage: 2,
  name: 'Over the Wall',
  brief:
    'Emberlings fly over walls; Sunshards have to walk around them. Throw across to start the far jobs early.',
  width: 50,
  depth: 30,
  dayLength: 100,
  platinumTime: 70,
  seed: 2,
  startingWorkers: 12,
  captain: { x: -17, z: 2 },
  kiln: { x: -20, z: 0 },
  obstacles: [
    { x: -4, z: -5, w: 2, d: 20 },
    { x: 10, z: 5, w: 2, d: 20 },
  ],
  treasures: [
    { id: 'shard-1', x: -10, z: -8, weight: 2 },
    { id: 'shard-2', x: 0, z: -8, weight: 3 },
    { id: 'shard-3', x: 3, z: 8, weight: 2 },
    { id: 'shard-4', x: 16, z: 6, weight: 4 },
    { id: 'shard-5', x: 18, z: -10, weight: 1 },
  ],
  pods: [
    { x: -12, z: 6 },
    { x: 6, z: -2 },
  ],
  enemies: [],
};

const THE_GUARD: LevelSpec = {
  id: 'the-guard',
  stage: 3,
  name: 'The Guard',
  brief:
    'A Mossback holds the only gap. Throw a full squad onto its back, and whistle them clear when it shakes or it eats the fallen. Its carcass is worth four more Emberlings.',
  width: 50,
  depth: 30,
  dayLength: 120,
  platinumTime: 65,
  seed: 3,
  startingWorkers: 9,
  captain: { x: -17, z: 2 },
  kiln: { x: -20, z: 0 },
  obstacles: [
    { x: 0, z: -9.5, w: 4, d: 11 },
    { x: 0, z: 9.5, w: 4, d: 11 },
  ],
  treasures: [
    { id: 'shard-1', x: -10, z: 9, weight: 2 },
    { id: 'shard-2', x: -10, z: -9, weight: 3 },
    { id: 'shard-3', x: 16, z: 9, weight: 2 },
    { id: 'shard-4', x: 15, z: -2, weight: 10 },
  ],
  pods: [{ x: -14, z: -3 }],
  enemies: [{ x: 4, z: 0, kind: 'mossback' }],
};

const FIRST_LIGHT: LevelSpec = {
  id: 'first-light',
  stage: 4,
  name: 'First Light',
  brief:
    'Three lanes and three guards, one of them a Bogspitter that lobs globs from afar: keep moving when a ring appears on the ground.',
  width: 60,
  depth: 40,
  dayLength: 180,
  platinumTime: 105,
  seed: 4,
  startingWorkers: 10,
  captain: { x: -15, z: 2 },
  kiln: { x: -19, z: 0 },
  obstacles: [
    { x: -6, z: -9, w: 2, d: 22 },
    { x: 8, z: 9, w: 2, d: 22 },
    { x: 0, z: 11, w: 4, d: 4 },
    { x: 18, z: -11, w: 6, d: 3 },
  ],
  treasures: [
    { id: 'shard-1', x: -13, z: -9, weight: 1 },
    { id: 'shard-2', x: -11, z: 13, weight: 2 },
    { id: 'shard-3', x: 0, z: -13, weight: 3 },
    { id: 'shard-4', x: 3, z: 3, weight: 4 },
    { id: 'shard-5', x: 17, z: 13, weight: 5 },
    { id: 'shard-6', x: 24, z: -4, weight: 8 },
  ],
  pods: [
    { x: -12, z: 4 },
    { x: 2, z: -6 },
  ],
  enemies: [
    { x: -1, z: 5, kind: 'mossback' },
    { x: 14, z: -6, kind: 'mossback' },
    { x: 23, z: 8, kind: 'spitter' },
  ],
};

const LONG_HAUL: LevelSpec = {
  id: 'long-haul',
  stage: 5,
  name: 'Long Haul',
  brief:
    'A wide field and far-off shards. The walk home is the slow part, so start the distant hauls first and grow the squad on the way.',
  width: 80,
  depth: 50,
  dayLength: 360,
  platinumTime: 270,
  seed: 5,
  startingWorkers: 15,
  captain: { x: -29, z: 2 },
  kiln: { x: -33, z: 0 },
  obstacles: [
    { x: -14, z: -10, w: 2, d: 30 },
    { x: 6, z: 10, w: 2, d: 30 },
    { x: 26, z: -10, w: 2, d: 30 },
    { x: -4, z: 15, w: 5, d: 5 },
    { x: 16, z: -15, w: 5, d: 5 },
  ],
  treasures: [
    { id: 'shard-1', x: -24, z: -12, weight: 1 },
    { id: 'shard-2', x: -22, z: 14, weight: 2 },
    { id: 'shard-3', x: -6, z: -14, weight: 3 },
    { id: 'shard-4', x: 0, z: 2, weight: 4 },
    { id: 'shard-5', x: 13, z: 17, weight: 5 },
    { id: 'shard-6', x: 18, z: -20, weight: 6 },
    { id: 'shard-7', x: 33, z: -10, weight: 8 },
    { id: 'shard-8', x: 34, z: 17, weight: 10 },
  ],
  pods: [
    { x: -24, z: 6 },
    { x: -2, z: -6 },
    { x: 14, z: 6 },
  ],
  enemies: [
    { x: -8, z: 9, kind: 'mossback' },
    { x: 12, z: -5, kind: 'ramhorn' },
    { x: 20, z: 11, kind: 'mossback' },
    { x: 32, z: 6, kind: 'spitter' },
  ],
};

const DIVIDE_AND_CONQUER: LevelSpec = {
  id: 'divide-and-conquer',
  stage: 6,
  name: 'Divide and Conquer',
  brief:
    'Seven shards scattered over a wide, quiet field. Split your Emberlings across several jobs at once instead of finishing one at a time.',
  width: 64,
  depth: 36,
  dayLength: 140,
  platinumTime: 85,
  seed: 6,
  startingWorkers: 14,
  captain: { x: -26, z: 2 },
  kiln: { x: -29, z: 0 },
  obstacles: [
    { x: -8, z: -6, w: 4, d: 4 },
    { x: 4, z: 8, w: 4, d: 4 },
    { x: 16, z: -8, w: 4, d: 4 },
  ],
  treasures: [
    { id: 'shard-1', x: -14, z: 12, weight: 1 },
    { id: 'shard-2', x: -12, z: -13, weight: 2 },
    { id: 'shard-3', x: 0, z: -2, weight: 2 },
    { id: 'shard-4', x: 8, z: 14, weight: 3 },
    { id: 'shard-5', x: 12, z: 0, weight: 3 },
    { id: 'shard-6', x: 24, z: -12, weight: 4 },
    { id: 'shard-7', x: 26, z: 10, weight: 5 },
  ],
  pods: [
    { x: -18, z: -6 },
    { x: -2, z: 10 },
    { x: 14, z: 8 },
  ],
  enemies: [],
};

const THE_GAUNTLET: LevelSpec = {
  id: 'the-gauntlet',
  stage: 7,
  name: 'The Gauntlet',
  brief:
    'A Ramhorn guards the corridor. Step out of its charge, then pile on while it stands winded. Keep the hauls moving through afterwards.',
  width: 80,
  depth: 30,
  dayLength: 220,
  platinumTime: 125,
  seed: 7,
  startingWorkers: 14,
  captain: { x: -33, z: 2 },
  kiln: { x: -36, z: 0 },
  obstacles: [
    { x: 12, z: -9.5, w: 40, d: 11 },
    { x: 12, z: 9.5, w: 40, d: 11 },
  ],
  treasures: [
    { id: 'shard-1', x: -22, z: -10, weight: 2 },
    { id: 'shard-2', x: -20, z: 10, weight: 3 },
    { id: 'shard-3', x: -14, z: 8, weight: 2 },
    { id: 'shard-4', x: 35, z: 6, weight: 4 },
    { id: 'shard-5', x: 36, z: -6, weight: 6 },
  ],
  pods: [
    { x: -24, z: 0 },
    { x: -12, z: -10 },
  ],
  enemies: [
    { x: 4, z: 0, kind: 'ramhorn' },
    { x: 20, z: 0, kind: 'mossback' },
  ],
};

const GROWING_PAINS: LevelSpec = {
  id: 'growing-pains',
  stage: 8,
  name: 'Growing Pains',
  brief:
    'Only six Emberlings and the shards are heavy. Every Mossback you beat and haul home grows the squad, so fight early to afford the big jobs.',
  width: 70,
  depth: 40,
  dayLength: 400,
  platinumTime: 160,
  seed: 8,
  startingWorkers: 6,
  captain: { x: -29, z: 2 },
  kiln: { x: -32, z: 0 },
  obstacles: [
    { x: -12, z: 10, w: 2, d: 20 },
    { x: 8, z: -10, w: 2, d: 20 },
    { x: 24, z: 12, w: 8, d: 3 },
  ],
  treasures: [
    { id: 'shard-1', x: -20, z: -12, weight: 2 },
    { id: 'shard-2', x: -4, z: 14, weight: 4 },
    { id: 'shard-3', x: 0, z: -2, weight: 6 },
    { id: 'shard-4', x: 18, z: -14, weight: 8 },
    { id: 'shard-5', x: 30, z: 6, weight: 10 },
  ],
  pods: [
    { x: -24, z: -4 },
    { x: -22, z: 12 },
  ],
  enemies: [
    { x: -18, z: 8, kind: 'mossback' },
    { x: -2, z: -8, kind: 'mossback' },
    { x: 16, z: 6, kind: 'spitter' },
    { x: 28, z: -6, kind: 'mossback' },
  ],
};

const SWITCHBACKS: LevelSpec = {
  id: 'switchbacks',
  stage: 9,
  name: 'Switchbacks',
  brief:
    'Three long walls force every haul to zigzag home. Throw across the walls, then keep the crowd close to the route the shards must take.',
  width: 80,
  depth: 50,
  dayLength: 390,
  platinumTime: 225,
  seed: 9,
  startingWorkers: 16,
  captain: { x: -35, z: 2 },
  kiln: { x: -38, z: 0 },
  obstacles: [
    { x: -15, z: -7.5, w: 2, d: 35 },
    { x: 0, z: 7.5, w: 2, d: 35 },
    { x: 15, z: -7.5, w: 2, d: 35 },
  ],
  treasures: [
    { id: 'shard-1', x: -25, z: 15, weight: 2 },
    { id: 'shard-2', x: -8, z: -15, weight: 3 },
    { id: 'shard-3', x: 8, z: 15, weight: 4 },
    { id: 'shard-4', x: 25, z: -15, weight: 5 },
    { id: 'shard-5', x: 33, z: 10, weight: 8 },
    { id: 'shard-6', x: 30, z: -2, weight: 3 },
  ],
  pods: [
    { x: -28, z: -10 },
    { x: -6, z: -2 },
    { x: 8, z: -12 },
  ],
  enemies: [
    { x: 22, z: 12, kind: 'spitter' },
    { x: -8, z: 6, kind: 'mossback' },
  ],
};

const FINAL_EXAM: LevelSpec = {
  id: 'final-exam',
  stage: 10,
  name: 'Final Exam',
  brief:
    'Ten shards, six Mossbacks and walls across the whole field. Plan the order, keep every Emberling working, and lose as few as you can.',
  width: 90,
  depth: 56,
  dayLength: 560,
  platinumTime: 345,
  seed: 10,
  startingWorkers: 20,
  captain: { x: -40, z: 2 },
  kiln: { x: -43, z: 0 },
  obstacles: [
    { x: -22, z: -12, w: 2, d: 32 },
    { x: -4, z: 14, w: 2, d: 32 },
    { x: 14, z: -12, w: 2, d: 32 },
    { x: 32, z: 14, w: 2, d: 32 },
    { x: 0, z: 0, w: 5, d: 5 },
    { x: 24, z: -20, w: 6, d: 3 },
  ],
  treasures: [
    { id: 'shard-1', x: -34, z: -18, weight: 2 },
    { id: 'shard-2', x: -30, z: 18, weight: 3 },
    { id: 'shard-3', x: -12, z: -4, weight: 4 },
    { id: 'shard-4', x: -10, z: 22, weight: 5 },
    { id: 'shard-5', x: 5, z: -20, weight: 6 },
    { id: 'shard-6', x: 8, z: 8, weight: 3 },
    { id: 'shard-7', x: 24, z: 4, weight: 8 },
    { id: 'shard-8', x: 26, z: -10, weight: 5 },
    { id: 'shard-9', x: 40, z: 20, weight: 10 },
    { id: 'shard-10', x: 40, z: -16, weight: 12 },
  ],
  pods: [
    { x: -34, z: 8 },
    { x: -28, z: -8 },
    { x: -12, z: 10 },
    { x: 6, z: -10 },
  ],
  enemies: [
    { x: -26, z: 6, kind: 'mossback' },
    { x: -14, z: -10, kind: 'ramhorn' },
    { x: 2, z: 4, kind: 'spitter' },
    { x: 18, z: -6, kind: 'mossback' },
    { x: 28, z: 10, kind: 'ramhorn' },
    { x: 38, z: 2, kind: 'spitter' },
  ],
};

const BRAMBLE_GATE: LevelSpec = {
  id: 'bramble-gate',
  stage: 11,
  name: 'Bramble Gate',
  brief:
    'Bramble gates seal the way home. Shards behind one cannot move until it falls, so break the gates early and let the hauls roll through.',
  width: 60,
  depth: 34,
  dayLength: 260,
  platinumTime: 130,
  seed: 11,
  startingWorkers: 10,
  captain: { x: -23, z: 2 },
  kiln: { x: -26, z: 0 },
  obstacles: [
    { x: 0, z: -10, w: 2, d: 14 },
    { x: 0, z: 10, w: 2, d: 14 },
    { x: 16, z: -6.5, w: 2, d: 21 },
    { x: 16, z: 14, w: 2, d: 6 },
  ],
  gates: [
    { x: 0, z: 0, w: 2, d: 6, hp: 120 },
    { x: 16, z: 7.5, w: 2, d: 7, hp: 160 },
  ],
  treasures: [
    { id: 'shard-1', x: -12, z: -10, weight: 2 },
    { id: 'shard-2', x: -10, z: 11, weight: 1 },
    { id: 'shard-3', x: 8, z: -10, weight: 3 },
    { id: 'shard-4', x: 7, z: 10, weight: 4 },
    { id: 'shard-5', x: 24, z: -8, weight: 6 },
    { id: 'shard-6', x: 25, z: 9, weight: 5 },
  ],
  pods: [
    { x: -16, z: 6 },
    { x: 6, z: 14 },
    { x: 22, z: -14 },
  ],
  enemies: [
    { x: 8, z: 0, kind: 'mossback' },
    { x: 25, z: 0, kind: 'spitter' },
  ],
};

const DRIP_LINE: LevelSpec = {
  id: 'drip-line',
  stage: 12,
  name: 'Drip Line',
  brief:
    'Dewdrops fall on the damp patches and knock carriers off their haul. Overstaff the hauls that must cross wet ground so they cross quickly.',
  width: 64,
  depth: 36,
  dayLength: 300,
  platinumTime: 140,
  seed: 12,
  startingWorkers: 12,
  captain: { x: -25, z: 2 },
  kiln: { x: -28, z: 0 },
  obstacles: [
    { x: -6, z: -8, w: 2, d: 20 },
    { x: 10, z: 8, w: 2, d: 20 },
  ],
  drips: [
    { x: -6, z: 6, period: 4, offset: 0 },
    { x: -6, z: 11, period: 4, offset: 2 },
    { x: 10, z: -7, period: 4, offset: 0 },
    { x: 10, z: -12, period: 4, offset: 2 },
    { x: 20, z: 4, period: 3, offset: 1 },
  ],
  treasures: [
    { id: 'shard-1', x: -16, z: -10, weight: 2 },
    { id: 'shard-2', x: -14, z: 12, weight: 3 },
    { id: 'shard-3', x: 2, z: -12, weight: 3 },
    { id: 'shard-4', x: 2, z: 8, weight: 4 },
    { id: 'shard-5', x: 24, z: 2, weight: 2 },
    { id: 'shard-6', x: 18, z: -10, weight: 5 },
    { id: 'shard-7', x: 24, z: 10, weight: 8 },
  ],
  pods: [
    { x: -20, z: -6 },
    { x: 4, z: 14 },
    { x: 14, z: -14 },
  ],
  enemies: [
    { x: 0, z: -2, kind: 'mossback' },
    { x: 24, z: -6, kind: 'ramhorn' },
  ],
};

const GRAVELMAWS_PIT: LevelSpec = {
  id: 'gravelmaws-pit',
  stage: 13,
  name: "Gravelmaw's Pit",
  brief:
    'Boss: the Gravelmaw rears over a ring and slams it. Pull your squad out of the ring, then throw everyone onto it while it lies winded and open.',
  width: 56,
  depth: 40,
  dayLength: 300,
  platinumTime: 135,
  seed: 13,
  startingWorkers: 12,
  captain: { x: -21, z: 2 },
  kiln: { x: -24, z: 0 },
  obstacles: [
    { x: 2, z: -12, w: 2, d: 16 },
    { x: 2, z: 12, w: 2, d: 16 },
    { x: 12, z: -10, w: 3, d: 3 },
    { x: 12, z: 10, w: 3, d: 3 },
  ],
  treasures: [
    { id: 'shard-1', x: -12, z: -12, weight: 2 },
    { id: 'shard-2', x: -10, z: 12, weight: 3 },
    { id: 'shard-3', x: -4, z: 0, weight: 2 },
    { id: 'shard-4', x: 24, z: -10, weight: 5 },
    { id: 'shard-5', x: 24, z: 10, weight: 5 },
  ],
  pods: [
    { x: -16, z: -6 },
    { x: -16, z: 8 },
    { x: -6, z: 14 },
  ],
  enemies: [{ x: 15, z: 0, kind: 'gravelmaw', drop: 6 }],
};

const THREE_ROOTS: LevelSpec = {
  id: 'three-roots',
  stage: 14,
  name: 'Three Roots',
  brief:
    'Boss: the Lanternroot is shielded while any of its three root-knots glows. Fell all three close together, then rush the core before they regrow.',
  width: 60,
  depth: 44,
  dayLength: 320,
  platinumTime: 160,
  seed: 14,
  startingWorkers: 15,
  captain: { x: -23, z: 2 },
  kiln: { x: -26, z: 0 },
  obstacles: [
    { x: 6, z: -7, w: 10, d: 2 },
    { x: 6, z: 7, w: 10, d: 2 },
  ],
  roots: [
    {
      x: 12,
      z: 0,
      drop: 10,
      knots: [
        { x: 12, z: -14 },
        { x: 12, z: 14 },
        { x: 25, z: 0 },
      ],
    },
  ],
  treasures: [
    { id: 'shard-1', x: -14, z: -14, weight: 2 },
    { id: 'shard-2', x: -12, z: 14, weight: 3 },
    { id: 'shard-3', x: -4, z: 0, weight: 3 },
    { id: 'shard-4', x: 2, z: -17, weight: 4 },
    { id: 'shard-5', x: 2, z: 17, weight: 4 },
  ],
  pods: [
    { x: -18, z: -6 },
    { x: -18, z: 6 },
    { x: -6, z: -10 },
    { x: -6, z: 10 },
  ],
  enemies: [{ x: 24, z: -13, kind: 'mossback' }],
};

const RUSH_HOUR: LevelSpec = {
  id: 'rush-hour',
  stage: 15,
  name: 'Rush Hour',
  brief:
    'Everything at once: a gate, drips, five enemies and Glowcaps that sprout mid-day for bonus score. Keep the plan, take the bonus only if it is on the way.',
  width: 90,
  depth: 50,
  dayLength: 520,
  platinumTime: 320,
  seed: 15,
  startingWorkers: 18,
  captain: { x: -39, z: 2 },
  kiln: { x: -42, z: 0 },
  obstacles: [
    { x: -20, z: -10, w: 2, d: 30 },
    { x: 0, z: 10, w: 2, d: 30 },
    { x: 20, z: -12.5, w: 2, d: 25 },
    { x: 20, z: 17.5, w: 2, d: 15 },
  ],
  gates: [{ x: 20, z: 5, w: 2, d: 10, hp: 200 }],
  drips: [
    { x: -20, z: 10, period: 4, offset: 0 },
    { x: 0, z: -10, period: 4, offset: 2 },
    { x: 30, z: -12, period: 3, offset: 0 },
  ],
  blooms: [
    { x: -10, z: -18, weight: 3, at: 60, lifetime: 45 },
    { x: 10, z: 18, weight: 4, at: 180, lifetime: 45 },
    { x: 36, z: 0, weight: 5, at: 300, lifetime: 45 },
  ],
  treasures: [
    { id: 'shard-1', x: -32, z: -16, weight: 2 },
    { id: 'shard-2', x: -30, z: 16, weight: 3 },
    { id: 'shard-3', x: -10, z: 4, weight: 4 },
    { id: 'shard-4', x: -8, z: 18, weight: 5 },
    { id: 'shard-5', x: 8, z: -16, weight: 6 },
    { id: 'shard-6', x: 10, z: 2, weight: 3 },
    { id: 'shard-7', x: 30, z: 12, weight: 8 },
    { id: 'shard-8', x: 34, z: -18, weight: 10 },
    { id: 'shard-9', x: 38, z: 4, weight: 6 },
  ],
  pods: [
    { x: -34, z: 8 },
    { x: -12, z: -8 },
    { x: 6, z: -6 },
    { x: 28, z: -4 },
  ],
  enemies: [
    { x: -12, z: 12, kind: 'mossback' },
    { x: 8, z: -6, kind: 'ramhorn' },
    { x: 12, z: 14, kind: 'spitter' },
    { x: 30, z: 6, kind: 'mossback' },
    { x: 38, z: -10, kind: 'spitter' },
  ],
};

const THE_BELLWETHER: LevelSpec = {
  id: 'the-bellwether',
  stage: 16,
  name: 'The Bellwether',
  brief:
    'Final boss: the Bellwether tolls its bell, then charges. Stand with a pillar behind you and step aside so it rams the stone, then pile on while it reels.',
  width: 70,
  depth: 44,
  dayLength: 420,
  platinumTime: 180,
  seed: 16,
  startingWorkers: 16,
  captain: { x: -28, z: 2 },
  kiln: { x: -31, z: 0 },
  obstacles: [
    { x: -8, z: -13, w: 2, d: 18 },
    { x: -8, z: 13, w: 2, d: 18 },
    { x: 6, z: -8, w: 3, d: 3 },
    { x: 6, z: 8, w: 3, d: 3 },
    { x: 20, z: 0, w: 3, d: 3 },
  ],
  gates: [{ x: -8, z: 0, w: 2, d: 8, hp: 160 }],
  treasures: [
    { id: 'shard-1', x: -20, z: -14, weight: 2 },
    { id: 'shard-2', x: -18, z: 14, weight: 3 },
    { id: 'shard-3', x: 0, z: -16, weight: 4 },
    { id: 'shard-4', x: 0, z: 16, weight: 4 },
    { id: 'shard-5', x: 28, z: -12, weight: 6 },
    { id: 'shard-6', x: 28, z: 12, weight: 6 },
  ],
  pods: [
    { x: -24, z: -8 },
    { x: -24, z: 8 },
    { x: -14, z: 0 },
    { x: 30, z: 0 },
  ],
  enemies: [
    { x: 12, z: 0, kind: 'bellwether', drop: 12 },
    { x: 30, z: -18, kind: 'spitter' },
  ],
};

const CROSSROADS: LevelSpec = {
  id: 'crossroads',
  stage: 17,
  name: 'Crossroads',
  brief:
    'The Kiln sits in a hub with four doors and a ring road beyond. Every haul has two ways home. Mounds hide more: idle Emberlings dig them up on their own. The east door is a gate: break it for a shortcut.',
  width: 100,
  depth: 64,
  dayLength: 300,
  platinumTime: 185,
  seed: 17,
  startingWorkers: 14,
  captain: { x: 3, z: 2 },
  kiln: { x: 0, z: 0 },
  obstacles: [
    { x: -7.5, z: -10, w: 9, d: 2 },
    { x: 7.5, z: -10, w: 9, d: 2 },
    { x: -7.5, z: 10, w: 9, d: 2 },
    { x: 7.5, z: 10, w: 9, d: 2 },
    { x: -12, z: -7, w: 2, d: 8 },
    { x: -12, z: 7, w: 2, d: 8 },
    { x: 12, z: -7, w: 2, d: 8 },
    { x: 12, z: 7, w: 2, d: 8 },
    { x: -25, z: -10, w: 26, d: 2 },
    { x: 25, z: -10, w: 26, d: 2 },
    { x: -25, z: 10, w: 26, d: 2 },
    { x: 25, z: 10, w: 26, d: 2 },
  ],
  gates: [{ x: 12, z: 0, w: 2, d: 6, hp: 120 }],
  treasures: [
    { id: 'shard-1', x: -30, z: -22, weight: 2 },
    { id: 'shard-2', x: 0, z: -24, weight: 3, variant: 'lodestone' },
    { id: 'shard-3', x: 30, z: -22, weight: 4 },
    { id: 'shard-4', x: -28, z: 22, weight: 3 },
    { id: 'shard-5', x: 10, z: 24, weight: 5 },
    { id: 'shard-6', x: 36, z: 24, weight: 2 },
    { id: 'shard-7', x: -30, z: 0, weight: 4 },
    { id: 'shard-8', x: 30, z: -4, weight: 6 },
    { id: 'shard-9', x: 40, z: 4, weight: 8 },
  ],
  pods: [
    { x: -6, z: 4 },
    { x: -10, z: -18 },
    { x: -20, z: 20 },
    { x: 24, z: 0 },
  ],
  enemies: [
    { x: 44, z: -26, kind: 'mound', drop: 3 },
    { x: -44, z: 26, kind: 'mound', reveals: 'sap' },
    { x: 22, z: -20, kind: 'mossback' },
    { x: -24, z: 2, kind: 'mossback' },
    { x: 28, z: 3, kind: 'ramhorn' },
    { x: -36, z: 20, kind: 'spitter' },
  ],
};

const THE_SPAN: LevelSpec = {
  id: 'the-span',
  stage: 18,
  name: 'The Span',
  brief:
    'A river splits the field. The ford in the far south is free but a Ramhorn guards it. Carry Span-logs to a bank to build a bridge: two logs for the north bridge, three for the south.',
  width: 110,
  depth: 70,
  dayLength: 700,
  platinumTime: 575,
  seed: 18,
  startingWorkers: 16,
  captain: { x: -45, z: 2 },
  kiln: { x: -48, z: 0 },
  obstacles: [
    { x: -22, z: -12, w: 2, d: 26 },
    { x: -22, z: 22, w: 2, d: 14 },
  ],
  water: [
    { x: 10, z: -20, w: 4, d: 18 },
    { x: 10, z: 7, w: 4, d: 24 },
    { x: 10, z: 30, w: 4, d: 10 },
  ],
  bridges: [
    { x: 10, z: -8, w: 4, d: 6, bank: { x: 5.5, z: -8 }, needs: 2 },
    { x: 10, z: 22, w: 4, d: 6, bank: { x: 5.5, z: 22 }, needs: 3 },
  ],
  logs: [
    { x: -34, z: -22 },
    { x: -8, z: -18 },
    { x: -30, z: 18 },
    { x: -6, z: 8 },
    { x: 0, z: 28 },
  ],
  treasures: [
    { id: 'shard-1', x: -36, z: -8, weight: 2 },
    { id: 'shard-2', x: -10, z: -4, weight: 3 },
    { id: 'shard-3', x: -30, z: 28, weight: 2 },
    { id: 'shard-4', x: 22, z: -24, weight: 4 },
    { id: 'shard-5', x: 30, z: -6, weight: 6 },
    { id: 'shard-6', x: 46, z: -20, weight: 8 },
    { id: 'shard-7', x: 24, z: 14, weight: 3, variant: 'dewglass' },
    { id: 'shard-8', x: 40, z: 26, weight: 10, variant: 'lodestone' },
    { id: 'shard-9', x: 48, z: 6, weight: 5 },
  ],
  pods: [
    { x: -40, z: 10 },
    { x: -12, z: 20 },
    { x: 20, z: 0 },
    { x: 36, z: -28 },
  ],
  enemies: [
    { x: 10, z: -32, kind: 'ramhorn' },
    { x: -10, z: -26, kind: 'mossback' },
    { x: 28, z: 22, kind: 'mossback' },
    { x: 40, z: -10, kind: 'spitter' },
  ],
};

const MATCHED_PAIRS: LevelSpec = {
  id: 'matched-pairs',
  stage: 19,
  name: 'Matched Pairs',
  brief:
    'The Kiln sits in the middle, and each twin shard has its match on the far side. Bring a pair home within ten seconds of each other for a bonus: stagger your starts. Sapdrops speed every haul up for half a minute.',
  width: 110,
  depth: 72,
  dayLength: 360,
  platinumTime: 240,
  seed: 19,
  startingWorkers: 16,
  captain: { x: -7, z: 2 },
  kiln: { x: -10, z: 0 },
  obstacles: [
    { x: -24, z: -12, w: 2, d: 24 },
    { x: -24, z: 20, w: 2, d: 16 },
    { x: 10, z: -16, w: 2, d: 24 },
    { x: 10, z: 18, w: 2, d: 20 },
    { x: 32, z: 10, w: 16, d: 2 },
    { x: -36, z: 10, w: 12, d: 2 },
  ],
  treasures: [
    { id: 'twin-a1', x: -46, z: -24, weight: 4, twin: 'dawn' },
    { id: 'twin-a2', x: 30, z: -26, weight: 4, twin: 'dawn' },
    { id: 'twin-b1', x: -44, z: 22, weight: 3, twin: 'dusk' },
    { id: 'twin-b2', x: 16, z: 24, weight: 3, twin: 'dusk' },
    { id: 'twin-c1', x: -40, z: 0, weight: 6, twin: 'noon' },
    { id: 'twin-c2', x: 44, z: 0, weight: 6, twin: 'noon' },
    { id: 'shard-1', x: 20, z: -8, weight: 2 },
    { id: 'shard-2', x: 48, z: 26, weight: 5, variant: 'dewglass' },
  ],
  saps: [
    { x: -24, z: -28 },
    { x: 40, z: -14 },
  ],
  pods: [
    { x: -16, z: 8 },
    { x: 0, z: -20 },
    { x: 20, z: 6 },
    { x: -48, z: 10 },
  ],
  enemies: [
    { x: -36, z: -16, kind: 'mossback' },
    { x: -34, z: 26, kind: 'mossback' },
    { x: 28, z: -14, kind: 'ramhorn' },
    { x: 36, z: 22, kind: 'spitter' },
  ],
};

const GLASS_RIVER: LevelSpec = {
  id: 'glass-river',
  stage: 20,
  name: 'Glass River',
  brief:
    'A long river with two bridge sites and two crossings, one under falling drips. Dewglass cracks if its crew breaks up: build the bridges and clear the way before you lift it.',
  width: 104,
  depth: 68,
  dayLength: 660,
  platinumTime: 540,
  seed: 20,
  startingWorkers: 16,
  captain: { x: -41, z: 2 },
  kiln: { x: -44, z: 0 },
  obstacles: [
    { x: -4, z: -20, w: 2, d: 20 },
    { x: 16, z: 20, w: 2, d: 20 },
  ],
  water: [
    { x: -21, z: 0, w: 18, d: 4 },
    { x: 5, z: 0, w: 26, d: 4 },
    { x: 31, z: 0, w: 18, d: 4 },
  ],
  bridges: [
    { x: -10, z: 0, w: 4, d: 4, bank: { x: -10, z: -4 }, needs: 2 },
    { x: 20, z: 0, w: 4, d: 4, bank: { x: 20, z: 4 }, needs: 2 },
  ],
  logs: [
    { x: -20, z: -8 },
    { x: -26, z: -16 },
    { x: 10, z: 8 },
    { x: 28, z: 8 },
  ],
  drips: [
    { x: 46, z: -3, period: 3, offset: 0 },
    { x: 46, z: 3, period: 3, offset: 1.5 },
    { x: 43, z: 0, period: 3, offset: 0.75 },
  ],
  treasures: [
    { id: 'shard-1', x: -20, z: -22, weight: 3 },
    { id: 'shard-2', x: 4, z: -14, weight: 4 },
    { id: 'shard-3', x: 30, z: -24, weight: 6 },
    { id: 'shard-4', x: 46, z: -20, weight: 8, variant: 'lodestone' },
    { id: 'shard-5', x: -22, z: 20, weight: 2 },
    { id: 'shard-6', x: 2, z: 22, weight: 5 },
    { id: 'shard-7', x: 28, z: 16, weight: 4 },
    { id: 'shard-8', x: 44, z: 24, weight: 10 },
    { id: 'glass-1', x: 36, z: -10, weight: 3, variant: 'dewglass' },
    { id: 'glass-2', x: 8, z: 12, weight: 2, variant: 'dewglass' },
  ],
  pods: [
    { x: -36, z: -14 },
    { x: -34, z: 16 },
    { x: 10, z: -26 },
    { x: 34, z: 28 },
  ],
  enemies: [
    { x: -10, z: -18, kind: 'mossback' },
    { x: -10, z: 24, kind: 'mossback' },
    { x: 24, z: -10, kind: 'spitter' },
    { x: 34, z: 22, kind: 'ramhorn' },
    { x: -40, z: -26, kind: 'mound', reveals: 'sap' },
  ],
};

const GRADUATION_DAY: LevelSpec = {
  id: 'graduation-day',
  stage: 21,
  name: 'Graduation Day',
  brief:
    'Everything you have learned on the biggest field yet: a bridge to build, a gate or a dripping gap to the east, mounds, twins, Dewglass, Glowcaps, and a Gravelmaw guarding the far side.',
  width: 120,
  depth: 80,
  dayLength: 1000,
  platinumTime: 700,
  seed: 21,
  startingWorkers: 22,
  captain: { x: -21, z: 2 },
  kiln: { x: -24, z: 0 },
  obstacles: [
    { x: -24, z: -12, w: 20, d: 2 },
    { x: -24, z: 12, w: 20, d: 2 },
    { x: 40, z: -10, w: 2, d: 36 },
    { x: 40, z: 30, w: 2, d: 20 },
  ],
  gates: [{ x: 40, z: 14, w: 2, d: 12, hp: 220 }],
  water: [
    { x: 16, z: -22, w: 4, d: 36 },
    { x: 16, z: 18, w: 4, d: 28 },
  ],
  bridges: [{ x: 16, z: 0, w: 4, d: 8, bank: { x: 11.5, z: 0 }, needs: 3 }],
  logs: [
    { x: -40, z: 20 },
    { x: -6, z: -24 },
    { x: 4, z: 22 },
  ],
  drips: [
    { x: 40, z: -34, period: 4, offset: 0 },
    { x: 40, z: -30, period: 4, offset: 2 },
  ],
  blooms: [
    { x: -10, z: -30, weight: 3, at: 90, lifetime: 50 },
    { x: 28, z: 0, weight: 4, at: 240, lifetime: 50 },
    { x: 46, z: -36, weight: 5, at: 380, lifetime: 50 },
  ],
  treasures: [
    { id: 'shard-1', x: -50, z: 10, weight: 2 },
    { id: 'shard-2', x: -38, z: -6, weight: 3 },
    { id: 'shard-3', x: -8, z: 16, weight: 4 },
    { id: 'shard-4', x: 0, z: -12, weight: 3 },
    { id: 'shard-5', x: 26, z: 10, weight: 4 },
    { id: 'shard-6', x: 30, z: -32, weight: 6 },
    { id: 'shard-7', x: 48, z: 10, weight: 6 },
    { id: 'shard-8', x: 54, z: -30, weight: 8, variant: 'lodestone' },
    { id: 'shard-9', x: 52, z: 24, weight: 10 },
    { id: 'shard-10', x: -44, z: -26, weight: 6 },
    { id: 'twin-1', x: -30, z: 30, weight: 5, twin: 'oath' },
    { id: 'twin-2', x: 32, z: 28, weight: 5, twin: 'oath' },
    { id: 'glass-1', x: 24, z: -6, weight: 3, variant: 'dewglass' },
  ],
  pods: [
    { x: -34, z: 6 },
    { x: -14, z: -6 },
    { x: 2, z: 6 },
    { x: 22, z: -14 },
    { x: 46, z: 34 },
    { x: -48, z: -28 },
  ],
  enemies: [
    { x: -54, z: -36, kind: 'mound', reveals: 'sap' },
    { x: 8, z: 34, kind: 'mound', drop: 3 },
    { x: -8, z: -18, kind: 'mossback' },
    { x: 28, z: -26, kind: 'mossback' },
    { x: 16, z: 36, kind: 'ramhorn' },
    { x: 30, z: 18, kind: 'spitter' },
    { x: 54, z: 30, kind: 'spitter' },
    { x: 50, z: -14, kind: 'gravelmaw', drop: 6 },
  ],
};

/** The Undercroft's rooms and corridors; everything else is rock. */
const UNDERCROFT_ROOMS: readonly Rect[] = [
  [-50, -8, -36, 8], // entry hall, with the Kiln
  [-36, -2, -26, 2],
  [-26, -8, -12, 8], // the crossing
  [-22, -20, -18, -8],
  [-30, -32, -4, -20], // drip gallery
  [-4, -28, 2, -24],
  [2, -32, 14, -18], // north store
  [4, -18, 8, -8],
  [-22, 8, -18, 18],
  [-30, 18, -6, 32], // skitter nest
  [-34, 24, -30, 28],
  [-44, 20, -34, 32], // the alcove behind the rubble
  [-12, -2, 0, 2],
  [0, -8, 30, 8], // chasm hall
  [24, -14, 28, -8],
  [20, -26, 32, -14], // rune room
  [22, 8, 26, 14],
  [14, 14, 32, 30], // cellar
  [30, -2, 34, 2],
  [34, -14, 50, 14], // the vault
];

const THE_UNDERCROFT: LevelSpec = {
  id: 'the-undercroft',
  stage: 22,
  name: 'The Undercroft',
  theme: 'cave',
  brief:
    "A dungeon under the Academy, dark and full of turnings. Walk up to a cold beacon to light it: hauls then go to the nearest light instead of all the way back. Bridge the chasm, break the rubble, and fight the Snuffer inside a beacon's glow.",
  width: 104,
  depth: 68,
  dayLength: 620,
  platinumTime: 380,
  seed: 22,
  startingWorkers: 12,
  captain: { x: -43, z: 2 },
  kiln: { x: -46, z: 0 },
  obstacles: carve(104, 68, UNDERCROFT_ROOMS),
  gates: [
    { ...rectBox([-34, 24, -30, 28]), hp: 120 },
    { ...rectBox([30, -2, 34, 2]), hp: 200 },
  ],
  water: [rectBox([12, -8, 18, -3]), rectBox([12, 3, 18, 8])],
  bridges: [{ ...rectBox([12, -3, 18, 3]), bank: { x: 10, z: 0 }, needs: 2 }],
  logs: [
    { x: -20, z: 28 },
    { x: 4, z: -30 },
  ],
  beacons: [
    { x: 5, z: -22 },
    { x: 22, z: 0 },
    { x: 44, z: -6 },
  ],
  drips: [
    { x: -22, z: -25, period: 4, offset: 0 },
    { x: -14, z: -27, period: 4, offset: 2 },
    { x: -8, z: -25, period: 4, offset: 1 },
  ],
  treasures: [
    { id: 'shard-1', x: -40, z: -5, weight: 1 },
    { id: 'shard-2', x: -14, z: 5, weight: 2 },
    { id: 'shard-3', x: -26, z: -28, weight: 3 },
    { id: 'glass-1', x: -10, z: -24, weight: 2, variant: 'dewglass' },
    { id: 'shard-4', x: 10, z: -28, weight: 4 },
    { id: 'twin-1', x: 10, z: -21, weight: 3, twin: 'vault' },
    { id: 'shard-5', x: -10, z: 28, weight: 4 },
    { id: 'shard-6', x: 6, z: 5, weight: 2 },
    { id: 'shard-7', x: 22, z: -5, weight: 3 },
    { id: 'twin-2', x: 26, z: -22, weight: 3, twin: 'vault' },
    { id: 'lodestone', x: 28, z: 26, weight: 6, variant: 'lodestone' },
    { id: 'shard-8', x: 18, z: 18, weight: 4 },
    { id: 'first-ember', x: 46, z: 10, weight: 10 },
  ],
  pods: [
    { x: -38, z: 5 },
    { x: -24, z: -5 },
    { x: -6, z: -30 },
    { x: 12, z: -20 },
    { x: -28, z: 30 },
    { x: -42, z: 22 },
    { x: 20, z: 6 },
    { x: 30, z: 16 },
  ],
  enemies: [
    { x: -26, z: 22, kind: 'mound', drop: 3 },
    { x: -8, z: 20, kind: 'mound', reveals: 'sap' },
    { x: -18, z: 24, kind: 'skitter' },
    { x: -14, z: 26, kind: 'skitter' },
    { x: -20, z: 22, kind: 'skitter' },
    { x: 30, z: -24, kind: 'spitter' },
    { x: 26, z: 4, kind: 'skitter' },
    { x: 28, z: -2, kind: 'skitter' },
    { x: 24, z: 22, kind: 'mossback' },
    { x: 42, z: 0, kind: 'snuffer', drop: 6 },
  ],
  secret: { x: -41, z: 27 },
};

/** A lesson as written, before its par score is derived. The theme defaults to its chapter's. */
type LevelSpec = Omit<LevelDefinition, 'parScore' | 'difficulty' | 'theme'> & {
  theme?: LevelTheme;
};

/** The setting each stretch of the academy is taught in. */
function themeOf(stage: number): LevelTheme {
  if (stage <= 5) return 'meadow';
  if (stage <= 10) return 'autumn';
  if (stage <= 16) return 'marsh';
  return 'dusk';
}

/** Total value of every Sunshard in a lesson. */
export function treasureTotal(
  level: Pick<LevelDefinition, 'treasures' | 'enemies' | 'roots'>,
): number {
  const weights =
    level.treasures.reduce((sum, t) => sum + t.weight, 0) +
    level.enemies.reduce((sum, enemy) => sum + (enemy.drop ?? 0), 0) +
    (level.roots ?? []).reduce((sum, root) => sum + root.drop, 0);
  return weights * SHARD_VALUE_PER_WEIGHT;
}

/** Number of Sunshards in a lesson, counting those that bosses drop. */
export function shardCount(
  level: Pick<LevelDefinition, 'treasures' | 'enemies' | 'roots'>,
): number {
  return (
    level.treasures.length +
    level.enemies.filter((enemy) => (enemy.drop ?? 0) > 0).length +
    (level.roots ?? []).length
  );
}

/**
 * Par is exactly the score of a Platinum-pace day: every Sunshard home at
 * `platinumTime`, with the starting squad alive and nobody lost.
 */
function withPar(spec: LevelSpec, difficulty: Difficulty = 'normal'): LevelDefinition {
  const timeLeft = spec.dayLength - spec.platinumTime;
  return {
    ...spec,
    theme: spec.theme ?? themeOf(spec.stage),
    difficulty,
    parScore:
      treasureTotal(spec) + spec.startingWorkers * POINTS_PER_WORKER + timeLeft * POINTS_PER_SECOND,
  };
}

/** The academy's lessons in play order. */
export const LEVELS: readonly LevelDefinition[] = [
  MANY_HANDS,
  OVER_THE_WALL,
  THE_GUARD,
  FIRST_LIGHT,
  LONG_HAUL,
  DIVIDE_AND_CONQUER,
  THE_GAUNTLET,
  GROWING_PAINS,
  SWITCHBACKS,
  FINAL_EXAM,
  BRAMBLE_GATE,
  DRIP_LINE,
  GRAVELMAWS_PIT,
  THREE_ROOTS,
  RUSH_HOUR,
  THE_BELLWETHER,
  CROSSROADS,
  THE_SPAN,
  MATCHED_PAIRS,
  GLASS_RIVER,
  GRADUATION_DAY,
  THE_UNDERCROFT,
].map((spec) => withPar(spec));

/** A lesson as played on the given difficulty: Hard has a shorter day and its own par. */
export function forDifficulty(level: LevelDefinition, difficulty: Difficulty): LevelDefinition {
  if (difficulty === level.difficulty) return level;
  // The Normal day length: the lesson's own, or the stock lesson's when converting back from Hard.
  const normalDay =
    level.difficulty === 'normal'
      ? level.dayLength
      : (LEVELS.find((candidate) => candidate.id === level.id)?.dayLength ?? level.dayLength);
  const dayLength = difficulty === 'hard' ? Math.round(normalDay * HARD.dayLength) : normalDay;
  // withPar replaces the par and difficulty.
  return withPar({ ...level, dayLength }, difficulty);
}
