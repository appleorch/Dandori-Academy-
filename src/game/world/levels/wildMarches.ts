import type { LevelSpec } from '../levelTypes';

/** Term three, The Wild Marches: lessons 11 to 16 in the marsh, with the three great beasts. */

const BRAMBLE_GATE: LevelSpec = {
  id: 'bramble-gate',
  stage: 11,
  name: 'Bramble Gate',
  brief:
    'Meet the Sparklings: yellow, quick, and thrown farther than any other kind. Spark coils arc between their pylons, and only Sparklings can work under them. Bramble gates seal the way home: break them early and let the hauls roll through.',
  width: 60,
  depth: 34,
  dayLength: 260,
  platinumTime: 130,
  seed: 11,
  startingWorkers: 10,
  squad: { ember: 6, spark: 4 },
  captain: { x: -23, z: 2 },
  kiln: { x: -26, z: 0 },
  coils: [
    { a: { x: 21, z: -14 }, b: { x: 27, z: -14 }, period: 4, offset: 1 },
    { a: { x: -12, z: 13 }, b: { x: -6, z: 13 }, period: 5, offset: 3 },
  ],
  obstacles: [
    { x: 0, z: -10, w: 2, d: 14 },
    { x: 0, z: 10, w: 2, d: 14 },
    { x: 16, z: -6.5, w: 2, d: 21 },
    { x: 16, z: 14, w: 2, d: 6 },
  ],
  gates: [
    { x: 0, z: 0, w: 2, d: 6, hp: 120 },
    { x: 16, z: 7.5, w: 2, d: 7, hp: 160 },
  ],
  treasures: [
    { id: 'shard-1', x: -12, z: -10, weight: 2 },
    { id: 'shard-2', x: -10, z: 11, weight: 1 },
    { id: 'shard-3', x: 8, z: -10, weight: 3 },
    { id: 'shard-4', x: 7, z: 10, weight: 4 },
    { id: 'shard-5', x: 24, z: -8, weight: 6 },
    { id: 'shard-6', x: 25, z: 9, weight: 5 },
    { id: 'shard-7', x: 24, z: -14, weight: 3 },
  ],
  blooms: [{ x: 8, z: 4, weight: 2, at: 60, lifetime: 50 }],
  pods: [
    { x: -16, z: 6, kind: 'spark' },
    { x: 6, z: 14 },
    { x: 22, z: -8, kind: 'spark' },
  ],
  enemies: [
    { x: 8, z: 0, kind: 'mossback' },
    { x: 25, z: 0, kind: 'spitter' },
  ],
};

const DRIP_LINE: LevelSpec = {
  id: 'drip-line',
  stage: 12,
  name: 'Drip Line',
  brief:
    'Dewdrops fall on the damp patches and knock carriers off their haul, but not Dewlings: they shrug the drips off. Send Dewlings through the wet ground, and after the shard sunk in the far pond.',
  width: 64,
  depth: 36,
  dayLength: 300,
  platinumTime: 165,
  seed: 12,
  startingWorkers: 12,
  squad: { ember: 8, dew: 4 },
  captain: { x: -25, z: 2 },
  kiln: { x: -28, z: 0 },
  obstacles: [
    { x: -6, z: -8, w: 2, d: 20 },
    { x: 10, z: 8, w: 2, d: 20 },
  ],
  water: [{ x: 18, z: 14, w: 7, d: 5 }],
  drips: [
    { x: -6, z: 6, period: 4, offset: 0 },
    { x: -6, z: 11, period: 4, offset: 2 },
    { x: 10, z: -7, period: 4, offset: 0 },
    { x: 10, z: -12, period: 4, offset: 2 },
    { x: 20, z: 4, period: 3, offset: 1 },
  ],
  treasures: [
    { id: 'shard-1', x: -16, z: -10, weight: 2 },
    { id: 'shard-2', x: -14, z: 12, weight: 3 },
    { id: 'shard-3', x: 2, z: -12, weight: 3 },
    { id: 'shard-4', x: 2, z: 8, weight: 4 },
    { id: 'shard-5', x: 24, z: 2, weight: 2 },
    { id: 'shard-6', x: 18, z: -10, weight: 5 },
    { id: 'shard-7', x: 24, z: 10, weight: 8 },
    { id: 'sunk-1', x: 18, z: 14, weight: 3 },
  ],
  blooms: [{ x: -14, z: 4, weight: 2, at: 40, lifetime: 45 }],
  pods: [
    { x: -20, z: -6, kind: 'dew' },
    { x: 4, z: 14 },
    { x: 14, z: -14, kind: 'dew' },
  ],
  enemies: [
    { x: 0, z: -2, kind: 'mossback' },
    { x: 24, z: -6, kind: 'ramhorn' },
  ],
};

const GRAVELMAWS_PIT: LevelSpec = {
  id: 'gravelmaws-pit',
  stage: 13,
  name: "Gravelmaw's Pit",
  brief:
    'Boss: the Gravelmaw rears over a ring and slams it. Pull your squad out of the ring, then throw everyone onto it while it lies winded and open: Stonelings hit three times as hard. The shard by the vent behind it is Emberling work.',
  width: 56,
  depth: 40,
  dayLength: 300,
  platinumTime: 120,
  seed: 13,
  startingWorkers: 12,
  squad: { ember: 8, stone: 4 },
  captain: { x: -21, z: 2 },
  kiln: { x: -24, z: 0 },
  vents: [{ x: 25.5, z: -12, period: 4, offset: 0 }],
  obstacles: [
    { x: 2, z: -12, w: 2, d: 16 },
    { x: 2, z: 12, w: 2, d: 16 },
    { x: 12, z: -10, w: 3, d: 3 },
    { x: 12, z: 10, w: 3, d: 3 },
  ],
  treasures: [
    { id: 'shard-1', x: -12, z: -12, weight: 2 },
    { id: 'shard-2', x: -10, z: 12, weight: 3 },
    { id: 'shard-3', x: -4, z: 0, weight: 2 },
    { id: 'shard-4', x: 24, z: -10, weight: 5 },
    { id: 'shard-5', x: 24, z: 10, weight: 5 },
  ],
  blooms: [{ x: -14, z: -17, weight: 2, at: 30, lifetime: 45 }],
  saps: [{ x: -10, z: 0 }],
  pods: [
    { x: -16, z: -6, kind: 'stone' },
    { x: -16, z: 8 },
    { x: -6, z: 14, kind: 'stone' },
  ],
  enemies: [{ x: 15, z: 0, kind: 'gravelmaw', drop: 6 }],
};

const THREE_ROOTS: LevelSpec = {
  id: 'three-roots',
  stage: 14,
  name: 'Three Roots',
  brief:
    'Boss: the Lanternroot is shielded while any of its three root-knots glows. Fell all three close together, then rush the core before they regrow. Its roots have tapped a pond and a spark coil: Dewlings and Sparklings for those shards.',
  width: 60,
  depth: 44,
  dayLength: 320,
  platinumTime: 140,
  seed: 14,
  startingWorkers: 15,
  squad: { ember: 8, dew: 4, spark: 3 },
  captain: { x: -23, z: 2 },
  kiln: { x: -26, z: 0 },
  obstacles: [
    { x: 6, z: -7, w: 10, d: 2 },
    { x: 6, z: 7, w: 10, d: 2 },
  ],
  water: [{ x: 2, z: 17, w: 7, d: 5 }],
  coils: [{ a: { x: -1, z: -17 }, b: { x: 5, z: -17 }, period: 4, offset: 2 }],
  roots: [
    {
      x: 12,
      z: 0,
      drop: 10,
      knots: [
        { x: 12, z: -14 },
        { x: 12, z: 14 },
        { x: 25, z: 0 },
      ],
    },
  ],
  treasures: [
    { id: 'shard-1', x: -14, z: -14, weight: 2 },
    { id: 'shard-2', x: -12, z: 14, weight: 3 },
    { id: 'shard-3', x: -4, z: 0, weight: 3 },
    { id: 'shard-4', x: 2, z: -17, weight: 2 },
    { id: 'shard-5', x: 2, z: 17, weight: 3 },
  ],
  blooms: [{ x: -16, z: 0, weight: 2, at: 20, lifetime: 40 }],
  pods: [
    { x: -18, z: -6, kind: 'spark' },
    { x: -18, z: 6, kind: 'dew' },
    { x: -6, z: -10 },
    { x: -6, z: 10 },
  ],
  enemies: [
    { x: 24, z: -13, kind: 'mossback' },
    { x: -10, z: -18, kind: 'mound', drop: 2 },
  ],
};

const RUSH_HOUR: LevelSpec = {
  id: 'rush-hour',
  stage: 15,
  name: 'Rush Hour',
  brief:
    'Everything at once: a gate, drips, a pond, a coil, five enemies and Glowcaps that sprout mid-day for bonus score. All four kinds have work today. Keep the plan, and take the bonus only if it is on the way.',
  width: 90,
  depth: 50,
  dayLength: 520,
  platinumTime: 295,
  seed: 15,
  startingWorkers: 18,
  squad: { ember: 9, dew: 3, stone: 3, spark: 3 },
  captain: { x: -39, z: 2 },
  kiln: { x: -42, z: 0 },
  water: [{ x: -32, z: -17, w: 7, d: 6 }],
  coils: [{ a: { x: 33, z: 20 }, b: { x: 39, z: 20 }, period: 4, offset: 0 }],
  obstacles: [
    { x: -20, z: -10, w: 2, d: 30 },
    { x: 0, z: 10, w: 2, d: 30 },
    { x: 20, z: -12.5, w: 2, d: 25 },
    { x: 20, z: 17.5, w: 2, d: 15 },
  ],
  gates: [{ x: 20, z: 5, w: 2, d: 10, hp: 200 }],
  drips: [
    { x: -20, z: 10, period: 4, offset: 0 },
    { x: 0, z: -10, period: 4, offset: 2 },
    { x: 30, z: -12, period: 3, offset: 0 },
  ],
  blooms: [
    { x: -10, z: -18, weight: 3, at: 60, lifetime: 45 },
    { x: 10, z: 18, weight: 4, at: 180, lifetime: 45 },
    { x: 36, z: 0, weight: 5, at: 300, lifetime: 45 },
  ],
  treasures: [
    { id: 'shard-1', x: -32, z: -16, weight: 2 },
    { id: 'shard-2', x: -30, z: 16, weight: 3 },
    { id: 'shard-3', x: -10, z: 4, weight: 4 },
    { id: 'shard-4', x: -8, z: 18, weight: 5 },
    { id: 'shard-5', x: 8, z: -16, weight: 6 },
    { id: 'shard-6', x: 10, z: 2, weight: 3 },
    { id: 'shard-7', x: 30, z: 12, weight: 8 },
    { id: 'shard-8', x: 34, z: -18, weight: 10 },
    { id: 'shard-9', x: 38, z: 4, weight: 6 },
    { id: 'shard-10', x: 36, z: 20, weight: 2 },
  ],
  pods: [
    { x: -34, z: 8, kind: 'dew' },
    { x: -12, z: -8, kind: 'stone' },
    { x: 6, z: -6 },
    { x: 28, z: -4, kind: 'spark' },
  ],
  enemies: [
    { x: -12, z: 12, kind: 'mossback' },
    { x: 8, z: -6, kind: 'ramhorn' },
    { x: 12, z: 14, kind: 'spitter' },
    { x: 30, z: 6, kind: 'mossback' },
    { x: 38, z: -10, kind: 'spitter' },
  ],
};

const THE_BELLWETHER: LevelSpec = {
  id: 'the-bellwether',
  stage: 16,
  name: 'The Bellwether',
  brief:
    'Final boss: the Bellwether tolls its bell, then charges. Stand with a pillar behind you and step aside, leading the squad out of its path, so it rams the stone; then pile on while it reels. Stonelings hit hardest.',
  width: 70,
  depth: 44,
  dayLength: 420,
  platinumTime: 195,
  seed: 16,
  startingWorkers: 20,
  squad: { ember: 12, stone: 8 },
  captain: { x: -28, z: 2 },
  kiln: { x: -31, z: 0 },
  obstacles: [
    { x: -8, z: -13, w: 2, d: 18 },
    { x: -8, z: 13, w: 2, d: 18 },
    { x: 6, z: -8, w: 3, d: 3 },
    { x: 6, z: 8, w: 3, d: 3 },
    { x: 20, z: 0, w: 3, d: 3 },
  ],
  gates: [{ x: -8, z: 0, w: 2, d: 8, hp: 160 }],
  treasures: [
    { id: 'shard-1', x: -20, z: -14, weight: 2 },
    { id: 'shard-2', x: -18, z: 14, weight: 3 },
    { id: 'shard-3', x: 0, z: -16, weight: 4 },
    { id: 'shard-4', x: 0, z: 16, weight: 4 },
    { id: 'shard-5', x: 28, z: -12, weight: 6 },
    { id: 'shard-6', x: 28, z: 12, weight: 6 },
  ],
  blooms: [{ x: -20, z: 0, weight: 2, at: 30, lifetime: 45 }],
  pods: [
    { x: -24, z: -8, kind: 'stone' },
    { x: -24, z: 8 },
    { x: -14, z: 0, kind: 'stone' },
    { x: 30, z: 0 },
  ],
  enemies: [
    { x: 12, z: 0, kind: 'bellwether', drop: 12 },
    { x: 30, z: -18, kind: 'spitter' },
  ],
};

export const WILD_MARCHES: readonly LevelSpec[] = [
  BRAMBLE_GATE,
  DRIP_LINE,
  GRAVELMAWS_PIT,
  THREE_ROOTS,
  RUSH_HOUR,
  THE_BELLWETHER,
];
