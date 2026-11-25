import { terrace, terraces } from '../world/course';
import type { LevelSpec } from '../world/levelTypes';
import type { Ability } from './upgrades';

/**
 * The story's open grounds, one section at a time. A section is one big field that is played
 * over many days: everything on it stays as the last day left it (see `campaign.ts`). Its
 * Great Clock parts are the story's goal; everything else on it is there to be found.
 */
export interface CampaignSection {
  id: string;
  name: string;
  /** A paragraph for the base camp. */
  brief: string;
  /** The field. Its id is `campaign-<section id>`, and its own day length is a story day. */
  level: LevelSpec;
  /** Ids of the treasures that are Great Clock parts, in the order the Clock lists them. */
  parts: readonly string[];
  /** Parts home, from all sections, before this section can be explored. 0 or absent: open. */
  opensAt?: number;
  /** Parts that cannot be reached without one of the Clock's gifts (a return trip later). */
  needs?: Readonly<Record<string, Ability>>;
}

const QUAD_TERRACES = terraces(
  // The high terrace: a long ramp up its west face, a one-way ledge off its south edge.
  terrace([56, -62, 96, -24], 5, [
    { side: 'w', from: -50, to: -44, kind: 'ramp', length: 6 },
    { side: 's', from: 84, to: 90, kind: 'ledge' },
  ]),
  // The rose terrace: a ramp up from the north.
  terrace([60, 22, 96, 62], 3.5, [{ side: 'n', from: 66, to: 72, kind: 'ramp' }]),
);

/**
 * The Wild Quad: the overgrown quadrangle outside the Academy's east gate, the first of the
 * grounds. A lawn round the Kiln, a hedge garden behind a bramble gate, a lily pond, a river
 * with two bridges to build and a ford, and the old terraces beyond it with a crystal vault
 * and a Gravelmaw. Kinds of Sproutling other than Emberlings are found here as seed pods.
 */
const WILD_QUAD: LevelSpec = {
  id: 'campaign-quad',
  stage: 0,
  name: 'The Wild Quad',
  brief:
    'The overgrown quadrangle beyond the east gate, where the beasts carried most of the Great Clock.',
  theme: 'meadow',
  width: 200,
  depth: 140,
  dayLength: 540,
  platinumTime: 540,
  seed: 9001,
  startingWorkers: 10,
  captain: { x: -78, z: 2 },
  kiln: { x: -82, z: 0 },
  obstacles: [
    ...QUAD_TERRACES.walls,
    // The hedge garden: walled on every side, its way in a bramble gate on the south.
    { x: -41, z: -30, w: 18, d: 2 },
    { x: -8, z: -30, w: 32, d: 2 },
    { x: -50, z: -50, w: 2, d: 40 },
    { x: 8, z: -50, w: 2, d: 40 },
    { x: -34, z: -46, w: 2, d: 24 },
    { x: -14, z: -54, w: 2, d: 28 },
    // The crystal vault between the terraces.
    { x: 60, z: -8, w: 2, d: 16 },
    { x: 79, z: -16, w: 44, d: 2 },
    { x: 79, z: 12, w: 44, d: 2 },
    // Old stones on the lawn and the meadow.
    { x: -56, z: -14, w: 4, d: 4 },
    { x: -46, z: 8, w: 4, d: 6 },
    { x: 36, z: 14, w: 3, d: 3 },
    { x: 30, z: -26, w: 3, d: 3 },
  ],
  plateaus: QUAD_TERRACES.plateaus,
  ramps: QUAD_TERRACES.ramps,
  ledges: QUAD_TERRACES.ledges,
  gates: [
    { x: -28, z: -30, w: 8, d: 2, hp: 200 },
    { x: 60, z: 6, w: 2, d: 12, hp: 220, style: 'crystal' },
  ],
  water: [
    // The river, with two bridge sites and the ford in the far south.
    { x: 14, z: -46, w: 6, d: 48 },
    { x: 14, z: 2, w: 6, d: 32 },
    { x: 14, z: 41, w: 6, d: 30 },
    // The lily pond.
    { x: -26, z: 36, w: 30, d: 24 },
  ],
  bridges: [
    { x: 14, z: -18, w: 6, d: 8, bank: { x: 8.5, z: -18 }, needs: 2 },
    { x: 14, z: 22, w: 6, d: 8, bank: { x: 8.5, z: 22 }, needs: 3 },
  ],
  logs: [
    { x: -40, z: -20 },
    { x: -10, z: -12 },
    { x: -28, z: 14 },
    { x: 0, z: 10 },
    { x: -4, z: -24 },
  ],
  beacons: [
    { x: -24, z: -40 },
    { x: -4, z: 30 },
    { x: 26, z: 6 },
    { x: 70, z: 0 },
  ],
  vents: [
    { x: -74, z: -60, period: 5, offset: 1 },
    { x: -62, z: -56, period: 4, offset: 3 },
    { x: 46, z: -32, period: 4, offset: 0 },
  ],
  coils: [
    { a: { x: -88, z: 52 }, b: { x: -80, z: 52 }, period: 4, offset: 2 },
    { a: { x: -70, z: 62 }, b: { x: -64, z: 62 }, period: 5, offset: 0 },
  ],
  drips: [
    { x: -30, z: 54, period: 4, offset: 0 },
    { x: -22, z: 56, period: 4, offset: 2 },
    { x: -14, z: 54, period: 3, offset: 1 },
    { x: 40, z: 22, period: 4, offset: 1 },
    { x: 46, z: 26, period: 4, offset: 3 },
  ],
  blooms: [
    { x: -56, z: 22, weight: 2, at: 40, lifetime: 70 },
    { x: -20, z: -20, weight: 3, at: 200, lifetime: 70 },
    { x: 32, z: -16, weight: 3, at: 320, lifetime: 70 },
  ],
  // Dewdrops of nectar on the plants: they grow back every morning.
  dewdrops: [
    { x: -62, z: 14 },
    { x: -41, z: 4 },
    { x: -20, z: -40 },
    { x: 28, z: 30 },
    { x: 73, z: -3 },
  ],
  saps: [
    { x: -44, z: 0 },
    { x: -44, z: -66 },
    { x: 70, z: -6 },
  ],
  treasures: [
    // The Great Clock's twelve parts.
    { id: 'part-mainspring', x: -62, z: -34, weight: 3 },
    { id: 'part-escapement', x: -4, z: -60, weight: 4 },
    { id: 'part-pendulum', x: -26, z: 40, weight: 3 },
    { id: 'part-crown-wheel', x: -74, z: -58, weight: 2 },
    { id: 'part-chime-hammer', x: -84, z: 52, weight: 2 },
    { id: 'part-hour-hand', x: 40, z: -2, weight: 4 },
    { id: 'part-balance-wheel', x: 84, z: -2, weight: 4 },
    { id: 'part-moon-dial', x: 84, z: 46, weight: 3 },
    { id: 'part-fusee', x: 88, z: -52, weight: 4 },
    { id: 'part-bell-housing', x: 74, z: 52, weight: 6, variant: 'lodestone' },
    { id: 'part-winding-key', x: 40, z: 62, weight: 3 },
    { id: 'part-minute-hand', x: 44, z: 24, weight: 3, variant: 'dewglass' },
    // Everything else the Quad holds.
    { id: 'relic-1', x: -70, z: -14, weight: 1 },
    { id: 'relic-2', x: -66, z: 16, weight: 2 },
    { id: 'relic-3', x: -58, z: 4, weight: 2 },
    { id: 'relic-4', x: -90, z: -40, weight: 1 },
    { id: 'relic-5', x: -88, z: 40, weight: 2 },
    { id: 'relic-6', x: -62, z: -54, weight: 2 },
    { id: 'relic-7', x: -67, z: 62, weight: 1 },
    { id: 'relic-8', x: -42, z: -60, weight: 2 },
    { id: 'relic-9', x: -24, z: -46, weight: 3 },
    { id: 'relic-10', x: -22, z: -64, weight: 2 },
    { id: 'relic-11', x: -34, z: 30, weight: 2 },
    { id: 'relic-12', x: -18, z: 44, weight: 2 },
    { id: 'relic-13', x: -22, z: 58, weight: 3 },
    { id: 'relic-14', x: -30, z: -12, weight: 3 },
    { id: 'relic-15', x: -16, z: 4, weight: 4 },
    { id: 'relic-16', x: 28, z: -40, weight: 3 },
    { id: 'relic-17', x: 24, z: 40, weight: 4 },
    { id: 'relic-18', x: 46, z: -30, weight: 2 },
    { id: 'relic-19', x: 66, z: -56, weight: 3 },
    { id: 'relic-20', x: 90, z: 6, weight: 3 },
    { id: 'relic-21', x: 90, z: 30, weight: 2 },
    { id: 'relic-22', x: 52, z: 58, weight: 2 },
  ],
  pods: [
    { x: -74, z: -20 },
    { x: -72, z: 22 },
    { x: -60, z: -6 },
    { x: -44, z: -50, kind: 'spark' },
    { x: -40, z: -38, kind: 'spark' },
    { x: -46, z: 20, kind: 'dew' },
    { x: -8, z: 52, kind: 'dew' },
    { x: -40, z: -4 },
    { x: 26, z: -30 },
    { x: 88, z: 26, kind: 'stone' },
    { x: 92, z: 36, kind: 'stone' },
    { x: 50, z: 10, kind: 'stone' },
  ],
  enemies: [
    // The lawn.
    { x: -60, z: -30, kind: 'mossback' },
    { x: -86, z: -28, kind: 'mound', reveals: 'pod' },
    { x: -64, z: 30, kind: 'mound', drop: 2 },
    { x: -92, z: 14, kind: 'mound', reveals: 'sap' },
    // The hedge garden.
    { x: -6, z: -46, kind: 'skitter' },
    { x: -4, z: -48, kind: 'skitter' },
    { x: -8, z: -49, kind: 'skitter' },
    { x: -40, z: -64, kind: 'mossback' },
    { x: -8, z: -36, kind: 'mound', reveals: 'pod' },
    // The middle field and the pond.
    { x: -20, z: -4, kind: 'ramhorn' },
    { x: -36, z: 8, kind: 'mound', reveals: 'pod' },
    { x: -6, z: 14, kind: 'mound', drop: 3 },
    { x: -42, z: 58, kind: 'mossback' },
    // Over the river.
    { x: 34, z: -10, kind: 'mossback' },
    { x: 32, z: 32, kind: 'mossback' },
    { x: 46, z: 46, kind: 'spitter' },
    { x: 22, z: 62, kind: 'ramhorn' },
    { x: 36, z: 58, kind: 'skitter' },
    { x: 38, z: 60, kind: 'skitter' },
    { x: 42, z: 58, kind: 'skitter' },
    // The terraces and the vault.
    { x: 76, z: -44, kind: 'gravelmaw', drop: 6 },
    { x: 80, z: 32, kind: 'skitter' },
    { x: 82, z: 35, kind: 'skitter' },
    { x: 86, z: 4, kind: 'spitter' },
    // Added in 0.24.0, at the end so that saved stories keep their places in this list.
    { x: -42, z: 30, kind: 'moth' },
    { x: -30, z: -20, kind: 'grub' },
    { x: 50, z: -40, kind: 'shellback' },
    { x: -10, z: 40, kind: 'slug' },
    { x: 11, z: -50, kind: 'newt' },
    { x: 20, z: 20, kind: 'hedgehog' },
    { x: 59, z: 30, kind: 'mimic' },
    { x: 70, z: -50, kind: 'waspnest' },
  ],
};

export const CAMPAIGN_SECTIONS: readonly CampaignSection[] = [
  {
    id: 'quad',
    name: 'The Wild Quad',
    brief:
      'The quadrangle beyond the east gate has run wild since the Great Clock stopped. Its beasts carried off the twelve parts of the Clock’s movement, and scattered them over the lawn, the hedge garden, the lily pond and the old terraces across the river. Find them, in any order, over as many days as it takes.',
    level: WILD_QUAD,
    parts: WILD_QUAD.treasures
      .filter((treasure) => treasure.id.startsWith('part-'))
      .map((treasure) => treasure.id),
    // Two parts need one of the Clock's own gifts first: come back for them.
    needs: { 'part-fusee': 'lantern', 'part-bell-housing': 'bridgekit' },
  },
];

export function sectionById(id: string): CampaignSection | undefined {
  return CAMPAIGN_SECTIONS.find((section) => section.id === id);
}
