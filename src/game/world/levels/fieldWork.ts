import type { LevelSpec } from '../levelTypes';

/** Term two, Field Work: lessons 6 to 10 in the autumn valley. */

const DIVIDE_AND_CONQUER: LevelSpec = {
  id: 'divide-and-conquer',
  stage: 6,
  name: 'Divide and Conquer',
  brief:
    'Meet the Dewlings: blue, quick in water, and the only Sproutlings who wade. Two shards lie sunk in the ponds; throw Dewlings in after them (press 2, or tap their chip) and split the rest of the squad across the dry jobs.',
  width: 64,
  depth: 36,
  dayLength: 140,
  platinumTime: 100,
  seed: 6,
  startingWorkers: 14,
  squad: { ember: 10, dew: 4 },
  captain: { x: -26, z: 2 },
  kiln: { x: -29, z: 0 },
  water: [
    { x: 4, z: -12, w: 10, d: 8 },
    { x: 22, z: 2, w: 6, d: 6 },
  ],
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
    { id: 'sunk-1', x: 4, z: -13, weight: 3 },
    { id: 'sunk-2', x: 22, z: 2, weight: 2 },
  ],
  blooms: [{ x: -6, z: 14, weight: 2, at: 25, lifetime: 40 }],
  pods: [
    { x: -18, z: -6, kind: 'dew' },
    { x: -2, z: 10 },
    { x: 14, z: 8, kind: 'dew' },
  ],
  enemies: [{ x: 30, z: -4, kind: 'mound', reveals: 'sap' }],
};

const THE_GAUNTLET: LevelSpec = {
  id: 'the-gauntlet',
  stage: 7,
  name: 'The Gauntlet',
  brief:
    'A Ramhorn guards the corridor. Step out of its charge, and take the squad with you: they follow you into danger, not out of it. Pile on while it stands winded. A Dewling job waits in the pond by the Kiln, and Emberling work by the vent at the far end.',
  width: 80,
  depth: 30,
  dayLength: 220,
  platinumTime: 160,
  seed: 7,
  startingWorkers: 14,
  squad: { ember: 10, dew: 4 },
  captain: { x: -33, z: 2 },
  kiln: { x: -36, z: 0 },
  obstacles: [
    { x: 12, z: -9.5, w: 40, d: 11 },
    { x: 12, z: 9.5, w: 40, d: 11 },
  ],
  water: [{ x: -22, z: -10, w: 7, d: 6 }],
  vents: [{ x: 37.5, z: -8, period: 4, offset: 1 }],
  treasures: [
    { id: 'shard-1', x: -22, z: -10, weight: 2 },
    { id: 'shard-2', x: -20, z: 10, weight: 3 },
    { id: 'shard-3', x: -14, z: 8, weight: 2 },
    { id: 'shard-4', x: 35, z: 6, weight: 4 },
    { id: 'shard-5', x: 36, z: -6, weight: 6 },
    { id: 'shard-6', x: 36, z: 11, weight: 3, variant: 'dewglass' },
  ],
  blooms: [{ x: -26, z: 10, weight: 2, at: 15, lifetime: 40 }],
  pods: [
    { x: -24, z: 0, kind: 'dew' },
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
    'Meet the Stonelings: grey, slow, and they lift like two and hit like three. Only they crack crystal, and the heaviest shard sits behind a crystal gate. Start small: every Mossback you beat and haul home grows the squad.',
  width: 70,
  depth: 40,
  dayLength: 400,
  platinumTime: 145,
  seed: 8,
  startingWorkers: 6,
  squad: { ember: 4, stone: 2 },
  captain: { x: -29, z: 2 },
  kiln: { x: -32, z: 0 },
  obstacles: [
    { x: -12, z: 10, w: 2, d: 20 },
    { x: 8, z: -10, w: 2, d: 20 },
    { x: 24, z: 12, w: 8, d: 3 },
    // The crystal vault in the east corner.
    { x: 31, z: -2, w: 8, d: 2 },
    { x: 27, z: 0.5, w: 2, d: 3 },
    { x: 27, z: 11.5, w: 2, d: 7 },
    { x: 31.5, z: 16, w: 7, d: 2 },
  ],
  gates: [{ x: 27, z: 5, w: 2, d: 6, hp: 70, style: 'crystal' }],
  treasures: [
    { id: 'shard-1', x: -20, z: -12, weight: 2 },
    { id: 'shard-2', x: -4, z: 14, weight: 4 },
    { id: 'shard-3', x: 0, z: -2, weight: 6 },
    { id: 'shard-4', x: 18, z: -14, weight: 8 },
    { id: 'shard-5', x: 31, z: 7, weight: 10 },
  ],
  blooms: [{ x: 2, z: 16, weight: 3, at: 60, lifetime: 60 }],
  pods: [
    { x: -24, z: -4, kind: 'stone' },
    { x: -22, z: 12 },
    { x: 20, z: -2, kind: 'stone' },
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
    'Three long walls force every haul to zigzag home. Throw across the walls, then keep the crowd close to the route the shards must take. Emberlings, Dewlings and Stonelings together now: a sunk shard, a vent and a heavy load each want their own kind.',
  width: 80,
  depth: 50,
  dayLength: 390,
  platinumTime: 285,
  seed: 9,
  startingWorkers: 16,
  squad: { ember: 10, dew: 3, stone: 3 },
  captain: { x: -35, z: 2 },
  kiln: { x: -38, z: 0 },
  water: [{ x: -8, z: -15, w: 7, d: 6 }],
  vents: [{ x: 31.5, z: -4, period: 4, offset: 2 }],
  obstacles: [
    { x: -15, z: -7.5, w: 2, d: 35 },
    { x: 0, z: 7.5, w: 2, d: 35 },
    { x: 15, z: -7.5, w: 2, d: 35 },
  ],
  treasures: [
    { id: 'shard-1', x: -25, z: 15, weight: 2 },
    { id: 'shard-2', x: -8, z: -15, weight: 2 },
    { id: 'shard-3', x: 8, z: 15, weight: 4 },
    { id: 'shard-4', x: 25, z: -15, weight: 5 },
    { id: 'shard-5', x: 33, z: 10, weight: 8 },
    { id: 'shard-6', x: 30, z: -2, weight: 3 },
    { id: 'shard-7', x: 7, z: -20, weight: 6, variant: 'lodestone' },
  ],
  blooms: [{ x: -26, z: -20, weight: 2, at: 40, lifetime: 50 }],
  saps: [{ x: 22, z: -20 }],
  pods: [
    { x: -28, z: -10 },
    { x: -6, z: -2, kind: 'stone' },
    { x: 8, z: -12, kind: 'dew' },
  ],
  enemies: [
    { x: 22, z: 12, kind: 'spitter' },
    { x: -8, z: 6, kind: 'mossback' },
    { x: -26, z: 6, kind: 'mound', drop: 2 },
  ],
};

const FINAL_EXAM: LevelSpec = {
  id: 'final-exam',
  stage: 10,
  name: 'Final Exam',
  brief:
    'The term exam: ten shards, six beasts, walls across the whole field, and a job for every kind. Plan the order, keep every Sproutling working, and lose as few as you can.',
  width: 90,
  depth: 56,
  dayLength: 560,
  platinumTime: 365,
  seed: 10,
  startingWorkers: 20,
  squad: { ember: 12, dew: 4, stone: 4 },
  captain: { x: -40, z: 2 },
  kiln: { x: -43, z: 0 },
  water: [{ x: -34, z: -19, w: 8, d: 6 }],
  vents: [
    { x: -10, z: 24.5, period: 4, offset: 0 },
    { x: 5, z: -23, period: 5, offset: 2 },
  ],
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
    { id: 'shard-11', x: -12, z: -24, weight: 4, variant: 'dewglass' },
  ],
  blooms: [
    { x: -20, z: 22, weight: 3, at: 90, lifetime: 60 },
    { x: 22, z: 22, weight: 4, at: 240, lifetime: 60 },
  ],
  saps: [{ x: 6, z: 24 }],
  pods: [
    { x: -34, z: 8 },
    { x: -28, z: -8, kind: 'dew' },
    { x: -12, z: 10, kind: 'stone' },
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
