import type { LevelSpec } from '../levelTypes';

/** Term two, Field Work: lessons 6 to 10 in the autumn valley. */

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

export const FIELD_WORK: readonly LevelSpec[] = [
  DIVIDE_AND_CONQUER,
  THE_GAUNTLET,
  GROWING_PAINS,
  SWITCHBACKS,
  FINAL_EXAM,
];
