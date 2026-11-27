import { byPace, Field } from './build';
import { challengeFields } from './field';

/**
 * Lean Squad Trial fields, each written by hand around what costs Sproutlings. There is no clock
 * and the Kiln grows nothing: the squad you start with is all you get, so every field asks you to
 * take each job with the right kind and the right numbers, and never to blunder.
 */

/** Measured by the test player (`npm run paces`): how many Sproutlings it lost, which is Platinum. */
const PACE: Record<string, number> = {
  tightrope: 3,
  'ember-alcoves': 0,
  'spark-cloister': 0,
  'flooded-crypt': 0,
  'sleeping-giants': 6,
  'drip-hall': 0,
  'bridge-watch': 4,
  'skitter-warren': 2,
  'the-crucible': 0,
  'shellback-shallows': 3,
  'wasp-grove': 2,
  'two-roads': 3,
};

/** Causeways between chasms: narrow ways, and beasts that would knock a crew off them. */
function tightrope() {
  return new Field({
    id: 'tightrope',
    name: 'Tightrope',
    brief:
      'Causeways run between deep chasms, each wide enough for a crew and no more. Skitters dash along them. A crew that panics has nowhere to go: clear each causeway before you send carriers down it.',
    theme: 'dusk',
    look: 'pit',
    width: 80,
    depth: 64,
    dayLength: 0,
    seed: 1401,
    squad: { ember: 8, stone: 6 },
    kiln: { x: -32, z: 0 },
  })
    .hline(-20, -24, 38, [[-24, -18]], 'pit', 4)
    .hline(-6, -18, 38, [[-18, -12]], 'pit', 4)
    .hline(6, -18, 38, [[-18, -12]], 'pit', 4)
    .hline(20, -24, 38, [[-24, -18]], 'pit', 4)
    .shards(
      [
        [34, -26],
        [34, -13],
        [34, 0],
        [34, 13],
        [34, 26],
      ],
      2,
    )
    .shards(
      [
        [10, -13],
        [10, 13],
      ],
      1,
    )
    .beast('skitter', 20, -13)
    .beast('skitter', 20, 13)
    .beast('skitter', 20, 26)
    .done(PACE.tightrope);
}

/** A row of alcoves, a flame vent at the back of each: only Emberlings go in. */
function emberAlcoves() {
  return new Field({
    id: 'ember-alcoves',
    name: 'Ember Alcoves',
    brief:
      'A gallery of brick alcoves, each with a flame vent at the back and a shard beside it. Only Emberlings work by a vent; anyone else sent in burns. Count your Emberlings: they are all the fireproof hands you will have.',
    theme: 'autumn',
    look: 'brick',
    width: 84,
    depth: 60,
    dayLength: 0,
    seed: 1402,
    squad: { ember: 8, stone: 6, spark: 4 },
    kiln: { x: -34, z: 18 },
  })
    .vline(-14, -30, -10)
    .vline(0, -30, -10)
    .vline(14, -30, -10)
    .vline(28, -30, -10)
    .hline(-10, -24, 40, [
      [-22, -16],
      [-8, -2],
      [6, 12],
      [20, 26],
      [33, 39],
    ])
    .vent(-19, -26)
    .shard(-17, -24, 2)
    .vent(-5, -26, 4, 1)
    .shard(-3, -24, 2)
    .vent(9, -26, 4, 2)
    .shard(11, -24, 2)
    .vent(23, -26, 4, 3)
    .shard(25, -24, 2)
    .shards(
      [
        [-16, 6],
        [0, 14],
        [20, 4],
        [36, 20],
      ],
      2,
    )
    .beast('mossback', 22, 18)
    .done(PACE['ember-alcoves']);
}

/** A cloister round a square garden, a crackling coil in each corner. */
function sparkCloister() {
  return new Field({
    id: 'spark-cloister',
    name: 'Spark Cloister',
    brief:
      'A cloister walk round a square garden, a crackling coil in each corner with a shard beneath it. Only Sparklings work under a coil. The garden in the middle is safe, but its shards are guarded.',
    theme: 'terrarium',
    look: 'glass',
    width: 76,
    depth: 76,
    dayLength: 0,
    seed: 1403,
    squad: { spark: 8, ember: 6, stone: 4 },
    kiln: { x: -30, z: 30 },
  })
    .pen([-14, -14, 14, 14], { n: [[-3, 3]], s: [[-3, 3]], e: [[-3, 3]], w: [[-3, 3]] })
    .coil({ x: -32, z: -30 }, { x: -28, z: -30 })
    .shard(-30, -32, 2)
    .coil({ x: 28, z: -30 }, { x: 32, z: -30 }, 4, 1)
    .shard(30, -32, 2)
    .coil({ x: 28, z: 30 }, { x: 32, z: 30 }, 4, 2)
    .shard(30, 32, 2)
    .shards(
      [
        [-6, -6],
        [6, 6],
        [6, -6],
      ],
      2,
    )
    .shards(
      [
        [0, -24],
        [24, 0],
        [-24, 0],
      ],
      1,
    )
    .beast('hedgehog', 0, 0)
    .done(PACE['spark-cloister']);
}

/** A crypt of flooded rooms: shards under the water, for Dewlings alone. */
function floodedCrypt() {
  return new Field({
    id: 'flooded-crypt',
    name: 'Flooded Crypt',
    brief:
      'A crypt of rock rooms, most of them flooded. The shards lie under the water, where only Dewlings can go; anyone else drowns. The dry rooms hold the rest, and Skitters nest in one of them.',
    theme: 'cave',
    look: 'rock',
    width: 84,
    depth: 64,
    dayLength: 0,
    seed: 1404,
    squad: { dew: 8, stone: 6, ember: 4 },
    kiln: { x: -34, z: 0 },
  })
    .vline(-18, -32, 32, [[-3, 3]])
    .vline(8, -32, 32, [
      [-20, -14],
      [14, 20],
    ])
    .hline(0, 8, 42, [[24, 30]])
    .water([-12, -26, 2, -10])
    .water([-12, 10, 2, 26])
    .water([14, -26, 34, -8])
    .shards(
      [
        [-6, -18],
        [-4, 18],
        [22, -18],
        [28, -14],
      ],
      2,
    )
    .shards(
      [
        [-6, 0],
        [20, 12],
        [34, 20],
        [36, -28],
      ],
      2,
    )
    .beast('skitter', 24, 20)
    .beast('skitter', 32, 12)
    .done(PACE['flooded-crypt']);
}

/** Great beasts asleep beside heavy shards: wake one only with everyone ready. */
function sleepingGiants() {
  return new Field({
    id: 'sleeping-giants',
    name: 'Sleeping Giants',
    brief:
      'Three great beasts sleep on an open lawn, each beside a heavy shard. Wake one carelessly and it will eat its way through the squad. Take each with every Sproutling at once, and never two at a time.',
    theme: 'meadow',
    look: 'hedge',
    width: 84,
    depth: 64,
    dayLength: 0,
    seed: 1405,
    squad: { stone: 10, ember: 8, spark: 4 },
    kiln: { x: -36, z: 0 },
  })
    .rock(-10, -18, 4)
    .rock(6, 20, 4)
    .rock(24, -6, 4)
    .beast('mossback', -4, -24)
    .beast('ramhorn', 14, 22)
    .beast('mossback', 32, -14)
    .shard(2, -26, 4)
    .shard(20, 26, 4)
    .shard(38, -20, 4)
    .shards(
      [
        [-24, 18],
        [-14, 6],
        [12, 0],
        [36, 12],
      ],
      2,
    )
    .done(PACE['sleeping-giants']);
}

/** A hall of books where dewdrops fall on a beat over the shards. */
function dripHall() {
  return new Field({
    id: 'drip-hall',
    name: 'Drip Hall',
    brief:
      'A long hall of bookcases with a leaky roof: dewdrops fall on a steady beat over the aisles, and each one stuns whatever it lands on. The shards sit right under the drips. Count the beat and send each crew in just after a drop.',
    theme: 'dusk',
    look: 'book',
    width: 88,
    depth: 56,
    dayLength: 0,
    seed: 1406,
    squad: { ember: 8, stone: 6, dew: 4 },
    kiln: { x: -38, z: 0 },
  })
    .hline(-12, -28, 40, [
      [-20, -14],
      [0, 6],
      [22, 28],
    ])
    .hline(12, -28, 40, [
      [-10, -4],
      [12, 18],
      [32, 38],
    ])
    .drip(-18, -20, 4, 0)
    .shard(-16, -20, 2)
    .drip(4, 20, 4, 1)
    .shard(6, 20, 2)
    .drip(24, -20, 4, 2)
    .shard(26, -20, 2)
    .drip(30, 0, 4, 3)
    .shard(32, 0, 3)
    .shards(
      [
        [-30, -22],
        [-4, 0],
        [12, 0],
        [40, 22],
        [40, -22],
      ],
      1,
    )
    .beast('slug', 14, 22)
    .done(PACE['drip-hall']);
}

/** A stream with two bridges to build, Spitters watching each from the far bank. */
function bridgeWatch() {
  return new Field({
    id: 'bridge-watch',
    name: 'Bridge Watch',
    brief:
      'A stream cuts the field in two; two bridge sites wait for logs, and a Bogspitter watches each from the far bank. Build under fire, or build the quieter bridge and go round. The far bank holds most of the shards.',
    theme: 'marsh',
    look: 'root',
    width: 88,
    depth: 64,
    dayLength: 0,
    seed: 1407,
    squad: { ember: 8, stone: 8 },
    kiln: { x: -36, z: 0 },
  })
    .water([-4, -32, 2, -22])
    .water([-4, -16, 2, 16])
    .water([-4, 22, 2, 32])
    .bridge([-4, -22, 2, -16], { x: -7, z: -19 }, [
      { x: -20, z: -24 },
      { x: -24, z: -14 },
    ])
    .bridge([-4, 16, 2, 22], { x: -7, z: 19 }, [
      { x: -20, z: 24 },
      { x: -24, z: 14 },
    ])
    .beast('spitter', 12, -20)
    .beast('spitter', 14, 20)
    .shards(
      [
        [22, -26],
        [30, -10],
        [26, 6],
        [34, 24],
        [38, 0],
      ],
      2,
    )
    .shards(
      [
        [-24, 0],
        [-14, -6],
      ],
      1,
    )
    .shard(40, -24, 3)
    .done(PACE['bridge-watch']);
}

/** A warren of little rooms, Skitters in most of them. */
function skitterWarren() {
  return new Field({
    id: 'skitter-warren',
    name: 'Skitter Warren',
    brief:
      'A warren of little earthen rooms, nine in all, most with a Skitter or two in it. Skitters are small but quick, and a crew strung out along a tunnel is easy prey. Go room by room with the squad together.',
    theme: 'cave',
    look: 'root',
    width: 78,
    depth: 78,
    dayLength: 0,
    seed: 1408,
    squad: { ember: 8, stone: 8, spark: 4 },
    kiln: { x: -28, z: 28 },
  })
    .vline(-13, -39, 39, [
      [-28, -22],
      [-4, 2],
      [22, 28],
    ])
    .vline(13, -39, 39, [
      [-30, -24],
      [6, 12],
      [24, 30],
    ])
    .hline(-13, -39, 39, [
      [-30, -24],
      [-2, 4],
      [26, 32],
    ])
    .hline(13, -39, 39, [
      [-24, -18],
      [2, 8],
      [20, 26],
    ])
    .beast('skitter', 0, 0)
    .beast('skitter', 26, -26)
    .beast('skitter', 30, -20)
    .beast('skitter', -26, -26)
    .beast('skitter', 26, 26)
    .beast('skitter', 0, -28)
    .shards(
      [
        [-30, -30],
        [0, -32],
        [30, -32],
        [-30, 0],
        [4, 4],
        [30, 0],
        [0, 30],
        [32, 30],
      ],
      2,
    )
    .done(PACE['skitter-warren']);
}

/** Four quarters, four dangers: a pool, a vent, a coil and a crystal door. */
function theCrucible() {
  return new Field({
    id: 'the-crucible',
    name: 'The Crucible',
    brief:
      'Four walled quarters, each a test for one kind: a pool for Dewlings, a vent for Emberlings, a coil for Sparklings and a crystal door for Stonelings. Send only the right kind into each, and only as many as the job needs.',
    theme: 'terrarium',
    look: 'tile',
    width: 80,
    depth: 80,
    dayLength: 0,
    seed: 1409,
    squad: { dew: 5, ember: 5, spark: 5, stone: 5 },
    kiln: { x: 0, z: 0 },
  })
    .pen([-36, -36, -10, -10], { e: [[-26, -20]] })
    .pen([10, -36, 36, -10], { w: [[-26, -20]] })
    .pen([-36, 10, -10, 36], { e: [[20, 26]] })
    .pen([10, 10, 36, 36], { w: [[20, 26]] })
    .water([-32, -32, -18, -20])
    .shards(
      [
        [-26, -26],
        [-22, -24],
      ],
      2,
    )
    .vent(28, -28)
    .shard(30, -26, 2)
    .coil({ x: -30, z: 28 }, { x: -26, z: 28 })
    .shard(-28, 30, 2)
    .gate([9, 20, 11, 26], 100, 'crystal')
    .shards(
      [
        [24, 24],
        [30, 30],
      ],
      3,
    )
    .shards(
      [
        [0, -24],
        [0, 24],
        [-24, 0],
        [24, 0],
      ],
      1,
    )
    .done(PACE['the-crucible']);
}

/** Shallows where Shellbacks bask: flip each with a throw before the crew goes near. */
function shellbackShallows() {
  return new Field({
    id: 'shellback-shallows',
    name: 'Shellback Shallows',
    brief:
      'A marsh of shallow pools where Shellbacks bask beside the shards. A Shellback is harmless only on its back: flip it with a throw first, then send the crew. Dewlings work the pools; the rest keep to the grass.',
    theme: 'marsh',
    look: 'root',
    width: 84,
    depth: 64,
    dayLength: 0,
    seed: 1410,
    squad: { dew: 6, stone: 8, ember: 6 },
    kiln: { x: -36, z: -20 },
  })
    .water([-16, -10, -4, 4])
    .water([8, 10, 20, 24])
    .water([22, -24, 34, -12])
    .beast('shellback', -10, 12)
    .beast('shellback', 14, -4)
    .beast('shellback', 30, 4)
    .shards(
      [
        [-10, -3],
        [14, 17],
        [28, -18],
      ],
      2,
    )
    .shards(
      [
        [-20, 20],
        [2, -20],
        [36, 18],
        [38, -4],
      ],
      2,
    )
    .done(PACE['shellback-shallows']);
}

/** A grove of rocks and three wasp nests: the swarms rise when a nest is touched. */
function waspGrove() {
  return new Field({
    id: 'wasp-grove',
    name: 'Wasp Grove',
    brief:
      'A grove of stones with three wasp nests hung among them, their shards beneath. Touch a nest and its Sparkwasps rise; their sting knocks down anything but a Sparkling. Bring the nests down with Sparklings and keep the others back until the air is clear.',
    theme: 'meadow',
    look: 'rock',
    width: 80,
    depth: 64,
    dayLength: 0,
    seed: 1411,
    squad: { spark: 8, ember: 6, stone: 6 },
    kiln: { x: -34, z: 0 },
  })
    .rock(-14, -14, 4)
    .rock(-6, 16, 4)
    .rock(10, -4, 4)
    .rock(22, 20, 4)
    .rock(26, -20, 4)
    .beast('waspnest', -4, -20)
    .beast('waspnest', 14, 14)
    .beast('waspnest', 32, -8)
    .shards(
      [
        [-2, -24],
        [16, 18],
        [34, -12],
      ],
      2,
    )
    .shards(
      [
        [-20, 6],
        [0, 2],
        [24, 4],
        [36, 24],
      ],
      2,
    )
    .done(PACE['wasp-grove']);
}

/** Two roads to the prize: one past hazards that need the right kinds, one past beasts. */
function twoRoads() {
  return (
    new Field({
      id: 'two-roads',
      name: 'Two Roads',
      brief:
        'Two walled roads run to the treasury at the far end. Off the north road a flame vent guards a pocket only Emberlings can work; the south road is guarded by Mossbacks and has a coil pocket for Sparklings. Choose which road each crew takes, and lose nobody on either.',
      theme: 'dusk',
      look: 'ruin',
      width: 96,
      depth: 64,
      dayLength: 0,
      seed: 1412,
      squad: { ember: 7, spark: 7, stone: 8 },
      kiln: { x: -42, z: 0 },
    })
      .hline(-6, -30, 30)
      .hline(6, -30, 30)
      .hline(-22, -30, 30, [[-6, 0]])
      .hline(22, -30, 30, [[0, 6]])
      // Each road's hazard waits in a pocket off it, behind a gap in the outer wall.
      .vent(-3, -28)
      .shard(-1, -28, 2)
      .coil({ x: 1, z: 28 }, { x: 5, z: 28 })
      .shard(3, 29, 2)
      .beast('mossback', -6, 14)
      .beast('mossback', 18, 14)
      .pen([34, -18, 46, 18], { w: [[-3, 3]] })
      .shards(
        [
          [40, -10],
          [40, 0],
          [40, 10],
        ],
        3,
      )
      .shards(
        [
          [-24, -28],
          [-24, 28],
          [10, -28],
          [10, 28],
        ],
        1,
      )
      .done(PACE['two-roads'])
  );
}

export const TRIAL_FIELDS = challengeFields(
  'trial',
  byPace([
    tightrope(),
    emberAlcoves(),
    sparkCloister(),
    floodedCrypt(),
    sleepingGiants(),
    dripHall(),
    bridgeWatch(),
    skitterWarren(),
    theCrucible(),
    shellbackShallows(),
    waspGrove(),
    twoRoads(),
  ]),
);
