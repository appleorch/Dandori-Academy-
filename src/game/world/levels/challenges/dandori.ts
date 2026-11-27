import { byPace, Field } from './build';
import { challengeFields } from './field';

/**
 * Dandori Challenge fields, each written by hand around doing several things at once. Everything
 * that can be carried counts by weight, beasts too, and Platinum and Diamond need it all
 * collected, so every field has jobs that run by themselves while the Warden starts the next.
 */

/** Measured by the test player (`npm run paces`): its finishing time, which is Platinum. */
const PACE: Record<string, number> = {
  'split-shift': 173,
  'the-sap-works': 155,
  'gate-ring': 122,
  'herd-and-harvest': 185,
  'twin-kitchens': 138,
  'mound-field': 144,
  'the-waterworks': 164,
  'beacon-chain': 134,
  'chasm-garden': 141,
  'bailey-and-keep': 289,
  'the-clockworks': 115,
  'grand-bazaar': 142,
};

/** A river down the middle, two bridges to build: send carriers one way while builders work. */
function splitShift() {
  return new Field({
    id: 'split-shift',
    name: 'Split Shift',
    brief:
      'A river runs down the middle of the field with the Kiln on the near bank. Two bridge sites wait for their logs. Set one crew building while another clears the near bank, then send everyone over: the far bank holds the heavy shards and a pair of Mossbacks to carry home.',
    theme: 'autumn',
    look: 'fence',
    width: 84,
    depth: 64,
    dayLength: 420,
    seed: 1301,
    squad: { ember: 10, stone: 8 },
    kiln: { x: -34, z: 0 },
  })
    .water([-2, -32, 4, -20])
    .water([-2, -14, 4, 14])
    .water([-2, 20, 4, 32])
    .bridge([-2, -20, 4, -14], { x: -5, z: -17 }, [
      { x: -20, z: -24 },
      { x: -24, z: -12 },
    ])
    .bridge([-2, 14, 4, 20], { x: -5, z: 17 }, [
      { x: -20, z: 24 },
      { x: -24, z: 12 },
    ])
    .shards(
      [
        [-26, -26],
        [-14, -6],
        [-14, 8],
        [-26, 26],
        [-8, 28],
      ],
      1,
    )
    .shards(
      [
        [18, -24],
        [26, -6],
        [18, 10],
        [30, 24],
        [36, -28],
      ],
      3,
    )
    .shard(34, 4, 5)
    .beast('mossback', 22, -14)
    .beast('mossback', 24, 18)
    .done(PACE['split-shift']);
}

/** Sapdrops in the far corners speed up every haul: fetch them first, carry heavy after. */
function theSapWorks() {
  return new Field({
    id: 'the-sap-works',
    name: 'The Sap Works',
    brief:
      'Gear-walled workshops full of heavy shards, far too slow to carry at a walk. Sapdrops sit in the far corners: bring one home and every haul speeds up for a while. Fetch a sap, then send every crew out at once while it lasts.',
    theme: 'terrarium',
    look: 'gear',
    width: 88,
    depth: 64,
    dayLength: 440,
    seed: 1302,
    squad: { stone: 10, ember: 8, spark: 4 },
    kiln: { x: -38, z: 0 },
  })
    .pen([-20, -28, 4, -6], { s: [[-12, -6]], w: [[-20, -14]] })
    .pen([12, -28, 38, -6], { s: [[20, 26]], w: [[-14, -8]] })
    .pen([-20, 6, 4, 28], { n: [[-12, -6]], w: [[14, 20]] })
    .pen([12, 6, 38, 28], { n: [[20, 26]], w: [[8, 14]] })
    .sap(-36, -26)
    .sap(36, 0)
    .sap(-36, 26)
    .shards(
      [
        [-12, -18],
        [-2, -14],
        [20, -18],
        [30, -14],
        [-12, 18],
        [-2, 14],
        [20, 18],
        [30, 14],
      ],
      4,
    )
    .shards(
      [
        [0, 0],
        [20, 0],
      ],
      2,
    )
    .beast('hedgehog', 26, -20)
    .beast('skitter', -8, 22)
    .done(PACE['the-sap-works']);
}

/** Six pockets round the Kiln, each behind a bramble gate of a different strength. */
function gateRing() {
  return new Field({
    id: 'gate-ring',
    name: 'Gate Ring',
    brief:
      'Six walled pockets ring the Kiln, each behind a bramble gate, from a flimsy one to a thick one. Leave a few Sproutlings hacking at the thick gates while the rest empty the pockets already open: idle hands are the only thing this field punishes.',
    theme: 'meadow',
    look: 'brick',
    width: 84,
    depth: 84,
    dayLength: 460,
    seed: 1303,
    squad: { ember: 10, stone: 10, spark: 4 },
    kiln: { x: 0, z: 0 },
  })
    .pen([-36, -36, -14, -14], { e: [[-28, -22]] })
    .pen([-8, -38, 8, -20], { s: [[-3, 3]] })
    .pen([14, -36, 36, -14], { w: [[-28, -22]] })
    .pen([-36, 14, -14, 36], { e: [[22, 28]] })
    .pen([-8, 20, 8, 38], { n: [[-3, 3]] })
    .pen([14, 14, 36, 36], { w: [[22, 28]] })
    .gate([-15, -28, -13, -22], 60)
    .gate([-3, -21, 3, -19], 100)
    .gate([13, -28, 15, -22], 160)
    .gate([-15, 22, -13, 28], 220)
    .gate([-3, 19, 3, 21], 140)
    .gate([13, 22, 15, 28], 260)
    .shards(
      [
        [-28, -28],
        [-22, -20],
        [0, -30],
        [28, -28],
        [22, -20],
        [-28, 28],
        [-22, 20],
        [0, 30],
        [28, 28],
        [22, 20],
      ],
      3,
    )
    .shards(
      [
        [-34, 0],
        [34, 0],
      ],
      2,
    )
    .beast('mossback', 26, -4)
    .beast('slug', -26, 4)
    .done(PACE['gate-ring']);
}

/** Pastures of grazing beasts and shards in the hedgerows between them. */
function herdAndHarvest() {
  return new Field({
    id: 'herd-and-harvest',
    name: 'Herd and Harvest',
    brief:
      'Hedgerows part four pastures, each grazed by a beast heavier than any shard here. Every carcass counts by weight in a Dandori Challenge: fight with half the squad while the other half harvests the hedgerows, and keep both halves busy.',
    theme: 'meadow',
    look: 'hedge',
    width: 92,
    depth: 72,
    dayLength: 480,
    seed: 1304,
    squad: { stone: 12, ember: 10, spark: 4 },
    kiln: { x: -42, z: 0 },
  })
    .hline(0, -30, 46, [
      [-14, -8],
      [10, 16],
      [30, 36],
    ])
    .vline(8, -36, 36, [
      [-26, -20],
      [-6, 6],
      [20, 26],
    ])
    .beast('mossback', -12, -20)
    .beast('ramhorn', 26, -20)
    .beast('mossback', -10, 20)
    .beast('spitter', 30, 20)
    .beast('skitter', 40, -30)
    .shards(
      [
        [-26, -2],
        [-2, 4],
        [14, -4],
        [40, 2],
        [6, -30],
        [10, 30],
        [-28, -30],
        [-28, 30],
      ],
      2,
    )
    .shards(
      [
        [42, -14],
        [42, 14],
      ],
      3,
    )
    .done(PACE['herd-and-harvest']);
}

/** Two tiled kitchens, mirror images, with twin shards split between them. */
function twinKitchens() {
  return new Field({
    id: 'twin-kitchens',
    name: 'Twin Kitchens',
    brief:
      'Two tiled kitchens face each other across a hallway, mirror images with one difference: each twin shard has its other half in the other kitchen. Bring both halves home within ten seconds for half their value again. Dewglass waits on both stoves; drop it and it cracks.',
    theme: 'terrarium',
    look: 'tile',
    width: 88,
    depth: 72,
    dayLength: 460,
    seed: 1305,
    squad: { ember: 10, stone: 8, spark: 6 },
    kiln: { x: 0, z: 30 },
  })
    .pen([-40, -32, -8, 8], { s: [[-30, -24]], e: [[-22, -16]] })
    .pen([8, -32, 40, 8], { s: [[24, 30]], w: [[-22, -16]] })
    .vline(-24, -32, -6)
    .vline(24, -32, -6)
    .shard(-32, -24, 3, { twin: 'a' })
    .shard(32, -24, 3, { twin: 'a' })
    .shard(-16, 0, 2, { twin: 'b' })
    .shard(16, 0, 2, { twin: 'b' })
    .shard(-32, 0, 2, { twin: 'c' })
    .shard(32, 0, 2, { twin: 'c' })
    .shard(-16, -24, 2, { variant: 'dewglass' })
    .shard(16, -24, 2, { variant: 'dewglass' })
    .shards(
      [
        [-30, -12],
        [30, -12],
        [0, -20],
        [-36, 24],
        [36, 24],
      ],
      1,
    )
    .beast('hedgehog', -14, -12)
    .beast('hedgehog', 14, -12)
    .done(PACE['twin-kitchens']);
}

/** Mounds everywhere: some hide pods, some hide shards, all need digging. */
function moundField() {
  return new Field({
    id: 'mound-field',
    name: 'Mound Field',
    brief:
      'The field is bumpy with soft mounds. Some hide seed pods, and the shards here are buried under mounds of their own: idle Sproutlings dig by themselves, so leave a few by each mound and move on, and come back for what comes up.',
    theme: 'dusk',
    look: 'root',
    width: 84,
    depth: 64,
    dayLength: 480,
    seed: 1306,
    squad: { stone: 10, ember: 10 },
    kiln: { x: -36, z: 0 },
  })
    .rock(-10, -10, 4, 'root')
    .rock(12, 12, 4, 'root')
    .rock(24, -18, 4, 'root')
    .shards(
      [
        [-20, -22],
        [-4, 22],
        [10, -24],
        [26, 4],
        [36, -24],
        [36, 22],
      ],
      3,
      { buried: true },
    )
    .shards(
      [
        [-24, 16],
        [0, -4],
        [18, 26],
      ],
      2,
      { buried: true },
    )
    .mound(-22, 0)
    .mound(4, 10)
    .mound(20, -6, 'sap')
    .mound(30, 18)
    .beast('skitter', 10, 0)
    .beast('mossback', 30, -10)
    .done(PACE['mound-field']);
}

/** Streams, vents and coils: each kind has its own job, and they all run at once. */
function theWaterworks() {
  return new Field({
    id: 'the-waterworks',
    name: 'The Waterworks',
    brief:
      'Three works off one yard: a cistern where shards lie in the water (Dewlings), a boiler room with flame vents (Emberlings) and a pump house under a crackling coil (Sparklings). Sort the squad by kind and send each to its own works at once.',
    theme: 'terrarium',
    look: 'brick',
    width: 84,
    depth: 72,
    dayLength: 460,
    seed: 1307,
    squad: { dew: 7, ember: 7, spark: 7, stone: 5 },
    kiln: { x: -34, z: 24 },
  })
    .pen([-30, -32, -6, -8], { s: [[-22, -16]] })
    .pen([2, -32, 26, -8], { s: [[10, 16]] })
    .pen([2, 4, 26, 28], { w: [[18, 24]] })
    .water([-26, -28, -10, -16])
    .shards(
      [
        [-22, -22],
        [-14, -20],
      ],
      2,
    )
    .shard(-18, -24, 3)
    .vent(20, -26)
    .shard(22, -24, 2)
    .vent(8, -26, 4, 2)
    .shard(6, -24, 2)
    .coil({ x: 18, z: 22 }, { x: 22, z: 22 })
    .shard(20, 23, 2)
    .shards(
      [
        [-20, 4],
        [0, 0],
        [34, -20],
        [36, 10],
        [-4, 30],
        [34, 30],
      ],
      2,
    )
    .beast('slug', 34, -6)
    .done(PACE['the-waterworks']);
}

/** A long field with three cold beacons on the way out: light them and the walk home shrinks. */
function beaconChain() {
  return new Field({
    id: 'beacon-chain',
    name: 'Beacon Chain',
    brief:
      'A long, narrow field running far from the Kiln, with three cold beacons along the way. Every lit beacon is a place to bring hauls home to. Light them as you go out, and the far end, where the heaviest shards are, is no longer far at all.',
    theme: 'dusk',
    look: 'ruin',
    width: 132,
    depth: 48,
    dayLength: 520,
    seed: 1308,
    squad: { stone: 10, ember: 10, spark: 4 },
    kiln: { x: -60, z: 0 },
  })
    .hline(-8, -40, 52, [
      [-24, -18],
      [10, 16],
      [40, 46],
    ])
    .hline(8, -32, 60, [
      [-6, 0],
      [24, 30],
    ])
    .beacon(-24, 0)
    .beacon(10, 0)
    .beacon(44, 0)
    .shards(
      [
        [-40, -16],
        [-30, 16],
        [-10, -16],
        [0, 18],
        [24, -16],
        [30, 16],
        [52, -16],
        [56, 16],
      ],
      2,
    )
    .shards(
      [
        [60, -6],
        [60, 6],
        [36, 0],
      ],
      4,
    )
    .beast('mossback', 20, -16)
    .beast('skitter', 48, 18)
    .beast('spitter', -16, 18)
    .done(PACE['beacon-chain']);
}

/** Chasms split the garden: throws fly straight across, but every haul walks the long way round. */
function chasmGarden() {
  return new Field({
    id: 'chasm-garden',
    name: 'Chasm Garden',
    brief:
      'Deep chasms split the garden into pockets. A thrown Sproutling sails straight over, but whatever it lifts must be carried the long way round, past the chasms’ far ends. Throw crews across early so their long walks home overlap, and never wait for one to finish.',
    theme: 'dusk',
    look: 'pit',
    width: 96,
    depth: 76,
    dayLength: 560,
    seed: 1309,
    squad: { ember: 10, stone: 10, spark: 6 },
    kiln: { x: 0, z: 30 },
  })
    .hline(10, -40, 40, [[-5, 5]], 'pit', 4)
    .vline(-18, -38, 8, [[-38, -30]], 'pit', 4)
    .vline(18, -38, 8, [[-38, -30]], 'pit', 4)
    .shards(
      [
        [-34, -20],
        [-28, 0],
        [-8, -24],
        [8, -10],
        [28, -22],
        [34, 2],
      ],
      2,
    )
    .shards(
      [
        [-32, -34],
        [32, -34],
        [0, -34],
      ],
      3,
    )
    .shards(
      [
        [-36, 26],
        [36, 26],
        [-20, 20],
        [20, 20],
      ],
      1,
    )
    .beast('mossback', 0, -20)
    .beast('hedgehog', -30, -10)
    .done(PACE['chasm-garden']);
}

/** An outer bailey and an inner keep: brambles in the outer wall, crystal in the inner. */
function baileyAndKeep() {
  return new Field({
    id: 'bailey-and-keep',
    name: 'Bailey and Keep',
    brief:
      'A walled bailey with a keep inside it. The outer wall has bramble gates on three sides; the keep has crystal doors only Stonelings crack quickly, and the richest treasure behind them. Start the Stonelings on the keep from the first minute.',
    theme: 'autumn',
    look: 'brick',
    width: 96,
    depth: 84,
    dayLength: 640,
    seed: 1310,
    squad: { stone: 12, ember: 10, spark: 4 },
    kiln: { x: -42, z: 34 },
  })
    .pen([-30, -34, 38, 26], { w: [[-6, 0]], n: [[2, 8]], e: [[-6, 0]] })
    .gate([-31, -6, -29, 0], 100)
    .gate([2, -35, 8, -33], 140)
    .gate([37, -6, 39, 0], 140)
    .pen([-8, -16, 20, 10], { w: [[-6, 0]], e: [[-6, 0]] })
    .gate([-9, -6, -7, 0], 100, 'crystal')
    .gate([19, -6, 21, 0], 100, 'crystal')
    .shards(
      [
        [0, -8],
        [12, -8],
        [0, 2],
        [12, 2],
      ],
      4,
    )
    .shard(6, -3, 6)
    .shards(
      [
        [-22, -26],
        [30, -26],
        [-22, 18],
        [30, 18],
        [6, 20],
        [6, -26],
      ],
      2,
    )
    .shards(
      [
        [-42, -36],
        [44, -36],
        [44, 36],
      ],
      2,
    )
    .beast('mossback', 30, -6)
    .beast('skitter', -22, -24)
    .beast('slug', 14, 18)
    .done(PACE['bailey-and-keep']);
}

/** A works of gear walls, belts that loop and coils that crackle in turn. */
function theClockworks() {
  return (
    new Field({
      id: 'the-clockworks',
      name: 'The Clockworks',
      brief:
        'Inside the Academy’s clockworks: gear walls, a belt loop running round the floor, and coils crackling in turn across the far bays. Ride the belt where it runs your way and walk where it does not. Only Sparklings work under the coils.',
      theme: 'terrarium',
      look: 'gear',
      width: 92,
      depth: 72,
      dayLength: 500,
      seed: 1311,
      squad: { spark: 8, stone: 8, ember: 8 },
      kiln: { x: -40, z: 0 },
    })
      // The bays' belts feed the main line, which runs through the works to the Kiln.
      .conveyor([24, -30, 30, -3], 0, 1)
      .conveyor([24, 3, 30, 30], 0, -1)
      .conveyor([-28, -3, 34, 3], -1, 0)
      .pen([-12, -12, 18, 12], { w: [[-3, 3]], e: [[-3, 3]] })
      .vline(38, -36, -6)
      .vline(38, 6, 36)
      .coil({ x: 42, z: -30 }, { x: 42, z: -26 })
      .coil({ x: 42, z: 26 }, { x: 42, z: 30 }, 4, 2)
      .shard(44, -28, 2)
      .shard(44, 28, 2)
      .shards(
        [
          [2, -8],
          [10, -8],
          [10, 8],
        ],
        3,
      )
      .shards(
        [
          [-20, -30],
          [10, -30],
          [-20, 30],
          [10, 30],
          [27, -24],
          [27, 24],
        ],
        2,
      )
      .beast('hedgehog', 4, -18)
      .beast('skitter', 24, 18)
      .done(PACE['the-clockworks'])
  );
}

/** Four districts round a square, each a different trade: pond, terraces, dens and gates. */
function grandBazaar() {
  return (
    new Field({
      id: 'grand-bazaar',
      name: 'Grand Bazaar',
      brief:
        'The Grand Bazaar has four quarters round its square, each a trade of its own: the carousel stall whose belt brings its wares towards the square, the terraced spice stalls, the beast pens, and the locked strongrooms behind brambles. Run all four at once.',
      theme: 'dusk',
      look: 'fence',
      width: 104,
      depth: 88,
      dayLength: 720,
      seed: 1312,
      squad: { stone: 12, ember: 10, spark: 6 },
      kiln: { x: 0, z: 0 },
    })
      .hline(-14, -50, -14, [[-34, -28]])
      .hline(-14, 14, 50, [[28, 34]])
      .hline(14, -50, -14, [[-34, -28]])
      .hline(14, 14, 50, [[28, 34]])
      .vline(-14, -42, -14, [[-28, -22]])
      .vline(14, -42, -14, [[-28, -22]])
      .vline(-14, 14, 42, [[22, 28]])
      .vline(14, 14, 42, [[22, 28]])
      // North-west: the carousel stall, its belt running towards the square.
      .conveyor([-46, -36, -40, -18], 0, 1)
      .conveyor([-46, -24, -22, -18], 1, 0)
      .shards(
        [
          [-43, -32],
          [-36, -32],
        ],
        2,
      )
      .shard(-28, -34, 3)
      // North-east: a terraced stall.
      .terrace([24, -40, 44, -24], 3, [{ side: 's', from: 30, to: 36, kind: 'ramp' }])
      .shards(
        [
          [30, -34],
          [38, -34],
        ],
        3,
      )
      // South-west: beast pens.
      .beast('mossback', -36, 20)
      .beast('mossback', -22, 28)
      .shard(-44, 38, 3)
      // South-east: strongrooms behind brambles.
      .pen([24, 24, 44, 40], { w: [[28, 34]] })
      .gate([23, 28, 25, 34], 160)
      .shards(
        [
          [34, 30],
          [38, 36],
        ],
        4,
      )
      .shards(
        [
          [0, -30],
          [0, 30],
          [-30, 0],
          [30, 0],
        ],
        2,
      )
      .done(PACE['grand-bazaar'])
  );
}

export const DANDORI_FIELDS = challengeFields(
  'dandori',
  byPace([
    splitShift(),
    theSapWorks(),
    gateRing(),
    herdAndHarvest(),
    twinKitchens(),
    moundField(),
    theWaterworks(),
    beaconChain(),
    chasmGarden(),
    baileyAndKeep(),
    theClockworks(),
    grandBazaar(),
  ]),
);
