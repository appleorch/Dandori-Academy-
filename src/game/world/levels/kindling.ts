import type { LevelSpec } from '../levelTypes';

/** Term one, Kindling: lessons 1 to 5 on the spring lawn. */

const MANY_HANDS: LevelSpec = {
  id: 'many-hands',
  stage: 1,
  name: 'Many Hands',
  brief:
    'Five Sunshards, ten Emberlings, no danger. Give every shard exactly the carriers it needs and nobody waits around. A Glowcap sprouts early for bonus score, and the soft mound hides a seed pod.',
  width: 40,
  depth: 26,
  dayLength: 60,
  platinumTime: 21,
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
  blooms: [{ x: 2, z: -9, weight: 1, at: 4, lifetime: 30 }],
  pods: [],
  enemies: [{ x: 13, z: -2, kind: 'mound', reveals: 'pod' }],
  // A corner of the Academy's kitchen garden, seen from far too close.
  props: [
    { kind: 'flowerpot', x: -26, z: -16, scale: 1.3 },
    { kind: 'watering-can', x: 27, z: 13, turn: 2.5 },
    { kind: 'trowel', x: 7, z: -18, turn: 0.25 },
    { kind: 'glove', x: -8, z: 18.5, turn: -0.5 },
    { kind: 'croquet-hoop', x: 23, z: -5, turn: 1.4 },
    { kind: 'button', x: 15, z: 16.5, turn: 0.4 },
    { kind: 'acorn-cap', x: -24, z: 9, scale: 0.9 },
  ],
};

const OVER_THE_WALL: LevelSpec = {
  id: 'over-the-wall',
  stage: 2,
  name: 'Over the Wall',
  brief:
    'Emberlings fly over walls; Sunshards have to walk around them. Throw across to start the far jobs early. A buried shard waits under the mound by the second wall: dig it up on the way.',
  width: 50,
  depth: 30,
  dayLength: 100,
  platinumTime: 65,
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
  blooms: [{ x: 16, z: -3, weight: 2, at: 20, lifetime: 40 }],
  saps: [{ x: -14, z: -10 }],
  pods: [
    { x: -12, z: 6 },
    { x: 6, z: -2 },
  ],
  enemies: [{ x: 4, z: -12, kind: 'mound', drop: 2 }],
  // The two walls are the kitchen garden's old brick, and the garden goes on past them.
  wallLook: 'brick',
  props: [
    { kind: 'flowerpot', x: -30, z: 18, scale: 1.1 },
    { kind: 'flowerpot', x: 30, z: -19, scale: 0.8 },
    { kind: 'watering-can', x: 31, z: 12, turn: 3.6 },
    { kind: 'spool', x: -29, z: -17 },
    { kind: 'plant-label', x: -4, z: -17.5 },
    { kind: 'plant-label', x: 10, z: 17.5, turn: 0.3 },
  ],
};

const THE_GUARD: LevelSpec = {
  id: 'the-guard',
  stage: 3,
  name: 'The Guard',
  brief:
    'A Mossback holds the only gap. Throw a full squad onto its back, and whistle them clear when it shakes or it eats the fallen. Its carcass is worth four more Emberlings. The shard on the flame vent is yours to take: Emberlings are fireproof, but the Warden is not.',
  width: 50,
  depth: 30,
  dayLength: 120,
  platinumTime: 40,
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
  vents: [{ x: -11.5, z: -8, period: 5, offset: 2 }],
  blooms: [{ x: 18, z: -9, weight: 2, at: 30, lifetime: 45 }],
  pods: [{ x: -14, z: -3 }],
  enemies: [{ x: 4, z: 0, kind: 'mossback' }],
};

const FIRST_LIGHT: LevelSpec = {
  id: 'first-light',
  stage: 4,
  name: 'First Light',
  brief:
    'Three lanes and three guards, one of them a Bogspitter that lobs globs from afar: keep moving when a ring appears on the ground. Two flame vents breathe by the lanes; the Sunshards beside them are Emberling work.',
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
    { id: 'shard-7', x: 12, z: -4, weight: 2, twin: 'lanes' },
    { id: 'shard-8', x: -12, z: -16, weight: 2, twin: 'lanes' },
  ],
  vents: [
    { x: 1.5, z: -11.5, period: 4, offset: 1 },
    { x: -11, z: 16.5, period: 4, offset: 3 },
  ],
  blooms: [{ x: 18, z: 2, weight: 3, at: 40, lifetime: 50 }],
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
    'A wide field and far-off shards. The walk home is the slow part, so start the distant hauls first and grow the squad on the way. Sap in the middle speeds every haul for half a minute: save it for the long ones.',
  width: 80,
  depth: 50,
  dayLength: 360,
  platinumTime: 218,
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
    { id: 'shard-8', x: 34, z: 17, weight: 9 },
  ],
  saps: [{ x: -4, z: -6 }],
  vents: [{ x: 35, z: 15, period: 5, offset: 0 }],
  blooms: [
    { x: -14, z: 18, weight: 2, at: 50, lifetime: 50 },
    { x: 22, z: 2, weight: 4, at: 140, lifetime: 60 },
  ],
  pods: [
    { x: -24, z: 6 },
    { x: -2, z: -6 },
    { x: 14, z: 6 },
  ],
  enemies: [
    { x: 30, z: -20, kind: 'mound', drop: 3 },
    { x: -8, z: 9, kind: 'mossback' },
    { x: 12, z: -5, kind: 'ramhorn' },
    { x: 20, z: 11, kind: 'mossback' },
    { x: 32, z: 6, kind: 'spitter' },
  ],
};

export const KINDLING: readonly LevelSpec[] = [
  MANY_HANDS,
  OVER_THE_WALL,
  THE_GUARD,
  FIRST_LIGHT,
  LONG_HAUL,
];
