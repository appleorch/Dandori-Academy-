import { cornerLedge, terrace, terraces } from '../world/course';
import type { LevelSpec } from '../world/levelTypes';

/**
 * The Frostglass Observatory: the glasshouse dome on the Academy's hill where the Great Clock's
 * time was set by the stars, the story's fourth and last section. Sparklings' ground: the old
 * star machines arc with sparks. The great telescope in the middle hall shows, once looked
 * through, relics no one could see before. Heavy Lodestones crawl the galleries, the hardest
 * beasts guard them, and under the dome the Hollow Warden keeps the Clock's last parts.
 */

const GALLERIES = terraces(
  // The east gallery: the dome's floor, raised; a ramp up from the hall, a ledge back down.
  terrace([60, -60, 112, 60], 4, [
    { side: 'w', from: -6, to: 6, kind: 'ramp' },
    { side: 'w', from: 40, to: 48, kind: 'ledge' },
  ]),
);

const OBS_LEDGE = cornerLedge(240, 160, 'SE');

export const FROSTGLASS_OBSERVATORY: LevelSpec = {
  id: 'campaign-observatory',
  stage: 0,
  name: 'The Frostglass Observatory',
  brief: 'The glasshouse dome where the Clock’s time was set by the stars. Bring Sparklings.',
  theme: 'terrarium',
  wallLook: 'glass',
  props: [
    { kind: 'plant-label', x: -126, z: -86, scale: 1.8, turn: 0.4 },
    { kind: 'pocket-watch', x: 126, z: 86, scale: 1.8 },
    { kind: 'gear', x: -126, z: 86, scale: 2.2, turn: 0.8 },
    { kind: 'thimble', x: 126, z: -86, scale: 1.8 },
  ],
  width: 240,
  depth: 160,
  dayLength: 540,
  platinumTime: 540,
  seed: 9301,
  startingWorkers: 10,
  captain: { x: -106, z: 2 },
  kiln: { x: -110, z: 0 },
  telescope: {
    x: -10,
    z: 0,
    reveals: ['relic-24', 'relic-25', 'relic-26'],
  },
  obstacles: [
    // The high ledge in the corner, reached only by a thrown Sparkling.
    ...OBS_LEDGE.walls,
    // Drops in the west halls, each crossed by a glass floor between two pits.
    { x: -96, z: -61, w: 8, d: 12, look: 'pit' },
    { x: -80, z: -61, w: 8, d: 12, look: 'pit' },
    { x: -82, z: 52, w: 8, d: 12, look: 'pit' },
    { x: -66, z: 52, w: 8, d: 12, look: 'pit' },
    // The secret glade's wall.
    { x: 112, z: -76, w: 2, d: 8 },
    ...GALLERIES.walls,
    // The glass halls: the west hall, the middle hall (with the telescope), and their walls.
    { x: -60, z: -46, w: 2, d: 52 },
    { x: -60, z: 46, w: 2, d: 52 },
    { x: 20, z: -46, w: 2, d: 52 },
    { x: 20, z: 46, w: 2, d: 52 },
    // Star machines, each a block of brass and glass.
    { x: -90, z: -50, w: 6, d: 6 },
    { x: -90, z: 50, w: 6, d: 6 },
    { x: -30, z: -50, w: 8, d: 8 },
    { x: -30, z: 50, w: 8, d: 8 },
    { x: 40, z: -66, w: 6, d: 6 },
    { x: 40, z: 66, w: 6, d: 6 },
  ],
  plateaus: [...GALLERIES.plateaus, ...OBS_LEDGE.plateaus],
  ramps: [...GALLERIES.ramps, ...OBS_LEDGE.ramps],
  ledges: [...GALLERIES.ledges, ...OBS_LEDGE.ledges],
  gates: [
    // The doors between the halls: crystal to the middle hall, bramble to the dome.
    { x: -60, z: 0, w: 2, d: 40, hp: 240, style: 'crystal' },
    { x: 20, z: -12, w: 2, d: 16, hp: 200 },
    // The north and south stores of the west hall.
    { x: -100, z: -70, w: 18, d: 2, hp: 160 },
    { x: -100, z: 70, w: 18, d: 2, hp: 160, style: 'crystal' },
    // A weak stretch of wall, cracked: the way into the secret glade. Last in the
    // list, so saved stories keep every other gate's place.
    { x: 116, z: -72, w: 8, d: 2, hp: 140, style: 'hidden' },
  ],
  glassFloors: [
    { x: -88, z: -61, w: 8, d: 12 },
    { x: -74, z: 52, w: 8, d: 12 },
  ],
  coils: [
    { a: { x: -50, z: -24 }, b: { x: -50, z: -12 }, period: 4, offset: 0 },
    { a: { x: -50, z: 12 }, b: { x: -50, z: 24 }, period: 4, offset: 2 },
    { a: { x: -20, z: -30 }, b: { x: -8, z: -30 }, period: 5, offset: 1 },
    { a: { x: -20, z: 30 }, b: { x: -8, z: 30 }, period: 5, offset: 3 },
    { a: { x: 30, z: -24 }, b: { x: 30, z: -12 }, period: 4, offset: 1 },
    { a: { x: 70, z: -40 }, b: { x: 82, z: -40 }, period: 3, offset: 0 },
    { a: { x: 70, z: 40 }, b: { x: 82, z: 40 }, period: 3, offset: 2 },
  ],
  drips: [
    { x: -80, z: -20, period: 4, offset: 0 },
    { x: 0, z: -60, period: 4, offset: 2 },
    { x: 0, z: 60, period: 3, offset: 1 },
  ],
  beacons: [
    { x: -80, z: 0 },
    { x: -20, z: -10 },
    { x: 40, z: 0 },
    { x: 86, z: 0 },
  ],
  blooms: [
    { x: -90, z: 30, weight: 2, at: 50, lifetime: 70 },
    { x: -10, z: 40, weight: 3, at: 230, lifetime: 70 },
    { x: 96, z: -30, weight: 3, at: 340, lifetime: 70 },
  ],
  // Berry bushes: Emberberries brew Emberbrew, Stillberries Stillwater.
  berries: [
    { x: -99, z: -20, kind: 'ember' },
    { x: -37, z: 0, kind: 'still' },
    { x: 43, z: 30, kind: 'ember' },
    { x: 93, z: 20, kind: 'still' },
  ],
  dewdrops: [
    { x: -96, z: -20 },
    { x: -40, z: 0 },
    { x: 40, z: 30 },
    { x: 90, z: 20 },
  ],
  saps: [
    { x: -80, z: 40 },
    { x: 0, z: -40 },
    { x: 100, z: 50 },
  ],
  treasures: [
    // Up on the corner ledge: a Sparkling's throw away.
    { id: 'ledge-observatory', x: OBS_LEDGE.top.x, z: OBS_LEDGE.top.z, weight: 3 },
    // Buried relics, under mounds with a faint sparkle.
    { id: 'buried-1', x: -100, z: 20, weight: 2, buried: true },
    { id: 'buried-2', x: -10, z: 24, weight: 2, buried: true },
    { id: 'buried-3', x: 70, z: 0, weight: 3, buried: true },
    // The secret, in the glade behind the hidden wall.
    { id: 'secret-observatory', x: 116, z: -76, weight: 2 },
    // The Great Clock's ten parts in the Observatory: its heart and its hands.
    { id: 'part-star-wheel', x: -90, z: -30, weight: 2 },
    { id: 'part-regulator', x: -100, z: -78, weight: 3 },
    { id: 'part-cock-bridge', x: -100, z: 78, weight: 3 },
    { id: 'part-suspension-spring', x: -36, z: -24, weight: 3 },
    { id: 'part-moon-wheel', x: -10, z: -70, weight: 5, variant: 'lodestone' },
    { id: 'part-hour-wheel', x: 4, z: 70, weight: 4 },
    { id: 'part-equation-cam', x: 40, z: -40, weight: 4 },
    { id: 'part-sun-hand', x: 96, z: -50, weight: 4 },
    { id: 'part-star-hand', x: 96, z: 50, weight: 4 },
    { id: 'part-heart-of-the-clock', x: 104, z: 0, weight: 6 },
    // Everything else the Observatory holds.
    { id: 'relic-1', x: -116, z: -40, weight: 1 },
    { id: 'relic-2', x: -80, z: 20, weight: 2 },
    { id: 'relic-3', x: -110, z: 40, weight: 2 },
    { id: 'relic-4', x: -70, z: -66, weight: 2 },
    { id: 'relic-5', x: -76, z: 66, weight: 3, variant: 'lodestone' },
    { id: 'relic-6', x: -40, z: -70, weight: 2 },
    { id: 'relic-7', x: -46, z: 66, weight: 2 },
    { id: 'relic-8', x: -20, z: 16, weight: 2, variant: 'dewglass' },
    { id: 'relic-9', x: 0, z: -20, weight: 3 },
    { id: 'relic-10', x: 8, z: 30, weight: 2 },
    { id: 'relic-11', x: -4, z: 50, weight: 4, variant: 'lodestone' },
    { id: 'relic-12', x: 30, z: 20, weight: 2 },
    { id: 'relic-13', x: 40, z: -14, weight: 3 },
    { id: 'relic-14', x: 50, z: 70, weight: 2 },
    { id: 'relic-15', x: 30, z: -76, weight: 3 },
    { id: 'relic-16', x: 70, z: -20, weight: 2 },
    { id: 'relic-17', x: 76, z: 20, weight: 2 },
    { id: 'relic-18', x: 104, z: -30, weight: 3 },
    { id: 'relic-19', x: 104, z: 30, weight: 3 },
    { id: 'relic-20', x: 90, z: -70, weight: 2 },
    { id: 'relic-21', x: 90, z: 72, weight: 2 },
    { id: 'relic-22', x: -114, z: 70, weight: 2 },
    { id: 'relic-23', x: 50, z: -50, weight: 2 },
    // Shown only by the telescope.
    { id: 'relic-24', x: -116, z: -70, weight: 3 },
    { id: 'relic-25', x: 10, z: -74, weight: 3 },
    { id: 'relic-26', x: 60, z: 74, weight: 3 },
  ],
  pods: [
    { x: -100, z: -10, kind: 'spark' },
    { x: -96, z: 14, kind: 'spark' },
    { x: -86, z: -10 },
    { x: -76, z: 34, kind: 'stone' },
    { x: -70, z: -30, kind: 'stone' },
    { x: -40, z: 30, kind: 'spark' },
    { x: -14, z: -40 },
    { x: 0, z: 40, kind: 'dew' },
    { x: 30, z: 40 },
    { x: 46, z: -30, kind: 'spark' },
    { x: 80, z: -10, kind: 'stone' },
    { x: 90, z: 10 },
  ],
  enemies: [
    // The west hall.
    { x: -84, z: 30, kind: 'mossback' },
    { x: -80, z: -36, kind: 'slug' },
    { x: -110, z: -56, kind: 'mound', drop: 2 },
    { x: -96, z: 60, kind: 'shellback' },
    // The middle hall.
    { x: -36, z: -10, kind: 'hedgehog' },
    { x: -36, z: 36, kind: 'spitter' },
    { x: 0, z: -50, kind: 'shellback' },
    { x: 6, z: 50, kind: 'ramhorn' },
    { x: -14, z: -60, kind: 'skitter' },
    { x: -12, z: -62, kind: 'skitter' },
    { x: -16, z: -62, kind: 'skitter' },
    { x: 10, z: 10, kind: 'mimic' },
    { x: -40, z: 70, kind: 'mound', reveals: 'pod' },
    // The east hall and the dome.
    { x: 40, z: 50, kind: 'waspnest' },
    { x: 36, z: -50, kind: 'moth' },
    { x: 50, z: 20, kind: 'gravelmaw', drop: 6 },
    { x: 86, z: -30, kind: 'hedgehog' },
    { x: 86, z: 30, kind: 'spitter' },
    // Under the dome, the Hollow Warden over the Clock's heart.
    { x: 96, z: 0, kind: 'hollowwarden', drop: 8 },
  ],
};

/** The Observatory's part ids, in the Clock's order. */
export const OBSERVATORY_PARTS = [
  'part-star-wheel',
  'part-regulator',
  'part-cock-bridge',
  'part-suspension-spring',
  'part-moon-wheel',
  'part-hour-wheel',
  'part-equation-cam',
  'part-sun-hand',
  'part-star-hand',
  'part-heart-of-the-clock',
] as const;
