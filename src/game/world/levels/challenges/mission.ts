import { byPace, Field } from './build';
import { challengeFields } from './field';

/**
 * Mission fields, each written by hand around its beasts. A 100% clear (every Sunshard home and
 * every beast down and carried home) earns the time bonus, and Platinum and Diamond need it, so
 * every field is a hunt: which beast first, with how many, and what to carry while the rest fight.
 */

/** Measured by the test player (`npm run paces`): its finishing time, which is Platinum. */
const PACE: Record<string, number> = {
  'the-pens': 137,
  'ramhorn-run': 186,
  'wasp-orchard': 145,
  'shellback-shore': 134,
  'moth-lanterns': 93,
  'spitter-ridge': 217,
  'the-burrow': 235,
  'mimic-bazaar': 146,
  'bellwether-pasture': 307,
  'root-cellar': 279,
  'snuffers-hall': 125,
  'gravel-summit': 262,
};

/** Four fenced pens, each with its herd and its gate on a different side. */
function thePens() {
  return new Field({
    id: 'the-pens',
    name: 'The Pens',
    brief:
      'Four fenced pens stand round the Kiln, each holding a little herd and the shards it sleeps on, each open on a different side. Take them one pen at a time with the whole squad, and carry each herd home before the next.',
    theme: 'meadow',
    look: 'fence',
    width: 76,
    depth: 64,
    dayLength: 400,
    seed: 1201,
    squad: { ember: 10, stone: 8 },
    kiln: { x: 0, z: 24 },
  })
    .pen([-34, -28, -12, -8], { e: [[-21, -15]] })
    .pen([12, -28, 34, -8], { w: [[-21, -15]] })
    .pen([-34, 0, -14, 18], { n: [[-26, -20]] })
    .pen([14, 0, 34, 18], { n: [[20, 26]] })
    .beast('skitter', -26, -20)
    .beast('skitter', -20, -14)
    .beast('skitter', -28, -12)
    .beast('slug', 22, -20)
    .beast('slug', 28, -14)
    .beast('mossback', -24, 10)
    .beast('hedgehog', 24, 10)
    .shards(
      [
        [-30, -24],
        [-16, -24],
        [16, -24],
        [30, -24],
        [-30, 14],
        [30, 14],
      ],
      2,
    )
    .shards(
      [
        [0, -20],
        [0, 0],
      ],
      3,
    )
    .done(PACE['the-pens']);
}

/** Three Ramhorns on an open run of rocks: stand behind a rock, and let them charge into it. */
function ramhornRun() {
  return new Field({
    id: 'ramhorn-run',
    name: 'Ramhorn Run',
    brief:
      'Three Ramhorns graze a long run strewn with boulders. A charging Ramhorn that hits a rock is left dazed and open: stand the Warden behind a boulder, wait for the charge, then pile on. Ruined walls part the run into two lanes with crossings, so there is always a way round.',
    theme: 'autumn',
    look: 'ruin',
    width: 92,
    depth: 56,
    dayLength: 420,
    seed: 1202,
    squad: { stone: 10, ember: 10 },
    kiln: { x: -40, z: 0 },
  })
    .hline(0, -28, 40, [
      [-12, -6],
      [8, 14],
      [26, 32],
    ])
    .rock(-16, -14, 4)
    .rock(2, -16, 4)
    .rock(20, -12, 4)
    .rock(-8, 14, 4)
    .rock(12, 16, 4)
    .rock(30, 12, 4)
    .beast('ramhorn', 10, -12)
    .beast('ramhorn', 4, 14)
    .beast('ramhorn', 34, -14)
    .shards(
      [
        [-24, -20],
        [-2, -22],
        [26, -22],
        [-20, 20],
        [20, 22],
        [38, 20],
      ],
      2,
    )
    .shards(
      [
        [40, -4],
        [40, 6],
      ],
      4,
    )
    .done(PACE['ramhorn-run']);
}

/** Rows of orchard hedges with wasp nests among them; the swarms rise when a nest is touched. */
function waspOrchard() {
  return new Field({
    id: 'wasp-orchard',
    name: 'Wasp Orchard',
    brief:
      'An orchard of short hedges in rows, with three wasp nests hung among them. Strike a nest and its Sparkwasps rise: Sparklings shrug off their sting. Clear one corner of the orchard at a time, the squad together.',
    theme: 'meadow',
    look: 'hedge',
    width: 80,
    depth: 64,
    dayLength: 420,
    seed: 1203,
    squad: { spark: 10, ember: 8, stone: 4 },
    kiln: { x: -34, z: 0 },
  })
    .hline(-20, -20, -4)
    .hline(-20, 6, 22)
    .hline(-4, -12, 4)
    .hline(-4, 14, 30)
    .hline(12, -20, -4)
    .hline(12, 6, 22)
    .hline(26, -12, 4)
    .hline(26, 14, 30)
    .beast('waspnest', -12, -12)
    .beast('waspnest', 22, 4)
    .beast('waspnest', -4, 20)
    .beast('skitter', 30, -24)
    .shards(
      [
        [-16, -26],
        [14, -26],
        [-6, -10],
        [22, -10],
        [-14, 4],
        [12, 18],
        [24, 18],
        [32, 28],
      ],
      2,
    )
    .shards(
      [
        [34, -6],
        [34, 8],
      ],
      3,
    )
    .done(PACE['wasp-orchard']);
}

/** A shore of rock pools where Shellbacks bask: flip each with a throw before it can be hurt. */
function shellbackShore() {
  return new Field({
    id: 'shellback-shore',
    name: 'Shellback Shore',
    brief:
      'Shellbacks bask between the rock pools of a long shore. A Shellback never lies open by itself: throw a Sproutling at it to flip it, then swarm it before it rights itself. Bogspitters spit from across the pools; the shards wait at the water’s edge.',
    theme: 'marsh',
    look: 'root',
    width: 88,
    depth: 60,
    dayLength: 440,
    seed: 1204,
    squad: { dew: 8, stone: 8, ember: 6 },
    kiln: { x: -38, z: -18 },
  })
    .water([-20, 6, -8, 18])
    .water([4, -24, 16, -12])
    .water([14, 10, 28, 22])
    .water([30, -10, 40, 0])
    .beast('shellback', -12, -6)
    .beast('shellback', 22, -2)
    .beast('shellback', 4, 22)
    .beast('spitter', 34, 16)
    .beast('spitter', -24, 22)
    .shards(
      [
        [-14, 12],
        [10, -18],
        [20, 16],
        [35, -5],
      ],
      2,
    )
    .shards(
      [
        [-30, 10],
        [0, 0],
        [30, -22],
        [38, 24],
      ],
      3,
    )
    .done(PACE['shellback-shore']);
}

/** Moths flutter over candle-lit stalls: only a thrown Sproutling can reach one. */
function mothLanterns() {
  return new Field({
    id: 'moth-lanterns',
    name: 'Moth Lanterns',
    brief:
      'Pollen Moths flutter over a square of candle-lit brick alcoves at dusk. A moth is out of reach on foot: only a thrown Sproutling knocks one down, so keep the squad close and throw, throw, throw. Cold lanterns at the far alcoves light a nearer way home.',
    theme: 'dusk',
    look: 'brick',
    width: 80,
    depth: 80,
    dayLength: 440,
    seed: 1205,
    squad: { ember: 9, spark: 9, stone: 4 },
    kiln: { x: 0, z: 0 },
  })
    .pen([-34, -34, -14, -14], { e: [[-27, -21]], s: [[-27, -21]] })
    .pen([14, -34, 34, -14], { w: [[-27, -21]], s: [[21, 27]] })
    .pen([-34, 14, -14, 34], { e: [[21, 27]], n: [[-27, -21]] })
    .pen([14, 14, 34, 34], { w: [[21, 27]], n: [[21, 27]] })
    .beast('moth', -24, -24)
    .beast('moth', 24, -24)
    .beast('moth', -24, 24)
    .beast('moth', 24, 24)
    .beast('moth', 0, -28)
    .beast('mossback', 0, 28)
    .beacon(-28, -28)
    .beacon(28, 28)
    .shards(
      [
        [-20, -28],
        [28, -20],
        [-28, 20],
        [20, 28],
      ],
      3,
    )
    .shards(
      [
        [-30, 0],
        [30, 0],
        [0, -34],
        [0, 34],
      ],
      2,
    )
    .done(PACE['moth-lanterns']);
}

/** Spitters on a ridge of terraces: climb the ramps, or throw up from below. */
function spitterRidge() {
  return new Field({
    id: 'spitter-ridge',
    name: 'Spitter Ridge',
    brief:
      'Bogspitters hold a ridge of terraces above the meadow and spit down on anything below. Each terrace has one ramp, and they face every way: work round the ridge, taking each spitter from its ramp, or throw up from below and take the spit.',
    theme: 'autumn',
    look: 'cliff',
    width: 88,
    depth: 72,
    dayLength: 460,
    seed: 1206,
    squad: { stone: 10, ember: 8, spark: 4 },
    kiln: { x: -38, z: 28 },
  })
    .terrace([-26, -30, -6, -10], 3, [{ side: 'e', from: -24, to: -18, kind: 'ramp' }])
    .terrace([4, -30, 24, -10], 3, [{ side: 's', from: 8, to: 14, kind: 'ramp' }])
    .terrace([12, 2, 36, 22], 3, [{ side: 'w', from: 4, to: 10, kind: 'ramp' }])
    .terrace([-16, 6, 2, 22], 3, [{ side: 'n', from: -10, to: -4, kind: 'ramp' }])
    .beast('spitter', -16, -20)
    .beast('spitter', 14, -20)
    .beast('spitter', 26, 12)
    .beast('spitter', -8, 16)
    .beast('mossback', 30, -26)
    .shards(
      [
        [-20, -24],
        [-12, -14],
        [18, -24],
        [10, -14],
        [30, 16],
        [20, 8],
        [-12, 12],
        [-2, 18],
      ],
      2,
    )
    .shards(
      [
        [38, -30],
        [-36, -30],
      ],
      3,
    )
    .done(PACE['spitter-ridge']);
}

/** Rooms and tunnels where Burrow Grubs surface without warning. */
function theBurrow() {
  return new Field({
    id: 'the-burrow',
    name: 'The Burrow',
    brief:
      'A warren of earthen rooms and tunnels. Burrow Grubs swim through the soil and surface under the unwary: they cannot be fought until they come up, so keep the squad moving and strike the moment one shows. Skitters run the tunnels.',
    theme: 'cave',
    look: 'rock',
    width: 84,
    depth: 64,
    dayLength: 460,
    seed: 1207,
    squad: { stone: 10, ember: 8, dew: 4 },
    kiln: { x: -34, z: 0 },
  })
    .vline(-20, -32, 32, [
      [-4, 4],
      [18, 24],
    ])
    .vline(6, -32, 32, [
      [-22, -16],
      [6, 12],
    ])
    .hline(-12, -20, 42, [
      [-8, -2],
      [22, 28],
    ])
    .hline(14, 6, 42, [[24, 30]])
    .beast('grub', -6, -22)
    .beast('grub', 24, -22)
    .beast('grub', 24, 0)
    .beast('skitter', -6, 20)
    .beast('skitter', 28, 24)
    .beast('skitter', -6, 0)
    .shards(
      [
        [-12, -24],
        [-8, 24],
        [16, -26],
        [34, -24],
        [18, 0],
        [34, 4],
        [16, 24],
        [36, 26],
      ],
      2,
    )
    .shards(
      [
        [-28, -24],
        [-28, 24],
      ],
      3,
    )
    .done(PACE['the-burrow']);
}

/** A bazaar of glass stalls where some of the treasure is Mimics. */
function mimicBazaar() {
  return new Field({
    id: 'mimic-bazaar',
    name: 'Mimic Bazaar',
    brief:
      'Glass stalls line a covered bazaar, each with its wares, and not every treasure here is a treasure: Mimic Caps sit among the shards, waiting for a careless crew. A throw unmasks one without a bite. Hedgehogs patrol the aisles.',
    theme: 'terrarium',
    look: 'glass',
    width: 88,
    depth: 64,
    dayLength: 460,
    seed: 1208,
    squad: { ember: 10, stone: 8, spark: 4 },
    kiln: { x: -38, z: 0 },
  })
    .pen([-24, -28, -8, -12], { s: [[-19, -13]] })
    .pen([0, -28, 16, -12], { s: [[5, 11]] })
    .pen([24, -28, 40, -12], { w: [[-23, -17]] })
    .pen([-24, 12, -8, 28], { n: [[-19, -13]] })
    .pen([0, 12, 16, 28], { n: [[5, 11]] })
    .pen([24, 12, 40, 28], { w: [[17, 23]] })
    .beast('mimic', -14, -22)
    .beast('mimic', 8, 22)
    .beast('mimic', 34, -18)
    .beast('mimic', 30, 22)
    .beast('hedgehog', 4, 0)
    .beast('hedgehog', 30, 0)
    .shards(
      [
        [-18, -18],
        [4, -22],
        [12, -18],
        [30, -24],
        [-18, 22],
        [-12, 18],
        [12, 18],
        [36, 18],
      ],
      2,
    )
    .shards(
      [
        [-4, -4],
        [20, 4],
      ],
      3,
    )
    .done(PACE['mimic-bazaar']);
}

/** The Bellwether's pasture: pillars to bait its charge into, and its herd round it. */
function bellwetherPasture() {
  return new Field({
    id: 'bellwether-pasture',
    name: 'Bellwether Pasture',
    brief:
      'The Bellwether and its herd keep a fenced pasture. Its hide turns every blow until it charges into something hard and lies winded: bait it into the stone pillars, each good for two charges, then swarm it. Clear the herd first, or fight it with Mossbacks at your back.',
    theme: 'meadow',
    look: 'fence',
    width: 88,
    depth: 72,
    dayLength: 520,
    seed: 1209,
    squad: { stone: 12, ember: 10, spark: 4 },
    kiln: { x: -38, z: 0 },
  })
    .pen([-12, -28, 36, 28], {
      w: [
        [-20, -14],
        [14, 20],
      ],
    })
    .gate([2, -10, 5, -7], 2, 'pillar')
    .gate([2, 7, 5, 10], 2, 'pillar')
    .gate([20, -2, 23, 1], 2, 'pillar')
    .beast('bellwether', 14, 0, { drop: 8 })
    .beast('mossback', -24, -24)
    .beast('mossback', -24, 24)
    .beast('mossback', 28, -20)
    .shards(
      [
        [-30, -28],
        [-30, 28],
        [-4, -22],
        [-4, 22],
        [30, 22],
      ],
      2,
    )
    .shards(
      [
        [40, -30],
        [40, 30],
      ],
      3,
    )
    .done(PACE['bellwether-pasture']);
}

/** A cellar of three rooms, a Lanternroot in the middle and its root-knots in the others. */
function rootCellar() {
  return new Field({
    id: 'root-cellar',
    name: 'Root Cellar',
    brief:
      'A Lanternroot has grown through three cellar rooms. While its root-knots stand, nothing hurts it: break the knot in each side room first, then come back for the root in the middle. Skitters nest in the corners.',
    theme: 'cave',
    look: 'root',
    width: 92,
    depth: 64,
    dayLength: 540,
    seed: 1210,
    squad: { ember: 10, stone: 10, spark: 6 },
    kiln: { x: -40, z: 0 },
  })
    .vline(-18, -32, 32, [[-3, 3]])
    .vline(18, -32, 32, [
      [-24, -18],
      [18, 24],
    ])
    .hline(-10, 18, 46, [[30, 36]])
    .hline(10, 18, 46, [[30, 36]])
    .root(
      0,
      0,
      [
        { x: 32, z: -22 },
        { x: 32, z: 22 },
        { x: -30, z: -24 },
      ],
      8,
    )
    .beast('skitter', -6, -24)
    .beast('skitter', 6, 24)
    .beast('skitter', 38, 0)
    .shards(
      [
        [-8, -14],
        [8, 14],
        [-30, 24],
        [26, -26],
        [40, 26],
        [40, -26],
      ],
      2,
    )
    .shards(
      [
        [36, 4],
        [10, -24],
      ],
      3,
    )
    .done(PACE['root-cellar']);
}

/** A dark hall where the Snuffer puts out light; it can only be fought inside a beacon's glow. */
function snuffersHall() {
  return new Field({
    id: 'snuffers-hall',
    name: 'Snuffer’s Hall',
    brief:
      'A long dark hall where a Snuffer prowls, putting out whatever light it finds. In the dark it cannot be harmed: light the cold beacons along the hall and draw it into their glow to fight it. Its scattered treasure lies in the side chambers.',
    theme: 'cave',
    look: 'rock',
    width: 96,
    depth: 60,
    dayLength: 540,
    seed: 1211,
    squad: { ember: 12, stone: 10, spark: 4 },
    kiln: { x: -42, z: 0 },
  })
    .hline(-12, -32, 48, [
      [-20, -14],
      [4, 10],
      [28, 34],
    ])
    .hline(12, -32, 48, [
      [-8, -2],
      [16, 22],
      [36, 42],
    ])
    .beacon(-14, 0)
    .beacon(10, 0)
    .beacon(34, 0)
    .beast('snuffer', 22, 0, { drop: 6 })
    .beast('skitter', -10, -22)
    .beast('skitter', 20, 22)
    .shards(
      [
        [-24, -22],
        [0, -24],
        [26, -22],
        [42, -22],
        [-20, 22],
        [6, 24],
        [28, 24],
        [44, 22],
      ],
      2,
    )
    .shards(
      [
        [44, -4],
        [44, 4],
      ],
      3,
    )
    .done(PACE['snuffers-hall']);
}

/** Terraced heights where a Gravelmaw holds the summit, Spitters on the lower steps. */
function gravelSummit() {
  return new Field({
    id: 'gravel-summit',
    name: 'Gravel Summit',
    brief:
      'A Gravelmaw holds the summit of a flight of terraces, slamming the ground round it. Bogspitters guard the lower steps. Climb with the whole squad, take the spitters on the way, then wait out of the Gravelmaw’s reach until it lies open after a slam, and pile on.',
    theme: 'dusk',
    look: 'cliff',
    width: 96,
    depth: 80,
    dayLength: 560,
    seed: 1212,
    squad: { spark: 10, stone: 10, ember: 8 },
    kiln: { x: -42, z: 32 },
  })
    .terrace([-24, -36, 40, 10], 3, [
      { side: 's', from: -20, to: -14, kind: 'ramp' },
      { side: 's', from: 28, to: 34, kind: 'ramp' },
    ])
    .terrace([-8, -36, 32, -6], 6, [{ side: 's', from: 0, to: 6, kind: 'ramp' }], 3)
    .beast('gravelmaw', 12, -22, { drop: 6 })
    .beast('spitter', -16, -10)
    .beast('spitter', 34, -4)
    .beast('mossback', 30, 26)
    .beast('skitter', -30, -20)
    .shards(
      [
        [-20, 2],
        [36, 4],
        [-4, -12],
        [26, -12],
        [20, -30],
        [0, -30],
      ],
      2,
    )
    .shards(
      [
        [42, 32],
        [-30, -32],
        [10, 28],
      ],
      3,
    )
    .done(PACE['gravel-summit']);
}

export const MISSION_FIELDS = challengeFields(
  'mission',
  byPace([
    thePens(),
    ramhornRun(),
    waspOrchard(),
    shellbackShore(),
    mothLanterns(),
    spitterRidge(),
    theBurrow(),
    mimicBazaar(),
    bellwetherPasture(),
    rootCellar(),
    snuffersHall(),
    gravelSummit(),
  ]),
);
