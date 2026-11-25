import type { LevelSpec } from '../world/levelTypes';

/**
 * The Sunken Orchard: an old fruit orchard half drowned by a burst cistern, the story's second
 * section. Dewlings are the stars here. The Warden lands on a dry meadow in the west and learns
 * the ground in a first loop round it; from there three landmarks can be seen across the water:
 *
 * - **The Crate Yard** (north-west): a giant fallen apple crate, its slats the walls of a yard,
 *   its way in a bramble gate, with flooded drains behind it.
 * - **Watering Can Island** (the middle): a dry island in a ring of water, a sunken watering can
 *   on it, reached by a bridge to build or by Dewlings through the water.
 * - **The Root Hollow** (the east): an old tree whose roots make a cave mouth (two parts lie
 *   below, in the Root Cellar), and beyond it the Mire Lord's pond with the last part.
 *
 * The south road folds back on itself: a shortcut gate opens from the Root Hollow to the
 * landing meadow, and a hidden wall in the crate hides a secret store.
 */

/** Walls of the giant crate: a yard of slats with a gap for the bramble gate. */
const CRATE = [
  { x: -52, z: -40, w: 2, d: 28, look: 'fence' as const },
  { x: -22, z: -40, w: 2, d: 28, look: 'fence' as const },
  { x: -37, z: -54, w: 32, d: 2, look: 'fence' as const },
  { x: -46, z: -26, w: 10, d: 2, look: 'fence' as const },
  { x: -28, z: -26, w: 10, d: 2, look: 'fence' as const },
  // The crate's back room: a store behind a weak board (the hidden wall).
  { x: -37, z: -46, w: 2, d: 14, look: 'fence' as const },
];

/** The great tree's roots, round the cave mouth. */
const ROOTS = [
  { x: 62, z: -40, w: 3, d: 14, look: 'root' as const },
  { x: 82, z: -40, w: 3, d: 14, look: 'root' as const },
  { x: 72, z: -50, w: 20, d: 3, look: 'root' as const },
];

export const SUNKEN_ORCHARD: LevelSpec = {
  id: 'campaign-orchard',
  stage: 0,
  name: 'The Sunken Orchard',
  brief: 'An old orchard half drowned by the burst cistern. Bring Dewlings.',
  theme: 'marsh',
  wallLook: 'root',
  props: [
    { kind: 'watering-can', x: 28, z: -13, scale: 0.8, turn: 0.6 },
    { kind: 'lily-pad', x: -10, z: -28, scale: 1.2 },
    { kind: 'teacup', x: 112, z: -78, scale: 1.8 },
    { kind: 'flowerpot', x: -112, z: 78, scale: 2 },
  ],
  width: 220,
  depth: 160,
  dayLength: 540,
  platinumTime: 540,
  seed: 9101,
  startingWorkers: 10,
  captain: { x: -92, z: 2 },
  kiln: { x: -96, z: 0 },
  descent: { x: 72, z: -40, to: 'campaign-orchard-roots' },
  obstacles: [
    ...CRATE,
    ...ROOTS,
    // Old fruit trees standing in rows on the meadow and the south road.
    { x: -78, z: -52, w: 4, d: 4 },
    { x: -78, z: 46, w: 4, d: 4 },
    { x: -60, z: 56, w: 4, d: 4 },
    { x: -2, z: 62, w: 4, d: 4 },
    { x: 26, z: -62, w: 4, d: 4 },
    { x: 54, z: 6, w: 4, d: 4 },
    // The hedge between the Root Hollow and the south road, its way through a shortcut gate.
    { x: 54, z: 34, w: 2, d: 30 },
    { x: 54, z: 72, w: 2, d: 16 },
  ],
  gates: [
    // The crate's bramble door.
    { x: -37, z: -26, w: 8, d: 2, hp: 180 },
    // The hidden board in the crate's back room.
    { x: -37, z: -36, w: 2, d: 6, hp: 120 },
    // The shortcut through the hedge, from the Root Hollow to the south road.
    { x: 54, z: 58, w: 2, d: 12, hp: 160 },
  ],
  water: [
    // The ring of water round Watering Can Island.
    { x: 6, z: -22, w: 70, d: 10 },
    { x: 6, z: 32, w: 70, d: 10 },
    // The west and east arms, split round the two bridge sites.
    { x: -25, z: -8, w: 8, d: 18 },
    { x: -25, z: 18, w: 8, d: 18 },
    { x: 37, z: -8, w: 8, d: 18 },
    { x: 37, z: 18, w: 8, d: 18 },
    // The flooded drains behind the crate, and along the east of the south road.
    { x: -36, z: -68, w: 36, d: 6 },
    { x: 18, z: 68, w: 40, d: 6 },
    // The Mire Lord's pond.
    { x: 86, z: 42, w: 28, d: 22 },
  ],
  bridges: [
    { x: -25, z: 5, w: 8, d: 8, bank: { x: -31, z: 5 }, needs: 3 },
    { x: 37, z: 5, w: 8, d: 8, bank: { x: 43, z: 5 }, needs: 2 },
  ],
  logs: [
    { x: -70, z: 12 },
    { x: -60, z: -10 },
    { x: -46, z: 18 },
    { x: 48, z: -14 },
    { x: 66, z: -8 },
  ],
  beacons: [
    { x: -40, z: -34 },
    { x: 6, z: 12 },
    { x: 72, z: -20 },
    { x: 66, z: 22 },
  ],
  drips: [
    { x: -76, z: -48, period: 4, offset: 0 },
    { x: -74, z: 50, period: 4, offset: 2 },
    { x: 0, z: 58, period: 3, offset: 1 },
    { x: 30, z: -58, period: 4, offset: 3 },
  ],
  blooms: [
    { x: -84, z: 30, weight: 2, at: 40, lifetime: 70 },
    { x: 14, z: 14, weight: 3, at: 220, lifetime: 70 },
    { x: 90, z: -10, weight: 3, at: 330, lifetime: 70 },
  ],
  dewdrops: [
    { x: -84, z: -14 },
    { x: -44, z: -46 },
    { x: -4, z: 8 },
    { x: 70, z: 0 },
    { x: 40, z: 52 },
  ],
  saps: [
    { x: -66, z: 30 },
    { x: 10, z: -6 },
    { x: 96, z: 14 },
  ],
  treasures: [
    // The Great Clock's ten parts in the Orchard.
    { id: 'part-click-spring', x: -80, z: -28, weight: 2 },
    { id: 'part-third-wheel', x: -30, z: -48, weight: 3 },
    { id: 'part-pinion', x: -36, z: -68, weight: 2 },
    { id: 'part-rack-hook', x: -25, z: -10, weight: 3 },
    { id: 'part-fly-fan', x: 14, z: 2, weight: 6 },
    { id: 'part-going-barrel', x: 10, z: 32, weight: 3 },
    { id: 'part-cannon-pinion', x: 18, z: 68, weight: 2 },
    { id: 'part-strike-train', x: 100, z: 56, weight: 4 },
    // Everything else the Orchard holds.
    { id: 'relic-1', x: -100, z: -30, weight: 1 },
    { id: 'relic-2', x: -88, z: 22, weight: 2 },
    { id: 'relic-3', x: -70, z: -2, weight: 2 },
    { id: 'relic-4', x: -104, z: 60, weight: 2 },
    { id: 'relic-5', x: -96, z: -64, weight: 1 },
    { id: 'relic-6', x: -46, z: -34, weight: 2 },
    { id: 'relic-7', x: -30, z: -34, weight: 2 },
    { id: 'relic-8', x: -42, z: -50, weight: 3 },
    { id: 'relic-9', x: -10, z: -68, weight: 2 },
    { id: 'relic-10', x: -60, z: -66, weight: 2 },
    { id: 'relic-11', x: -2, z: -4, weight: 2 },
    { id: 'relic-12', x: 22, z: 16, weight: 3 },
    { id: 'relic-13', x: -12, z: 18, weight: 2 },
    { id: 'relic-14', x: 30, z: -22, weight: 2 },
    { id: 'relic-15', x: -40, z: 44, weight: 3 },
    { id: 'relic-16', x: -20, z: 56, weight: 2 },
    { id: 'relic-17', x: 30, z: 52, weight: 3 },
    { id: 'relic-18', x: 6, z: -40, weight: 2 },
    { id: 'relic-19', x: 46, z: -40, weight: 3 },
    { id: 'relic-20', x: 72, z: -30, weight: 2 },
    { id: 'relic-21', x: 96, z: -40, weight: 2 },
    { id: 'relic-22', x: 100, z: -66, weight: 3 },
    { id: 'relic-23', x: 66, z: 12, weight: 2 },
    { id: 'relic-24', x: 76, z: 66, weight: 2 },
    { id: 'relic-25', x: 46, z: 74, weight: 2, variant: 'dewglass' },
    { id: 'relic-26', x: -60, z: 70, weight: 3 },
  ],
  pods: [
    { x: -84, z: 8, kind: 'dew' },
    { x: -78, z: -10, kind: 'dew' },
    { x: -66, z: 40, kind: 'dew' },
    { x: -70, z: -40 },
    { x: -100, z: 40 },
    { x: -34, z: -40, kind: 'stone' },
    { x: -8, z: 12, kind: 'dew' },
    { x: 18, z: -6 },
    { x: 60, z: -24, kind: 'spark' },
    { x: 90, z: 0, kind: 'stone' },
    { x: 30, z: 60, kind: 'dew' },
    { x: -40, z: 62 },
  ],
  enemies: [
    // The landing meadow: gentle.
    { x: -74, z: 24, kind: 'mossback' },
    { x: -100, z: -50, kind: 'mound', drop: 2 },
    { x: -86, z: 52, kind: 'mound', reveals: 'pod' },
    { x: -64, z: -26, kind: 'slug' },
    // The Crate Yard and its drains.
    { x: -44, z: -42, kind: 'skitter' },
    { x: -42, z: -40, kind: 'skitter' },
    { x: -46, z: -40, kind: 'skitter' },
    { x: -54, z: -68, kind: 'newt' },
    { x: -18, z: -66, kind: 'moth' },
    { x: -42, z: -50, kind: 'mound', drop: 3 },
    // Watering Can Island and its ring.
    { x: 0, z: -22, kind: 'newt' },
    { x: 18, z: 32, kind: 'newt' },
    { x: 12, z: 20, kind: 'spitter' },
    { x: -6, z: -6, kind: 'mimic' },
    { x: 24, z: -6, kind: 'mossback' },
    // The south road.
    { x: -50, z: 56, kind: 'ramhorn' },
    { x: -14, z: 46, kind: 'mossback' },
    { x: 8, z: 50, kind: 'hedgehog' },
    { x: -30, z: 70, kind: 'mound', drop: 2 },
    { x: 36, z: 64, kind: 'moth' },
    // The Root Hollow.
    { x: 48, z: -50, kind: 'spitter' },
    { x: 92, z: -56, kind: 'shellback' },
    { x: 96, z: -20, kind: 'mossback' },
    { x: 80, z: -14, kind: 'waspnest' },
    { x: 64, z: 46, kind: 'mound', reveals: 'sap' },
    // The Mire Lord's pond, and the last part beside it.
    { x: 74, z: 42, kind: 'mirelord', drop: 6 },
  ],
};

/** The Root Cellar, under the great tree in the Root Hollow: two parts lie here. */
export const ORCHARD_ROOTS: LevelSpec = {
  id: 'campaign-orchard-roots',
  stage: 0,
  side: true,
  name: 'The Root Cellar',
  theme: 'cave',
  brief: 'A cellar of roots under the great tree, cold and dripping.',
  wallLook: 'root',
  width: 70,
  depth: 46,
  dayLength: 540,
  platinumTime: 540,
  seed: 9102,
  startingWorkers: 0,
  captain: { x: -28, z: 0 },
  kiln: { x: -31, z: 0 },
  // A second way down, to the Sunken Cistern under the cellar.
  descent: { x: 28, z: -4, to: 'campaign-orchard-deep' },
  obstacles: [
    { x: -10, z: -10, w: 3, d: 22 },
    { x: 10, z: 12, w: 3, d: 22 },
    { x: 24, z: -12, w: 3, d: 14 },
  ],
  water: [{ x: 0, z: 18, w: 14, d: 8 }],
  drips: [
    { x: -4, z: -16, period: 4, offset: 0 },
    { x: 16, z: 4, period: 3, offset: 1 },
  ],
  beacons: [{ x: 4, z: -4 }],
  treasures: [
    { id: 'part-pallet-fork', x: 18, z: -16, weight: 3 },
    { id: 'relic-27', x: -18, z: 14, weight: 2 },
    { id: 'relic-28', x: 0, z: 18, weight: 2 },
    { id: 'relic-29', x: 0, z: -16, weight: 2 },
  ],
  pods: [],
  enemies: [
    { x: 4, z: 8, kind: 'skitter' },
    { x: 6, z: 10, kind: 'skitter' },
    { x: 22, z: 4, kind: 'slug' },
  ],
};

/** The Sunken Cistern, the second floor down, under the Root Cellar: the Centre Arbor is here. */
export const ORCHARD_DEEP: LevelSpec = {
  id: 'campaign-orchard-deep',
  stage: 0,
  side: true,
  name: 'The Sunken Cistern',
  theme: 'cave',
  brief: 'The burst cistern itself, deep under the tree: black water and old brick.',
  wallLook: 'brick',
  width: 60,
  depth: 40,
  dayLength: 540,
  platinumTime: 540,
  seed: 9103,
  startingWorkers: 0,
  captain: { x: -24, z: 0 },
  kiln: { x: -27, z: 0 },
  obstacles: [
    { x: -4, z: -12, w: 3, d: 14 },
    { x: 12, z: 10, w: 3, d: 18 },
  ],
  water: [{ x: 4, z: 12, w: 10, d: 12 }],
  beacons: [{ x: 0, z: 0 }],
  drips: [{ x: 8, z: -10, period: 4, offset: 1 }],
  treasures: [
    { id: 'part-centre-arbor', x: 22, z: -10, weight: 4 },
    { id: 'relic-30', x: 4, z: 14, weight: 2 },
    { id: 'relic-31', x: -14, z: 12, weight: 2 },
  ],
  pods: [],
  enemies: [
    { x: 4, z: 8, kind: 'newt' },
    { x: 18, z: -2, kind: 'slug' },
  ],
};

/** The Orchard's part ids, the cave's included, in the Clock's order. */
export const ORCHARD_PARTS = [
  'part-click-spring',
  'part-third-wheel',
  'part-pinion',
  'part-rack-hook',
  'part-fly-fan',
  'part-going-barrel',
  'part-cannon-pinion',
  'part-pallet-fork',
  'part-centre-arbor',
  'part-strike-train',
] as const;
