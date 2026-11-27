import type { BattleId } from '../../modes/modes';
import type { LevelSpec } from '../levelTypes';
import { Field } from './challenges/build';
import { dressField } from './challenges/field';

/**
 * Battle arenas: fields built for racing a rival, each for one battle, each written by hand
 * around its own idea. The rival works its own copy of the same arena, so an arena need not be
 * fair between sides, only interesting to race on. Each arena's day is its battle day.
 *
 * Marble Race arenas give the four farthest Sunshards (the marbles) four different ways home.
 * Bingo Race arenas are crowded with different things to bring home, so every card differs. Dandori
 * Duel arenas are about weight: hoards, beasts and Glowcaps, and which to go for first.
 */

function arena(battle: BattleId, field: Field): LevelSpec {
  const { pace: _pace, ...spec } = field.done(0);
  void _pace;
  return {
    ...dressField(spec),
    ...spec,
    stage: 0,
    // The battle day is the arena's own day (see battleLevel).
    platinumTime: spec.dayLength,
    arena: battle,
  };
}

// Marble Race.

const FOUR_CORNERS = arena(
  'marble',
  new Field({
    id: 'arena-four-corners',
    name: 'Four Corners',
    brief:
      'The Kiln stands in the middle; a marble waits in each corner, and each corner is guarded differently: a stream to bridge, a shelf to climb, a bramble gate, and a Mossback. Pick the order that suits your squad.',
    theme: 'meadow',
    look: 'hedge',
    width: 80,
    depth: 64,
    dayLength: 240,
    seed: 1801,
    squad: { ember: 8, stone: 8 },
    kiln: { x: 0, z: 0 },
  })
    .water([-40, -14, -20, -10])
    .water([-24, -32, -20, -24])
    .water([-24, -18, -20, -14])
    .bridge([-24, -24, -20, -18], { x: -17, z: -21 }, [
      { x: -10, z: -14 },
      { x: -12, z: 4 },
    ])
    .terrace([22, -30, 38, -16], 3, [{ side: 'w', from: -26, to: -20, kind: 'ramp' }])
    .pen([-38, 14, -20, 30], { e: [[19, 25]] })
    .gate([-21, 19, -19, 25], 120)
    .shard(-34, -26, 3)
    .shard(32, -24, 3)
    .shard(-30, 24, 3)
    .shard(34, 26, 3)
    .beast('mossback', 28, 20)
    .shards(
      [
        [-8, -20],
        [10, 18],
        [12, -8],
        [-14, 10],
      ],
      1,
    ),
);

const VELODROME = arena(
  'marble',
  new Field({
    id: 'arena-velodrome',
    name: 'The Velodrome',
    brief:
      'A track runs round a walled infield, and the marbles lie on the far straight. The track is the long way; the infield’s bramble gates make a short way through, once they are down. Break them first, or run the track and race.',
    theme: 'autumn',
    look: 'fence',
    width: 92,
    depth: 64,
    dayLength: 260,
    seed: 1802,
    squad: { ember: 8, stone: 8 },
    kiln: { x: -40, z: 0 },
  })
    .pen([-30, -24, 34, 24], { w: [[-4, 4]] })
    .pen([-16, -10, 20, 10], { w: [[-3, 3]], e: [[-3, 3]] })
    .gate([-17, -3, -15, 3], 100)
    .gate([19, -3, 21, 3], 100)
    .shards(
      [
        [28, -18],
        [30, -6],
        [30, 6],
        [28, 18],
      ],
      2,
    )
    .shards(
      [
        [0, -17],
        [0, 17],
        [-20, -17],
        [-20, 17],
      ],
      1,
    )
    .beast('skitter', 2, 0),
);

const SNAKES_AND_LADDERS = arena(
  'marble',
  new Field({
    id: 'arena-snakes-and-ladders',
    name: 'Snakes and Ladders',
    brief:
      'Flowerpot terraces climb the far side of the field, ladders (ramps) and snakes (drops) between them. The marbles are on the high tiers, each at a different height: climb by the ladders, come home by the snakes.',
    theme: 'meadow',
    look: 'flowerpot',
    width: 84,
    depth: 72,
    dayLength: 260,
    seed: 1803,
    squad: { stone: 8, ember: 8 },
    kiln: { x: -36, z: 28 },
  })
    .terrace([-12, -34, 40, 6], 2, [
      { side: 'w', from: -6, to: 0, kind: 'ramp' },
      { side: 's', from: 30, to: 36, kind: 'ledge' },
    ])
    .terrace(
      [2, -34, 40, -10],
      4,
      [
        { side: 's', from: 6, to: 12, kind: 'ramp', length: 5 },
        { side: 'w', from: -30, to: -24, kind: 'ledge' },
      ],
      2,
    )
    .terrace(
      [18, -34, 40, -22],
      6,
      [
        { side: 'w', from: -30, to: -26, kind: 'ramp', length: 5 },
        { side: 's', from: 32, to: 38, kind: 'ledge' },
      ],
      4,
    )
    .shard(-6, -28, 3)
    .shard(10, -28, 3)
    .shard(34, -30, 3)
    .shard(30, -4, 3)
    .shards(
      [
        [-24, 0],
        [-10, 20],
        [10, 22],
      ],
      1,
    ),
);

const MARBLE_RUN = arena(
  'marble',
  new Field({
    id: 'arena-marble-run',
    name: 'Marble Run',
    brief:
      'Tiled chutes zigzag down the playroom floor, belts running back towards the Kiln. A marble set on a chute rides home by itself, if it is set on the right one; two chutes run the wrong way. Watch the arrows.',
    theme: 'terrarium',
    look: 'tile',
    width: 88,
    depth: 64,
    dayLength: 240,
    seed: 1804,
    squad: { spark: 8, ember: 8 },
    kiln: { x: -38, z: 0 },
  })
    .conveyor([-28, -26, 36, -22], -1, 0)
    .conveyor([-10, -14, 36, -10], 1, 0)
    .conveyor([-28, 10, 20, 14], -1, 0)
    .conveyor([0, 22, 36, 26], 1, 0)
    .shards(
      [
        [34, -24],
        [34, -4],
        [22, 12],
        [34, 18],
      ],
      2,
    )
    .shards(
      [
        [0, -18],
        [-10, 0],
        [10, 0],
        [-16, 20],
      ],
      1,
    )
    .beast('hedgehog', 18, -4),
);

const PINBALL = arena(
  'marble',
  new Field({
    id: 'arena-pinball',
    name: 'Pinball Garden',
    brief:
      'Brick bumpers stud the garden like a pinball table, and Ramhorns charge between them, bouncing off. The marbles sit in the pockets behind the bumpers. A Ramhorn that hits a bumper is dazed: use them.',
    theme: 'dusk',
    look: 'brick',
    width: 84,
    depth: 68,
    dayLength: 260,
    seed: 1805,
    squad: { stone: 10, ember: 8 },
    kiln: { x: 0, z: 30 },
  })
    .rock(-20, -4, 4, 'brick')
    .rock(0, -12, 4, 'brick')
    .rock(20, -4, 4, 'brick')
    .rock(-10, -24, 4, 'brick')
    .rock(10, -24, 4, 'brick')
    .rock(-30, 12, 4, 'brick')
    .rock(30, 12, 4, 'brick')
    .shard(-34, -28, 3)
    .shard(34, -28, 3)
    .shard(0, -30, 3)
    .shard(-36, 2, 3)
    .beast('ramhorn', -10, 0)
    .beast('ramhorn', 12, -16)
    .shards(
      [
        [-16, 18],
        [16, 18],
        [0, 4],
      ],
      1,
    ),
);

// Bingo Race.

const VILLAGE_FETE = arena(
  'bingo',
  new Field({
    id: 'arena-village-fete',
    name: 'Village Fete',
    brief:
      'Six fenced stalls round the village green, each with its own wares, seed pods by the gate and a Glowcap that sprouts in the tombola. Beasts wander the green. Every card here asks for something different.',
    theme: 'meadow',
    look: 'fence',
    width: 88,
    depth: 68,
    dayLength: 280,
    seed: 1811,
    squad: { ember: 8, stone: 8, spark: 4 },
    kiln: { x: 0, z: 0 },
  })
    .pen([-40, -30, -20, -14], { s: [[-34, -28]] })
    .pen([-10, -30, 10, -14], { s: [[-3, 3]] })
    .pen([20, -30, 40, -14], { s: [[26, 32]] })
    .pen([-40, 14, -20, 30], { n: [[-34, -28]] })
    .pen([-10, 14, 10, 30], { n: [[-3, 3]] })
    .pen([20, 14, 40, 30], { n: [[26, 32]] })
    .shards(
      [
        [-34, -24],
        [-26, -20],
        [-4, -24],
        [4, -20],
        [26, -24],
        [34, -20],
      ],
      1,
    )
    .shards(
      [
        [-34, 24],
        [-26, 20],
        [-4, 24],
        [4, 20],
        [26, 24],
        [34, 20],
      ],
      2,
    )
    .pod(-16, 0)
    .pod(16, 0)
    .bloom(0, -22, 60)
    .beast('skitter', -30, 0)
    .beast('slug', 30, 0)
    .beast('mossback', 0, 8),
);

const LOST_PROPERTY = arena(
  'bingo',
  new Field({
    id: 'arena-lost-property',
    name: 'Lost Property',
    brief:
      'The Academy’s lost property office: aisles of shelves crammed with one of everything, a Lodestone that crawls off and Dewglass that cracks if dropped among them. Seed pods have rolled under the shelves, and things live behind them.',
    theme: 'dusk',
    look: 'book',
    width: 84,
    depth: 68,
    dayLength: 280,
    seed: 1812,
    squad: { ember: 8, stone: 8, spark: 4 },
    kiln: { x: -36, z: 0 },
  })
    .vline(-20, -34, 16)
    .vline(-4, -16, 34)
    .vline(12, -34, 16)
    .vline(28, -16, 34)
    .shards(
      [
        [-28, -24],
        [-28, 24],
        [-12, -28],
        [-12, 4],
        [4, -6],
        [4, 26],
        [20, -28],
        [20, 8],
        [36, -10],
        [36, 24],
      ],
      1,
    )
    .shard(36, -28, 3, { variant: 'lodestone' })
    .shard(-12, 22, 2, { variant: 'dewglass' })
    .pod(-28, 4)
    .pod(20, 26)
    .bloom(4, -26, 70)
    .beast('hedgehog', 4, 10)
    .beast('skitter', 20, -10)
    .beast('mimic', 36, 6),
);

const MENAGERIE = arena(
  'bingo',
  new Field({
    id: 'arena-menagerie',
    name: 'The Menagerie',
    brief:
      'A menagerie of fenced pens, a different beast in each: Skitters, a Slug, a Mossback, a Bogspitter and a Hedgehog. Bingo cards here ask for beasts as often as for shards, and the pens open on different sides.',
    theme: 'autumn',
    look: 'fence',
    width: 92,
    depth: 72,
    dayLength: 300,
    seed: 1813,
    squad: { stone: 10, ember: 8, spark: 4 },
    kiln: { x: -40, z: 0 },
  })
    .pen([-24, -32, -6, -14], { s: [[-18, -12]] })
    .pen([4, -32, 22, -14], { w: [[-26, -20]] })
    .pen([30, -12, 44, 12], { w: [[-3, 3]] })
    .pen([4, 14, 22, 32], { n: [[10, 16]] })
    .pen([-24, 14, -6, 32], { e: [[20, 26]] })
    .beast('skitter', -16, -24)
    .beast('slug', 12, -24)
    .beast('mossback', 38, 0)
    .beast('spitter', 12, 24)
    .beast('hedgehog', -16, 24)
    .shards(
      [
        [-20, -18],
        [18, -28],
        [40, -8],
        [18, 28],
        [-20, 28],
      ],
      2,
    )
    .shards(
      [
        [-10, 0],
        [8, 0],
        [24, 0],
        [-28, -24],
        [-28, 24],
      ],
      1,
    )
    .pod(-30, 10)
    .pod(30, -26)
    .bloom(30, 26, 80),
);

const TREASURE_MAP = arena(
  'bingo',
  new Field({
    id: 'arena-treasure-map',
    name: 'Treasure Map',
    brief:
      'A marsh of islands, each marked on the map with its own find. The near channel has fords at either end; the far one waits for a bridge, and Dewlings wade where nobody else can. Glowcaps sprout on the far islands as the day goes on.',
    theme: 'marsh',
    look: 'root',
    width: 92,
    depth: 68,
    dayLength: 300,
    seed: 1814,
    squad: { dew: 6, ember: 8, stone: 6 },
    kiln: { x: -40, z: 0 },
  })
    // The near channel has dry fords at both ends; only the far one needs its bridge.
    .water([-24, -26, -20, 26])
    .water([8, -34, 12, -3])
    .water([8, 3, 12, 34])
    .bridge([8, -3, 12, 3], { x: 5, z: 0 }, [
      { x: -6, z: -10 },
      { x: -6, z: 10 },
    ])
    .shards(
      [
        [-34, -26],
        [-34, 26],
        [-8, -24],
        [-8, 24],
        [0, -12],
        [0, 12],
      ],
      1,
    )
    .shards(
      [
        [22, -24],
        [22, 24],
        [36, -10],
        [36, 10],
        [26, 0],
      ],
      2,
    )
    .shard(-2, -4, 2)
    .pod(-12, -18)
    .pod(30, 20)
    .bloom(36, -26, 60)
    .bloom(36, 26, 140)
    .beast('skitter', 20, -12)
    .beast('mossback', 30, 6)
    .beast('slug', -6, 20),
);

const JUMBLE_SALE = arena(
  'bingo',
  new Field({
    id: 'arena-jumble-sale',
    name: 'Jumble Sale',
    brief:
      'Glass display cases fill the conservatory for the jumble sale, with a belt along the back carrying things towards the till. Every case is different, a Mimic hides among the wares, and the seed pods are on the bottom shelf.',
    theme: 'terrarium',
    look: 'glass',
    width: 88,
    depth: 64,
    dayLength: 280,
    seed: 1815,
    squad: { spark: 8, ember: 8, stone: 4 },
    kiln: { x: -38, z: 0 },
  })
    .conveyor([-26, -28, 40, -24], -1, 0)
    .pen([-20, -16, -4, -2], { s: [[-14, -8]] })
    .pen([4, -16, 20, -2], { s: [[10, 16]] })
    .pen([-20, 6, -4, 20], { n: [[-14, -8]] })
    .pen([4, 6, 20, 20], { n: [[10, 16]] })
    .pen([28, -12, 40, 12], { w: [[-3, 3]] })
    .shards(
      [
        [-14, -10],
        [-10, -6],
        [10, -10],
        [14, -6],
        [-14, 14],
        [-10, 10],
        [10, 14],
        [14, 10],
      ],
      1,
    )
    .shards(
      [
        [34, -6],
        [34, 6],
        [36, -26],
        [20, -26],
      ],
      2,
    )
    .pod(-26, 24)
    .pod(30, 24)
    .bloom(34, 0, 90)
    .beast('mimic', 12, 12)
    .beast('skitter', 0, 26)
    .beast('hedgehog', -26, -16),
);

// Dandori Duel.

const TUG_OF_WAR = arena(
  'duel',
  new Field({
    id: 'arena-tug-of-war',
    name: 'Tug of War',
    brief:
      'Heavy hoards lie down the middle of the field like a rope, and grazing beasts keep both flanks. A hoard takes a big crew and a long walk; a beast takes a fight and gives a carcass. Every point of weight counts.',
    theme: 'meadow',
    look: 'hedge',
    width: 92,
    depth: 64,
    dayLength: 260,
    seed: 1821,
    squad: { stone: 10, ember: 10 },
    kiln: { x: -40, z: 0 },
  })
    .shards(
      [
        [-14, 0],
        [6, 0],
        [26, 0],
      ],
      5,
    )
    .shard(40, 0, 7)
    .beast('mossback', 0, -22)
    .beast('mossback', 20, 22)
    .beast('ramhorn', 34, -22)
    .shards(
      [
        [-20, -24],
        [-20, 24],
        [10, -26],
        [32, 26],
      ],
      1,
    )
    .rock(-4, -12, 4)
    .rock(16, 12, 4),
);

const COLOSSEUM = arena(
  'duel',
  new Field({
    id: 'arena-colosseum',
    name: 'The Colosseum',
    brief:
      'A ruined colosseum: beasts in the ring in the middle, shards scattered round the stands outside it. The ring’s gates open on all four sides. The beasts weigh more than anything in the stands, but they bite.',
    theme: 'autumn',
    look: 'ruin',
    width: 88,
    depth: 88,
    dayLength: 280,
    seed: 1822,
    squad: { stone: 12, ember: 10 },
    kiln: { x: -38, z: 38 },
  })
    .pen([-18, -18, 18, 18], { n: [[-3, 3]], s: [[-3, 3]], e: [[-3, 3]], w: [[-3, 3]] })
    .beast('mossback', -6, -6)
    .beast('mossback', 6, 6)
    .beast('spitter', 6, -8)
    .beast('skitter', -8, 8)
    .shards(
      [
        [-30, -30],
        [30, -30],
        [30, 30],
        [0, -32],
        [-32, 0],
        [32, 0],
        [0, 32],
      ],
      2,
    )
    .shards(
      [
        [-24, 12],
        [24, -12],
        [12, 24],
      ],
      1,
    ),
);

const QUARRY = arena(
  'duel',
  new Field({
    id: 'arena-quarry',
    name: 'The Quarry',
    brief:
      'A stepped quarry, its heaviest stones on the deepest ledges and Lodestones among them that creep away from small crews. Take the heavy ones with everyone, or the light ones quickly: weight is all that counts.',
    theme: 'autumn',
    look: 'cliff',
    width: 88,
    depth: 72,
    dayLength: 280,
    seed: 1823,
    squad: { stone: 12, ember: 8 },
    kiln: { x: -38, z: 28 },
  })
    .terrace([-14, -34, 40, 2], 3, [
      { side: 'w', from: -10, to: -4, kind: 'ramp' },
      { side: 's', from: 30, to: 36, kind: 'ledge' },
    ])
    .terrace([6, -34, 40, -14], 6, [{ side: 's', from: 10, to: 16, kind: 'ramp', length: 5 }], 3)
    .shards(
      [
        [16, -26],
        [30, -26],
      ],
      6,
    )
    .shard(24, -20, 5, { variant: 'lodestone' })
    .shards(
      [
        [-6, -24],
        [0, -6],
        [30, -4],
      ],
      3,
    )
    .shards(
      [
        [-28, 8],
        [-10, 20],
        [12, 20],
        [32, 22],
      ],
      1,
    )
    .beast('skitter', 20, 14),
);

const TWO_RIVERS = arena(
  'duel',
  new Field({
    id: 'arena-two-rivers',
    name: 'Two Rivers',
    brief:
      'Two rivers run across the field, each with one bridge site. The near bank is light pickings; the island between the rivers has heavier shards; the far bank has the hoard and a Mossback. Bridge further, score more.',
    theme: 'marsh',
    look: 'root',
    width: 96,
    depth: 64,
    dayLength: 300,
    seed: 1824,
    squad: { ember: 8, stone: 10, dew: 4 },
    kiln: { x: -42, z: 0 },
  })
    .water([-16, -32, -12, -18])
    .water([-16, -12, -12, 32])
    .water([14, -32, 18, 12])
    .water([14, 18, 18, 32])
    .bridge([-16, -18, -12, -12], { x: -19, z: -15 }, [
      { x: -26, z: -24 },
      { x: -30, z: -8 },
    ])
    .bridge([14, 12, 18, 18], { x: 11, z: 15 }, [
      { x: 0, z: 22 },
      { x: 4, z: 6 },
    ])
    .shards(
      [
        [-30, 16],
        [-24, -2],
        [-34, -26],
      ],
      1,
    )
    .shards(
      [
        [0, -20],
        [4, 0],
        [-4, 24],
      ],
      3,
    )
    .shards(
      [
        [30, -20],
        [36, 14],
      ],
      4,
    )
    .shard(40, -4, 6)
    .beast('mossback', 30, 0),
);

const NIGHT_HARVEST = arena(
  'duel',
  new Field({
    id: 'arena-night-harvest',
    name: 'Night Harvest',
    brief:
      'An allotment at dusk where Glowcaps sprout bed after bed through the day, each wilting soon after. Glowcaps count by weight in a Duel like anything else: keep a crew free for every one, and the shards in between.',
    theme: 'dusk',
    look: 'brick',
    width: 84,
    depth: 68,
    dayLength: 280,
    seed: 1825,
    squad: { ember: 10, stone: 8, spark: 4 },
    kiln: { x: 0, z: 30 },
  })
    .pen([-36, -30, -16, -12], { s: [[-30, -24]] })
    .pen([-10, -30, 10, -12], { s: [[-3, 3]] })
    .pen([16, -30, 36, -12], { s: [[24, 30]] })
    .bloom(-26, -22, 30, 4)
    .bloom(0, -22, 80, 4)
    .bloom(26, -22, 130, 4)
    .bloom(-30, 10, 180, 4)
    .bloom(30, 10, 220, 4)
    .shards(
      [
        [-30, -18],
        [-4, -26],
        [4, -18],
        [30, -26],
      ],
      2,
    )
    .shards(
      [
        [-20, 4],
        [20, 4],
        [0, 0],
      ],
      3,
    )
    .beast('moth', 0, -6)
    .beast('skitter', -30, 20),
);

/** Every battle arena, by battle. */
export const BATTLE_SPECS: readonly LevelSpec[] = [
  FOUR_CORNERS,
  VELODROME,
  SNAKES_AND_LADDERS,
  MARBLE_RUN,
  PINBALL,
  VILLAGE_FETE,
  LOST_PROPERTY,
  MENAGERIE,
  TREASURE_MAP,
  JUMBLE_SALE,
  TUG_OF_WAR,
  COLOSSEUM,
  QUARRY,
  TWO_RIVERS,
  NIGHT_HARVEST,
];
