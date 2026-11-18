import { carve, rectBox, type Rect } from '../carve';
import type { LevelSpec } from '../levelTypes';

/** Under the Academy: the Undercroft and the three side lessons reached from the far fields. */

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
    "A dungeon under the Academy, dark and full of turnings. Walk up to a cold beacon to light it: hauls then go to the nearest light instead of all the way back. Bridge the chasm or wade it, crack the crystal over the alcove with Stonelings, and fight the Snuffer inside a beacon's glow.",
  width: 104,
  depth: 68,
  dayLength: 620,
  platinumTime: 444,
  seed: 22,
  startingWorkers: 12,
  squad: { ember: 4, dew: 2, stone: 3, spark: 3 },
  captain: { x: -43, z: 2 },
  kiln: { x: -46, z: 0 },
  obstacles: carve(104, 68, UNDERCROFT_ROOMS),
  gates: [
    { ...rectBox([-34, 24, -30, 28]), hp: 100, style: 'crystal' },
    { ...rectBox([30, -2, 34, 2]), hp: 200 },
  ],
  vents: [{ x: -27.5, z: -25.5, period: 4, offset: 1 }],
  coils: [{ a: { x: 21, z: -25 }, b: { x: 21, z: -17 }, period: 4, offset: 2 }],
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
    { id: 'rune-1', x: 21, z: -21, weight: 1 },
  ],
  pods: [
    { x: -38, z: 5, kind: 'stone' },
    { x: -24, z: -5, kind: 'spark' },
    { x: -6, z: -30 },
    { x: 12, z: -20, kind: 'dew' },
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

/** The Cistern: a flooded hall split by a channel, with store rooms off both sides. */
const CISTERN_ROOMS: readonly Rect[] = [
  [-38, -8, -26, 8], // entry, with the Kiln
  [-26, -2, -18, 2],
  [-18, -14, 24, 14], // the great hall, cut in two by the channel
  [-10, -18, -6, -14],
  [-16, -26, 0, -18], // north store
  [-10, 14, -6, 18],
  [-16, 18, 0, 26], // south store
  [16, -18, 20, -14],
  [12, -26, 26, -18], // north-east room
  [16, 14, 20, 18],
  [12, 18, 26, 26], // south-east room
  [24, -2, 28, 2],
  [28, -6, 38, 6], // the sump
];

const THE_CISTERN: LevelSpec = {
  id: 'the-cistern',
  stage: 28,
  side: true,
  name: 'The Cistern',
  theme: 'cave',
  brief:
    'A flooded hall under the twin fields. Two Span-logs bridge the channel, or Dewlings wade it; one shard lies at the bottom. The beacon on the far side saves the long walk, a vent breathes in the sump, and a pair of twin shards waits in the far rooms: time them to the same flame.',
  width: 80,
  depth: 56,
  dayLength: 260,
  platinumTime: 114,
  seed: 23,
  startingWorkers: 10,
  squad: { ember: 6, dew: 4 },
  captain: { x: -31, z: 2 },
  kiln: { x: -34, z: 0 },
  obstacles: carve(80, 56, CISTERN_ROOMS),
  vents: [{ x: 35.5, z: -3.5, period: 4, offset: 0 }],
  water: [rectBox([0, -14, 6, -3]), rectBox([0, 3, 6, 14])],
  bridges: [{ ...rectBox([0, -3, 6, 3]), bank: { x: -2, z: 0 }, needs: 2 }],
  logs: [
    { x: -14, z: -24 },
    { x: -2, z: 20 },
  ],
  beacons: [{ x: 12, z: 0 }],
  drips: [
    { x: -8, z: -22, period: 4, offset: 0 },
    { x: -4, z: -23, period: 4, offset: 2 },
  ],
  treasures: [
    { id: 'shard-1', x: -28, z: -5, weight: 1 },
    { id: 'shard-2', x: -12, z: 8, weight: 2 },
    { id: 'shard-3', x: -12, z: -21, weight: 3 },
    { id: 'shard-4', x: -4, z: 23, weight: 4 },
    { id: 'shard-5', x: 20, z: -8, weight: 3 },
    { id: 'glass-1', x: 10, z: 10, weight: 2, variant: 'dewglass' },
    { id: 'twin-1', x: 22, z: -22, weight: 4, twin: 'tide' },
    { id: 'twin-2', x: 22, z: 22, weight: 4, twin: 'tide' },
    { id: 'lodestone', x: 34, z: 0, weight: 5, variant: 'lodestone' },
    { id: 'sunk-1', x: 3, z: -10, weight: 2 },
  ],
  pods: [
    { x: -22, z: 0, kind: 'dew' },
    { x: -16, z: -10 },
    { x: -2, z: -25 },
    { x: -14, z: 24 },
    { x: 8, z: -10 },
    { x: 24, z: -24 },
  ],
  enemies: [
    { x: -12, z: 22, kind: 'skitter' },
    { x: -9, z: 23, kind: 'skitter' },
    { x: 20, z: 5, kind: 'mossback' },
    { x: 14, z: 22, kind: 'skitter' },
    { x: 16, z: 24, kind: 'skitter' },
    { x: 32, z: -4, kind: 'mound', reveals: 'sap' },
  ],
};

/** Fifteen small rooms on a grid, joined by short tunnels: [column, row] pairs that connect. */
const WARREN_LINKS: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 1, 1],
  [1, 1, 2, 1],
  [2, 1, 3, 1],
  [3, 1, 4, 1],
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [2, 1, 2, 2],
  [2, 2, 1, 2],
  [1, 2, 0, 2],
  [3, 1, 3, 0],
  [3, 0, 2, 0],
  [3, 0, 4, 0],
  [4, 1, 4, 2],
  [4, 2, 3, 2],
];
const warrenX = (column: number): number => -32 + column * 16;
const warrenZ = (row: number): number => -18 + row * 18;
const WARREN_ROOMS: readonly Rect[] = [
  ...[0, 1, 2, 3, 4].flatMap((column) =>
    [0, 1, 2].map((row): Rect => [
      warrenX(column) - 6,
      warrenZ(row) - 6,
      warrenX(column) + 6,
      warrenZ(row) + 6,
    ]),
  ),
  ...WARREN_LINKS.map(([c0, r0, c1, r1]): Rect => {
    const x0 = Math.min(warrenX(c0), warrenX(c1));
    const z0 = Math.min(warrenZ(r0), warrenZ(r1));
    return r0 === r1 ? [x0 + 6, z0 - 2, x0 + 10, z0 + 2] : [x0 - 2, z0 + 6, x0 + 2, z0 + 12];
  }),
];

const SKITTER_WARREN: LevelSpec = {
  id: 'skitter-warren',
  stage: 29,
  side: true,
  name: 'Skitter Warren',
  theme: 'cave',
  brief:
    'Fifteen small chambers and a great many Skitters. They die to a single good volley, so throw first: a pack that reaches the squad takes one Sproutling a bite. Light the beacons as you go, crack the crystal to the east with Stonelings, and send Sparklings under the coil.',
  width: 84,
  depth: 60,
  dayLength: 420,
  platinumTime: 209,
  seed: 24,
  startingWorkers: 10,
  squad: { ember: 5, stone: 2, spark: 3 },
  captain: { x: -31, z: 2 },
  kiln: { x: -34, z: 0 },
  obstacles: carve(84, 60, WARREN_ROOMS),
  gates: [{ ...rectBox([22, -2, 26, 2]), hp: 110, style: 'crystal' }],
  coils: [{ a: { x: -3, z: -22 }, b: { x: 3, z: -22 }, period: 4, offset: 1 }],
  beacons: [
    { x: 16, z: -14 },
    { x: 32, z: 14 },
  ],
  treasures: [
    { id: 'shard-1', x: -16, z: 3, weight: 2 },
    { id: 'shard-2', x: -18, z: -20, weight: 3 },
    { id: 'shard-3', x: 2, z: -3, weight: 2 },
    { id: 'shard-4', x: 2, z: 20, weight: 4 },
    { id: 'glass-1', x: -18, z: 16, weight: 2, variant: 'dewglass' },
    { id: 'shard-5', x: 0, z: -14, weight: 3 },
    { id: 'spark-1', x: 0, z: -22, weight: 2 },
    { id: 'shard-6', x: 19, z: -21, weight: 4 },
    { id: 'lodestone', x: 34, z: -18, weight: 5, variant: 'lodestone' },
    { id: 'shard-7', x: 16, z: 3, weight: 3 },
    { id: 'shard-8', x: 34, z: 3, weight: 6 },
    { id: 'shard-9', x: 34, z: 21, weight: 5 },
    { id: 'shard-10', x: 14, z: 20, weight: 3 },
  ],
  pods: [
    { x: -28, z: -4, kind: 'stone' },
    { x: -16, z: -3, kind: 'spark' },
    { x: -34, z: -14 },
    { x: 0, z: 3 },
    { x: 16, z: -3 },
    { x: 30, z: -21 },
    { x: 18, z: 16 },
    { x: -30, z: 21 },
  ],
  enemies: [
    { x: -32, z: -19, kind: 'mound', drop: 2 },
    { x: -33, z: 17, kind: 'mound', reveals: 'pod' },
    { x: 3, z: -16, kind: 'mound', reveals: 'sap' },
    { x: -14, z: -16, kind: 'skitter' },
    { x: -13, z: -19, kind: 'skitter' },
    { x: -2, z: 16, kind: 'skitter' },
    { x: 0, z: 15, kind: 'skitter' },
    { x: 14, z: -18, kind: 'skitter' },
    { x: 16, z: -20, kind: 'skitter' },
    { x: 18, z: -17, kind: 'skitter' },
    { x: 30, z: -1, kind: 'mossback' },
    { x: 30, z: 18, kind: 'skitter' },
    { x: 32, z: 20, kind: 'skitter' },
    { x: 30, z: 21, kind: 'skitter' },
  ],
};

const ROOT_CELLAR_ROOMS: readonly Rect[] = [
  [-34, -6, -24, 6], // entry, with the Kiln
  [-24, -2, -16, 2],
  [-16, -10, -4, 10], // antechamber
  [-10, -14, -6, -10],
  [-14, -24, -2, -14],
  [-10, 10, -6, 14],
  [-14, 14, -2, 24],
  [-4, -2, 2, 2],
  [2, -20, 34, 20], // the great cellar
];

const THE_ROOT_CELLAR: LevelSpec = {
  id: 'the-root-cellar',
  stage: 30,
  side: true,
  name: 'The Root Cellar',
  theme: 'cave',
  brief:
    'A Lanternroot has grown down through the roof of the old cellar, and it is the only light in there. Break the rubble, light the beacon inside, then fell all three root-knots together. Skitters nest in the corners, a shard lies in the seep by the door, and a vent breathes in the far corner.',
  width: 72,
  depth: 52,
  dayLength: 280,
  platinumTime: 149,
  seed: 25,
  startingWorkers: 14,
  squad: { ember: 9, dew: 3, stone: 2 },
  captain: { x: -27, z: 2 },
  kiln: { x: -30, z: 0 },
  obstacles: carve(72, 52, ROOT_CELLAR_ROOMS),
  water: [rectBox([3, 13, 10, 19])],
  vents: [{ x: 32.5, z: 15, period: 4, offset: 2 }],
  gates: [{ ...rectBox([-4, -2, 2, 2]), hp: 140 }],
  beacons: [{ x: 6, z: 0 }],
  roots: [
    {
      x: 26,
      z: 0,
      knots: [
        { x: 13, z: -10 },
        { x: 13, z: 10 },
        { x: 31, z: -13 },
      ],
      drop: 8,
    },
  ],
  treasures: [
    { id: 'shard-1', x: -8, z: 6, weight: 2 },
    { id: 'shard-2', x: -8, z: -20, weight: 3 },
    { id: 'shard-3', x: -8, z: 20, weight: 4 },
    { id: 'shard-4', x: 6, z: -16, weight: 3 },
    { id: 'shard-5', x: 6, z: 16, weight: 2 },
    { id: 'shard-6', x: 31, z: -17, weight: 4 },
    { id: 'shard-7', x: 31, z: 17, weight: 4 },
  ],
  pods: [
    { x: -20, z: 0, kind: 'dew' },
    { x: -12, z: -6, kind: 'stone' },
    { x: -4, z: -22 },
    { x: -12, z: 22 },
    { x: 5, z: 8 },
    { x: 5, z: -8 },
  ],
  enemies: [
    { x: -4, z: 16, kind: 'mound', reveals: 'sap' },
    { x: 20, z: -16, kind: 'skitter' },
    { x: 22, z: -17, kind: 'skitter' },
    { x: 28, z: 14, kind: 'skitter' },
    { x: 30, z: 12, kind: 'skitter' },
  ],
};

export const DEPTHS: readonly LevelSpec[] = [
  THE_UNDERCROFT,
  THE_CISTERN,
  SKITTER_WARREN,
  THE_ROOT_CELLAR,
];
