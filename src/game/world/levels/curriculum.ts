import { rectBox } from '../carve';
import { ruin, terrace, terraces } from '../course';
import type { LevelSpec } from '../levelTypes';

/**
 * The Grand Curriculum: five final examinations in the old Terrarium of the Grand
 * Botanical & Clockwork Academy. Each is a multi-zone course several times the size of
 * a term lesson, and each adds one routing idea:
 *
 * 1. Terrace Gardens: raised terraces. Emberlings can be thrown up a cliff; hauls must
 *    come down by the ramps.
 * 2. The Long Drop: a high plateau that is a long walk up and a short drop down. One-way
 *    ledges are the fast way home.
 * 3. Crystal Conservatory: wings sealed by crystal gates, each with an outpost to move
 *    the base forward once it is lit.
 * 4. Clockwork Causeway: two ways across a channel: the short causeway under drips and
 *    crossfire, or a bridge far upstream that has to be built first.
 * 5. Restoration Day: all of it at once, and a Gravelmaw in the far gardens.
 */

const GARDEN_TERRACES = terraces(
  terrace([-56, -46, -20, -14], 3.75, [{ side: 's', from: -46, to: -40, kind: 'ramp' }]),
  terrace([-10, 14, 34, 46], 3.75, [{ side: 'n', from: -4, to: 2, kind: 'ramp' }]),
  terrace([40, -48, 80, -8], 6, [{ side: 'w', from: -32, to: -26, kind: 'ramp', length: 7 }]),
  terrace([50, 14, 84, 50], 3, [{ side: 'w', from: 28, to: 34, kind: 'ramp' }]),
);

const TERRACE_GARDENS: LevelSpec = {
  id: 'terrace-gardens',
  stage: 23,
  name: 'Terrace Gardens',
  theme: 'terrarium',
  brief:
    'The first examination, on the old garden terraces. Sproutlings can be thrown up a cliff, but whatever they lift has to come down by a ramp. Send the squad up, walk round to meet the haul. A coil, a pool and a vent in the lower gardens each want their own kind.',
  width: 176,
  depth: 116,
  dayLength: 900,
  platinumTime: 530,
  seed: 23,
  startingWorkers: 20,
  squad: { ember: 10, dew: 4, stone: 3, spark: 3 },
  water: [rectBox([16, -4, 24, 4])],
  vents: [{ x: 1.5, z: -22, period: 4, offset: 1 }],
  coils: [{ a: { x: -63, z: 8 }, b: { x: -57, z: 8 }, period: 4, offset: 2 }],
  captain: { x: -77, z: 2 },
  kiln: { x: -80, z: 0 },
  obstacles: [
    ...GARDEN_TERRACES.walls,
    ruin([-40, 10, -38, 34]),
    ruin([10, -30, 30, -28]),
    ruin([-66, 30, -46, 32]),
  ],
  plateaus: GARDEN_TERRACES.plateaus,
  ramps: GARDEN_TERRACES.ramps,
  ledges: GARDEN_TERRACES.ledges,
  blooms: [{ x: 40, z: -2, weight: 3, at: 160, lifetime: 70 }],
  treasures: [
    { id: 'relic-1', x: -60, z: 8, weight: 2 },
    { id: 'relic-2', x: -30, z: 24, weight: 3 },
    { id: 'relic-3', x: 0, z: -20, weight: 3 },
    { id: 'relic-4', x: 20, z: 0, weight: 3 },
    { id: 'relic-5', x: -38, z: -30, weight: 4 },
    { id: 'relic-6', x: -48, z: -22, weight: 2 },
    { id: 'relic-7', x: 12, z: 30, weight: 5 },
    { id: 'relic-8', x: 26, z: 22, weight: 3 },
    { id: 'relic-9', x: 60, z: -28, weight: 6 },
    { id: 'relic-10', x: 72, z: -40, weight: 4 },
    { id: 'relic-11', x: 68, z: 34, weight: 6 },
    { id: 'relic-12', x: 78, z: 22, weight: 3 },
  ],
  pods: [
    { x: -70, z: -20, kind: 'dew' },
    { x: -66, z: 22, kind: 'spark' },
    { x: -20, z: 0, kind: 'stone' },
    { x: 10, z: -42 },
    { x: 28, z: 40 },
    { x: 44, z: 6 },
    { x: 80, z: 2 },
  ],
  enemies: [
    { x: 10, z: -8, kind: 'mossback' },
    { x: 70, z: -18, kind: 'spitter' },
    { x: 0, z: 38, kind: 'mound', reveals: 'sap' },
    { x: 62, z: 4, kind: 'mossback' },
  ],
};

const DROP_TERRACES = terraces(
  // The tier first: where the two overlap, the higher ground counts.
  terrace(
    [30, -20, 70, 20],
    10.5,
    [
      { side: 'w', from: -4, to: 4, kind: 'ramp' },
      { side: 's', from: 44, to: 52, kind: 'ledge' },
    ],
    6,
  ),
  terrace([-10, -52, 86, 52], 6, [
    { side: 's', from: 70, to: 78, kind: 'ramp' },
    { side: 'w', from: 30, to: 36, kind: 'ramp' },
    { side: 'w', from: -6, to: 6, kind: 'ledge' },
    { side: 'n', from: 30, to: 38, kind: 'ledge' },
  ]),
);

const THE_LONG_DROP: LevelSpec = {
  id: 'the-long-drop',
  stage: 24,
  name: 'The Long Drop',
  theme: 'terrarium',
  brief:
    'A great plateau that is a long walk up and a short drop down. Its edges are one-way ledges: hauls tip straight off them toward home, but nobody climbs back. Throw a crew up the cliff and let the ledges do the walking. Below it, a pool, a coil and a vent guard the first relics.',
  width: 184,
  depth: 120,
  dayLength: 860,
  platinumTime: 645,
  seed: 24,
  startingWorkers: 22,
  squad: { ember: 12, dew: 3, stone: 4, spark: 3 },
  water: [rectBox([-28, -50, -20, -42])],
  vents: [{ x: -61.5, z: -32, period: 4, offset: 0 }],
  coils: [{ a: { x: -33, z: 0 }, b: { x: -27, z: 0 }, period: 4, offset: 2 }],
  captain: { x: -81, z: 2 },
  kiln: { x: -84, z: 0 },
  obstacles: [...DROP_TERRACES.walls, ruin([-60, -10, -58, 14]), ruin([-40, 38, -20, 40])],
  plateaus: DROP_TERRACES.plateaus,
  ramps: DROP_TERRACES.ramps,
  ledges: DROP_TERRACES.ledges,
  treasures: [
    { id: 'relic-1', x: -60, z: -30, weight: 3 },
    { id: 'relic-2', x: -50, z: 30, weight: 3 },
    { id: 'relic-3', x: -30, z: 0, weight: 2 },
    { id: 'relic-4', x: -24, z: -46, weight: 2 },
    { id: 'relic-5', x: 40, z: -56, weight: 3 },
    { id: 'relic-6', x: 10, z: -30, weight: 4 },
    { id: 'relic-7', x: 20, z: 30, weight: 5 },
    { id: 'relic-8', x: 50, z: 40, weight: 6 },
    { id: 'relic-9', x: 80, z: -40, weight: 6, variant: 'lodestone' },
    { id: 'relic-10', x: 80, z: 30, weight: 5 },
    { id: 'relic-11', x: 50, z: 0, weight: 8 },
    { id: 'relic-12', x: 60, z: -12, weight: 4 },
  ],
  pods: [
    { x: -70, z: 20, kind: 'spark' },
    { x: -70, z: -25, kind: 'dew' },
    { x: -30, z: 30, kind: 'stone' },
    { x: 10, z: 10 },
    { x: 60, z: -40 },
    { x: 72, z: 44 },
  ],
  enemies: [
    { x: -45, z: -20, kind: 'mossback' },
    { x: 20, z: -40, kind: 'mossback' },
    { x: 40, z: 12, kind: 'spitter' },
    { x: 76, z: 6, kind: 'mound', drop: 3 },
  ],
};

const CONSERVATORY_TERRACES = terraces(
  terrace([0, 30, 30, 54], 3.75, [{ side: 'n', from: 10, to: 16, kind: 'ramp' }]),
);

const CRYSTAL_CONSERVATORY: LevelSpec = {
  id: 'crystal-conservatory',
  stage: 25,
  name: 'Crystal Conservatory',
  theme: 'terrarium',
  brief:
    'Three wings of the old glasshouse, their doorways grown shut with crystal: Stonelings crack it five times faster than anyone else. Break into a wing, light its outpost, and the haul home is a short one. Choose which doors to break first: not all of them are worth it.',
  width: 180,
  depth: 120,
  dayLength: 800,
  platinumTime: 520,
  seed: 25,
  startingWorkers: 20,
  squad: { ember: 10, stone: 6, spark: 4 },
  vents: [{ x: -18.5, z: -42, period: 4, offset: 1 }],
  coils: [{ a: { x: -23, z: 40 }, b: { x: -17, z: 40 }, period: 4, offset: 3 }],
  captain: { x: -79, z: 2 },
  kiln: { x: -82, z: 0 },
  obstacles: [
    ...CONSERVATORY_TERRACES.walls,
    // The west hall's wall, with three doorways.
    ruin([-41, -60, -39, -30]),
    ruin([-41, -22, -39, -4]),
    ruin([-41, 4, -39, 22]),
    ruin([-41, 30, -39, 60]),
    // North wing wall, doorways at x 10..18 and 60..68.
    ruin([-39, -11, 10, -9]),
    ruin([18, -11, 60, -9]),
    ruin([68, -11, 90, -9]),
    // South wing wall, doorway at x 30..38.
    ruin([-39, 9, 30, 11]),
    ruin([38, 9, 90, 11]),
  ],
  gates: [
    { ...rectBox([-41, -30, -39, -22]), hp: 200, style: 'crystal' },
    { ...rectBox([-41, -4, -39, 4]), hp: 240, style: 'crystal' },
    { ...rectBox([60, -11, 68, -9]), hp: 180, style: 'crystal' },
  ],
  plateaus: CONSERVATORY_TERRACES.plateaus,
  ramps: CONSERVATORY_TERRACES.ramps,
  ledges: CONSERVATORY_TERRACES.ledges,
  beacons: [
    { x: 40, z: -40 },
    { x: 60, z: 40 },
    { x: 75, z: 0 },
  ],
  treasures: [
    { id: 'relic-1', x: -70, z: -30, weight: 2 },
    { id: 'relic-2', x: -60, z: 36, weight: 3 },
    { id: 'relic-3', x: -20, z: -40, weight: 4 },
    { id: 'relic-4', x: 30, z: -50, weight: 5 },
    { id: 'twin-1', x: 80, z: -50, weight: 4, twin: 'pane' },
    { id: 'relic-5', x: 0, z: 0, weight: 3, variant: 'dewglass' },
    { id: 'relic-6', x: 50, z: -2, weight: 4 },
    { id: 'relic-7', x: -20, z: 40, weight: 3 },
    { id: 'relic-8', x: 15, z: 44, weight: 6 },
    { id: 'twin-2', x: 80, z: 50, weight: 4, twin: 'pane' },
    { id: 'relic-9', x: 45, z: 25, weight: 5 },
  ],
  pods: [
    { x: -70, z: 20, kind: 'stone' },
    { x: -60, z: -45, kind: 'spark' },
    { x: -10, z: -30 },
    { x: 20, z: 0 },
    { x: 70, z: -30 },
    { x: 30, z: 20 },
    { x: 75, z: 35 },
  ],
  enemies: [
    { x: -60, z: -10, kind: 'mound', reveals: 'pod' },
    { x: 0, z: -40, kind: 'mossback' },
    { x: 40, z: 0, kind: 'spitter' },
    { x: 60, z: 30, kind: 'mossback' },
    { x: -15, z: 25, kind: 'mound', drop: 2 },
  ],
};

const CAUSEWAY_TERRACES = terraces(
  terrace([40, -50, 84, -10], 4.5, [
    { side: 'w', from: -20, to: -14, kind: 'ramp' },
    { side: 'w', from: -44, to: -38, kind: 'ledge' },
  ]),
  terrace([36, 16, 84, 52], 3.75, [{ side: 'n', from: 50, to: 56, kind: 'ramp' }]),
);

const CLOCKWORK_CAUSEWAY: LevelSpec = {
  id: 'clockwork-causeway',
  stage: 26,
  name: 'Clockwork Causeway',
  theme: 'terrarium',
  brief:
    'A channel runs the length of the gardens. The causeway across the middle is short, under a clockwork sprinkler and a pair of Bogspitters. Upstream is a bridge site that needs three logs and is perfectly safe. Which crossing is cheaper depends on what you are carrying, and a crew of Dewlings simply wades the channel.',
  width: 184,
  depth: 120,
  dayLength: 960,
  platinumTime: 730,
  seed: 26,
  startingWorkers: 22,
  squad: { ember: 11, dew: 5, stone: 3, spark: 3 },
  vents: [{ x: -18.5, z: 50, period: 4, offset: 2 }],
  coils: [{ a: { x: -79, z: 52 }, b: { x: -73, z: 52 }, period: 4, offset: 0 }],
  captain: { x: -81, z: 2 },
  kiln: { x: -84, z: 0 },
  obstacles: [...CAUSEWAY_TERRACES.walls, ruin([-50, -20, -48, 20]), ruin([-30, 36, -10, 38])],
  plateaus: CAUSEWAY_TERRACES.plateaus,
  ramps: CAUSEWAY_TERRACES.ramps,
  ledges: CAUSEWAY_TERRACES.ledges,
  water: [rectBox([0, -60, 8, -48]), rectBox([0, -40, 8, -4]), rectBox([0, 4, 8, 60])],
  bridges: [{ ...rectBox([0, -48, 8, -40]), bank: { x: -2, z: -44 }, needs: 3 }],
  logs: [
    { x: -40, z: -40 },
    { x: -30, z: -52 },
    { x: -60, z: -40 },
  ],
  drips: [
    { x: 4, z: -2, period: 4, offset: 0 },
    { x: 4, z: 2, period: 4, offset: 2 },
  ],
  treasures: [
    { id: 'relic-1', x: -60, z: 20, weight: 3 },
    { id: 'relic-2', x: -20, z: -20, weight: 3 },
    { id: 'relic-3', x: -20, z: 48, weight: 4 },
    { id: 'relic-4', x: 24, z: -30, weight: 4 },
    { id: 'relic-5', x: 24, z: 30, weight: 5 },
    { id: 'relic-6', x: 60, z: -30, weight: 6 },
    { id: 'relic-7', x: 76, z: -44, weight: 4 },
    { id: 'relic-8', x: 60, z: 34, weight: 6 },
    { id: 'relic-9', x: 78, z: 44, weight: 4, variant: 'dewglass' },
    { id: 'relic-10', x: 70, z: 0, weight: 5 },
    { id: 'sunk-1', x: 4, z: -22, weight: 3 },
    { id: 'spark-1', x: -76, z: 52, weight: 2 },
  ],
  pods: [
    { x: -70, z: -20, kind: 'spark' },
    { x: -40, z: 20, kind: 'dew' },
    { x: -10, z: 0, kind: 'stone' },
    { x: 20, z: -50 },
    { x: 30, z: 0 },
    { x: 48, z: 30 },
  ],
  enemies: [
    { x: 20, z: 10, kind: 'spitter' },
    { x: 20, z: -12, kind: 'spitter' },
    { x: -30, z: -10, kind: 'mossback' },
    { x: 60, z: 4, kind: 'mossback' },
    { x: 50, z: -40, kind: 'mound', reveals: 'sap' },
  ],
};

const RESTORATION_TERRACES = terraces(
  terrace([-30, -40, 20, -6], 4.5, [
    { side: 's', from: -20, to: -14, kind: 'ramp' },
    { side: 'w', from: -30, to: -24, kind: 'ledge' },
  ]),
  terrace([-20, 14, 30, 50], 3.75, [
    { side: 'n', from: 0, to: 6, kind: 'ramp' },
    { side: 'w', from: 30, to: 36, kind: 'ledge' },
  ]),
);

const RESTORATION_DAY: LevelSpec = {
  id: 'restoration-day',
  stage: 27,
  name: 'Restoration Day',
  theme: 'terrarium',
  brief:
    'The final examination: the whole Terrarium in one day. Crystal doors, terraces with ledges home, two bridges to build or wade, outposts to light, a coil, a vent, a sunk relic, and a Gravelmaw in the far gardens guarding the last relic. Every kind has work. Plan the day before you start it.',
  width: 196,
  depth: 128,
  dayLength: 1150,
  platinumTime: 670,
  seed: 27,
  startingWorkers: 24,
  squad: { ember: 13, dew: 4, stone: 4, spark: 3 },
  vents: [{ x: -38.5, z: 58.5, period: 4, offset: 1 }],
  coils: [{ a: { x: -83, z: -40 }, b: { x: -77, z: -40 }, period: 4, offset: 3 }],
  captain: { x: -87, z: 2 },
  kiln: { x: -90, z: 0 },
  obstacles: [
    ...RESTORATION_TERRACES.walls,
    ruin([-51, -64, -49, -30]),
    ruin([-51, -22, -49, 20]),
    ruin([-51, 28, -49, 64]),
    { x: 70, z: -14, w: 3, d: 3 },
    { x: 86, z: -44, w: 3, d: 3 },
  ],
  gates: [{ ...rectBox([-51, -30, -49, -22]), hp: 220, style: 'crystal' }],
  plateaus: RESTORATION_TERRACES.plateaus,
  ramps: RESTORATION_TERRACES.ramps,
  ledges: RESTORATION_TERRACES.ledges,
  water: [rectBox([40, -64, 46, -6]), rectBox([40, 6, 46, 40]), rectBox([40, 48, 46, 64])],
  bridges: [
    { ...rectBox([40, -6, 46, 6]), bank: { x: 38, z: 0 }, needs: 2 },
    { ...rectBox([40, 40, 46, 48]), bank: { x: 38, z: 44 }, needs: 2 },
  ],
  logs: [
    { x: -70, z: 40 },
    { x: -60, z: -45 },
    { x: 30, z: 4 },
    { x: 34, z: 56 },
  ],
  beacons: [
    { x: 0, z: -20 },
    { x: 60, z: 0 },
  ],
  blooms: [
    { x: -40, z: -2, weight: 3, at: 120, lifetime: 60 },
    { x: 66, z: 40, weight: 4, at: 420, lifetime: 60 },
  ],
  treasures: [
    { id: 'relic-1', x: -80, z: -40, weight: 2 },
    { id: 'relic-2', x: -70, z: 30, weight: 3 },
    { id: 'relic-3', x: -40, z: -50, weight: 4 },
    { id: 'relic-4', x: -10, z: -30, weight: 4 },
    { id: 'relic-5', x: 10, z: -18, weight: 5 },
    { id: 'relic-6', x: 0, z: 30, weight: 5 },
    { id: 'relic-7', x: 20, z: 40, weight: 3, variant: 'dewglass' },
    { id: 'relic-8', x: -30, z: 4, weight: 3 },
    { id: 'twin-1', x: -40, z: 56, weight: 4, twin: 'harmony' },
    { id: 'twin-2', x: 26, z: -54, weight: 4, twin: 'harmony' },
    { id: 'relic-9', x: 60, z: 30, weight: 6 },
    { id: 'relic-10', x: 70, z: 54, weight: 5 },
    { id: 'relic-11', x: 76, z: 10, weight: 6, variant: 'lodestone' },
    { id: 'sunk-1', x: 43, z: -30, weight: 3 },
  ],
  pods: [
    { x: -80, z: 20, kind: 'stone' },
    { x: -70, z: -20, kind: 'spark' },
    { x: -36, z: -30, kind: 'dew' },
    { x: -10, z: 10 },
    { x: 10, z: 24 },
    { x: 30, z: -30 },
    { x: 56, z: 50 },
    { x: 60, z: -50 },
  ],
  enemies: [
    { x: -70, z: -55, kind: 'mound', reveals: 'sap' },
    { x: -30, z: 40, kind: 'mossback' },
    { x: 0, z: -50, kind: 'mossback' },
    { x: 30, z: 20, kind: 'spitter' },
    { x: 70, z: 40, kind: 'mossback' },
    { x: 80, z: -30, kind: 'gravelmaw', drop: 8 },
  ],
};

export const CURRICULUM: readonly LevelSpec[] = [
  TERRACE_GARDENS,
  THE_LONG_DROP,
  CRYSTAL_CONSERVATORY,
  CLOCKWORK_CAUSEWAY,
  RESTORATION_DAY,
];
