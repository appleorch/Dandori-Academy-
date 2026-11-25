import { terrace, terraces } from '../world/course';
import type { LevelSpec } from '../world/levelTypes';

/**
 * The Clockwork Foundry: the forge where the Great Clock was cast, at dusk, the story's third
 * section. Emberlings' ground: flame vents breathe everywhere, and the furnace floor is laid
 * with conveyor belts that carry hauls (and anyone on foot) where they run. The Foundry climbs
 * in three tiers, the casting floor at the bottom, the pattern loft on a terrace above it, and
 * the bell tower's top on a terrace above that; ramps lead up, ledges drop back down. The
 * Galewing roosts on the tower top over the last part.
 */

const TIERS = terraces(
  // The pattern loft: a broad terrace across the north, a ramp up from the casting floor.
  terrace([-70, -92, 90, -12], 4, [
    { side: 's', from: -60, to: -52, kind: 'ramp' },
    { side: 's', from: 20, to: 28, kind: 'ledge' },
  ]),
  // The tower top, standing on the loft: a ramp up from the loft, a ledge back down to it.
  terrace(
    [24, -88, 86, -44],
    8,
    [
      { side: 'w', from: -80, to: -72, kind: 'ramp' },
      { side: 's', from: 60, to: 68, kind: 'ledge' },
    ],
    4,
  ),
);

export const CLOCKWORK_FOUNDRY: LevelSpec = {
  id: 'campaign-foundry',
  stage: 0,
  name: 'The Clockwork Foundry',
  brief: 'The forge where the Great Clock was cast. Bring Emberlings.',
  theme: 'dusk',
  wallLook: 'brick',
  props: [
    { kind: 'gear', x: -106, z: -60, scale: 2.2, turn: 0.4 },
    { kind: 'candle', x: 106, z: 70, scale: 1.8 },
    { kind: 'pocket-watch', x: -106, z: 96, scale: 1.6, turn: 1.1 },
    { kind: 'thimble', x: 106, z: -100, scale: 1.8 },
  ],
  width: 200,
  depth: 200,
  dayLength: 540,
  platinumTime: 540,
  seed: 9201,
  startingWorkers: 10,
  captain: { x: -84, z: 82 },
  kiln: { x: -88, z: 86 },
  obstacles: [
    ...TIERS.walls,
    // Furnaces on the casting floor, each a block of brick.
    { x: -30, z: 40, w: 10, d: 10 },
    { x: 30, z: 40, w: 10, d: 10 },
    { x: 0, z: 70, w: 10, d: 8 },
    { x: 70, z: 30, w: 8, d: 12 },
    // The moulding shop's walls in the south-east, its door a crystal gate.
    { x: 50, z: 60, w: 2, d: 30 },
    { x: 76, z: 46, w: 52, d: 2 },
  ],
  plateaus: TIERS.plateaus,
  ramps: TIERS.ramps,
  ledges: TIERS.ledges,
  gates: [
    // The moulding shop's door, crystal.
    { x: 50, z: 84, w: 2, d: 18, hp: 200, style: 'crystal' },
    // The coal store under the loft's west end.
    { x: -82, z: 0, w: 14, d: 2, hp: 160 },
    // A crystal case on the loft.
    { x: -20, z: -60, w: 2, d: 12, hp: 220, style: 'crystal' },
    // The tower's iron door at the foot of its ramp, bramble-grown.
    { x: 12, z: -76, w: 2, d: 8, hp: 200 },
  ],
  conveyors: [
    // The long belt home along the south of the casting floor, running west to the Kiln.
    { x: -10, z: 92, w: 120, d: 6, dx: -1, dz: 0 },
    // A belt down the middle of the floor, running south to meet it.
    { x: 0, z: 20, w: 6, d: 40, dx: 0, dz: 1 },
    // A contrary belt by the east furnace, running away from home.
    { x: 70, z: 6, w: 30, d: 6, dx: 1, dz: 0 },
  ],
  vents: [
    { x: -40, z: 30, period: 4, offset: 0 },
    { x: -20, z: 30, period: 4, offset: 2 },
    { x: 20, z: 30, period: 5, offset: 1 },
    { x: 40, z: 30, period: 5, offset: 3 },
    { x: -10, z: 60, period: 4, offset: 1 },
    { x: 10, z: 60, period: 4, offset: 3 },
    { x: 80, z: 16, period: 3, offset: 0 },
    { x: -50, z: -40, period: 4, offset: 2 },
    { x: 40, z: -30, period: 5, offset: 0 },
    { x: 60, z: -60, period: 4, offset: 1 },
  ],
  beacons: [
    { x: -40, z: 70 },
    { x: 20, z: 10 },
    { x: -40, z: -30 },
    { x: 54, z: -64 },
  ],
  blooms: [
    { x: -70, z: 50, weight: 2, at: 50, lifetime: 70 },
    { x: 40, z: -20, weight: 3, at: 230, lifetime: 70 },
    { x: 90, z: 80, weight: 3, at: 340, lifetime: 70 },
  ],
  dewdrops: [
    { x: -74, z: 66 },
    { x: -20, z: 10 },
    { x: 60, z: -30 },
    { x: 80, z: 70 },
  ],
  saps: [
    { x: -60, z: 30 },
    { x: 30, z: -30 },
    { x: 90, z: 56 },
  ],
  treasures: [
    // The Great Clock's ten parts in the Foundry: its case and its face.
    { id: 'part-dial-plate', x: -60, z: 60, weight: 2 },
    { id: 'part-chapter-ring', x: -82, z: 8, weight: 3 },
    { id: 'part-motion-work', x: 20, z: 50, weight: 3 },
    { id: 'part-bezel', x: 76, z: 76, weight: 4 },
    { id: 'part-pendulum-rod', x: 90, z: 20, weight: 4 },
    { id: 'part-crutch', x: -30, z: -60, weight: 3 },
    { id: 'part-seatboard', x: 10, z: -40, weight: 5, variant: 'lodestone' },
    { id: 'part-weights', x: 60, z: -24, weight: 6 },
    { id: 'part-hand-nut', x: 40, z: -70, weight: 2 },
    { id: 'part-great-dial', x: 70, z: -80, weight: 5 },
    // Everything else the Foundry holds.
    { id: 'relic-1', x: -92, z: 50, weight: 1 },
    { id: 'relic-2', x: -70, z: 76, weight: 2 },
    { id: 'relic-3', x: -50, z: 50, weight: 2 },
    { id: 'relic-4', x: -40, z: 84, weight: 2 },
    { id: 'relic-5', x: -10, z: 50, weight: 2 },
    { id: 'relic-6', x: 14, z: 84, weight: 3 },
    { id: 'relic-7', x: 40, z: 60, weight: 2 },
    { id: 'relic-8', x: 64, z: 60, weight: 3 },
    { id: 'relic-9', x: 90, z: 64, weight: 2 },
    { id: 'relic-10', x: -60, z: 10, weight: 2 },
    { id: 'relic-11', x: -20, z: 0, weight: 3 },
    { id: 'relic-12', x: 40, z: 14, weight: 2 },
    { id: 'relic-13', x: 92, z: 0, weight: 2 },
    { id: 'relic-14', x: -92, z: 10, weight: 2 },
    { id: 'relic-15', x: -60, z: -70, weight: 2 },
    { id: 'relic-16', x: -40, z: -80, weight: 3 },
    { id: 'relic-17', x: -10, z: -30, weight: 2 },
    { id: 'relic-18', x: -8, z: -84, weight: 3 },
    { id: 'relic-19', x: 20, z: -20, weight: 2 },
    { id: 'relic-20', x: 34, z: -54, weight: 2 },
    { id: 'relic-21', x: 50, z: -84, weight: 3 },
    { id: 'relic-22', x: 80, z: -60, weight: 2 },
    { id: 'relic-23', x: 80, z: -30, weight: 2 },
    { id: 'relic-24', x: -92, z: -40, weight: 2 },
    { id: 'relic-25', x: 92, z: -96, weight: 2 },
    { id: 'relic-26', x: -30, z: 96, weight: 2, variant: 'dewglass' },
  ],
  pods: [
    { x: -76, z: 72 },
    { x: -66, z: 86 },
    { x: -50, z: 70 },
    { x: -60, z: 40, kind: 'stone' },
    { x: -40, z: 10, kind: 'stone' },
    { x: 10, z: 30 },
    { x: 30, z: 70 },
    { x: 60, z: 70, kind: 'spark' },
    { x: -50, z: -20 },
    { x: 0, z: -60, kind: 'stone' },
    { x: 70, z: -40 },
    { x: 90, z: 40, kind: 'dew' },
  ],
  enemies: [
    // The casting floor.
    { x: -50, z: 60, kind: 'mossback' },
    { x: -20, z: 70, kind: 'mound', drop: 2 },
    { x: 10, z: 40, kind: 'hedgehog' },
    { x: -10, z: 20, kind: 'spitter' },
    { x: 40, z: 76, kind: 'ramhorn' },
    { x: 80, z: 86, kind: 'shellback' },
    { x: 60, z: 30, kind: 'waspnest' },
    { x: -70, z: 20, kind: 'slug' },
    { x: 86, z: 50, kind: 'mound', reveals: 'pod' },
    // The pattern loft.
    { x: -50, z: -60, kind: 'mossback' },
    { x: -30, z: -40, kind: 'skitter' },
    { x: -28, z: -42, kind: 'skitter' },
    { x: -32, z: -42, kind: 'skitter' },
    { x: 0, z: -24, kind: 'mimic' },
    { x: 10, z: -60, kind: 'spitter' },
    { x: -60, z: -84, kind: 'mound', drop: 3 },
    { x: 80, z: -20, kind: 'hedgehog' },
    // The tower top, and its roosting boss.
    { x: 40, z: -50, kind: 'moth' },
    { x: 60, z: -76, kind: 'galewing', drop: 6 },
  ],
};

/** The Foundry's part ids, in the Clock's order. */
export const FOUNDRY_PARTS = [
  'part-dial-plate',
  'part-chapter-ring',
  'part-motion-work',
  'part-bezel',
  'part-pendulum-rod',
  'part-crutch',
  'part-seatboard',
  'part-weights',
  'part-hand-nut',
  'part-great-dial',
] as const;
