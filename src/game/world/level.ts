import type { Box, Point } from '../navigation/NavGrid';

export interface TreasureSpawn extends Point {
  id: string;
  weight: number;
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
  /** Score that earns the top rank. Tuned so a plain greedy player lands around Gold. */
  parScore: number;
  seed: number;
  startingWorkers: number;
  captain: Point;
  kiln: Point;
  obstacles: Box[];
  treasures: TreasureSpawn[];
  enemies: Point[];
}

const MANY_HANDS: LevelDefinition = {
  id: 'many-hands',
  stage: 1,
  name: 'Many Hands',
  brief:
    'Five Sunshards, ten Emberlings, no danger. Give every shard exactly the carriers it needs and nobody waits around.',
  width: 40,
  depth: 26,
  dayLength: 60,
  parScore: 1650,
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
  enemies: [],
};

const OVER_THE_WALL: LevelDefinition = {
  id: 'over-the-wall',
  stage: 2,
  name: 'Over the Wall',
  brief:
    'Emberlings fly over walls; Sunshards have to walk around them. Throw across to start the far jobs early.',
  width: 50,
  depth: 30,
  dayLength: 90,
  parScore: 1900,
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
  enemies: [],
};

const THE_GUARD: LevelDefinition = {
  id: 'the-guard',
  stage: 3,
  name: 'The Guard',
  brief:
    'A Mossback holds the only gap, and the big shard needs more Emberlings than you start with. Its carcass is worth four more.',
  width: 50,
  depth: 30,
  dayLength: 120,
  parScore: 2750,
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
  enemies: [{ x: 4, z: 0 }],
};

const FIRST_LIGHT: LevelDefinition = {
  id: 'first-light',
  stage: 4,
  name: 'First Light',
  brief:
    'Three lanes, three Mossbacks, six Sunshards. Decide what to clear first and keep every lane busy.',
  width: 60,
  depth: 40,
  dayLength: 180,
  parScore: 3500,
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
  enemies: [
    { x: -1, z: 5 },
    { x: 14, z: -6 },
    { x: 23, z: 8 },
  ],
};

const LONG_HAUL: LevelDefinition = {
  id: 'long-haul',
  stage: 5,
  name: 'Long Haul',
  brief:
    'A wide field and far-off shards. The walk home is the slow part, so start the distant hauls first and grow the squad on the way.',
  width: 80,
  depth: 50,
  dayLength: 300,
  parScore: 5400,
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
  enemies: [
    { x: -8, z: 9 },
    { x: 12, z: -5 },
    { x: 20, z: 11 },
    { x: 32, z: 6 },
  ],
};

const DIVIDE_AND_CONQUER: LevelDefinition = {
  id: 'divide-and-conquer',
  stage: 6,
  name: 'Divide and Conquer',
  brief:
    'Seven shards scattered over a wide, quiet field. Split your Emberlings across several jobs at once instead of finishing one at a time.',
  width: 64,
  depth: 36,
  dayLength: 120,
  parScore: 2950,
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
  enemies: [],
};

const THE_GAUNTLET: LevelDefinition = {
  id: 'the-gauntlet',
  stage: 7,
  name: 'The Gauntlet',
  brief:
    'The only road to the far shards is a narrow corridor with two Mossbacks inside. Clear it, then keep the hauls moving through.',
  width: 80,
  depth: 30,
  dayLength: 170,
  parScore: 2900,
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
  enemies: [
    { x: 4, z: 0 },
    { x: 20, z: 0 },
  ],
};

const GROWING_PAINS: LevelDefinition = {
  id: 'growing-pains',
  stage: 8,
  name: 'Growing Pains',
  brief:
    'Only six Emberlings and the shards are heavy. Every Mossback you beat and haul home grows the squad, so fight early to afford the big jobs.',
  width: 70,
  depth: 40,
  dayLength: 400,
  parScore: 5400,
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
  enemies: [
    { x: -18, z: 8 },
    { x: -2, z: -8 },
    { x: 16, z: 6 },
    { x: 28, z: -6 },
  ],
};

const SWITCHBACKS: LevelDefinition = {
  id: 'switchbacks',
  stage: 9,
  name: 'Switchbacks',
  brief:
    'Three long walls force every haul to zigzag home. Throw across the walls, then keep the crowd close to the route the shards must take.',
  width: 80,
  depth: 50,
  dayLength: 390,
  parScore: 4800,
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
  enemies: [{ x: 22, z: 12 }],
};

const FINAL_EXAM: LevelDefinition = {
  id: 'final-exam',
  stage: 10,
  name: 'Final Exam',
  brief:
    'Ten shards, six Mossbacks and walls across the whole field. Plan the order, keep every Emberling working, and lose as few as you can.',
  width: 90,
  depth: 56,
  dayLength: 520,
  parScore: 9300,
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
  enemies: [
    { x: -26, z: 6 },
    { x: -14, z: -10 },
    { x: 2, z: 4 },
    { x: 18, z: -6 },
    { x: 28, z: 10 },
    { x: 38, z: 2 },
  ],
};

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
];
