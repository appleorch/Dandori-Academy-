import { Field } from './build';
import { challengeFields } from './field';

/**
 * Growing Season fields, each written by hand around how a squad grows. What counts is how many
 * Sproutlings are alive at sunset, so every field is about reaching what grows them: seed pods,
 * mounds that hide pods, and beasts whose carcasses the Kiln turns into Sproutlings.
 */

/** Measured by the test player (`npm run paces`): its headcount at sunset, which is Platinum. */
const PACE: Record<string, number> = {
  'raised-beds': 30,
  'mound-meadow': 31,
  'pod-islands': 28,
  'kind-garden': 26,
  'beast-country': 36,
  'far-nursery': 20,
  'seed-belt': 28,
  'glasshouse-aisles': 25,
  'grub-garden': 36,
  'orchard-ring': 34,
  'rainy-allotment': 28,
  'harvest-festival': 37,
};

/** Raised beds of seed pods, each bed climbed by a ramp at one end. */
function raisedBeds() {
  return new Field({
    id: 'raised-beds',
    name: 'Raised Beds',
    brief:
      'Raised beds of seed pods stand in rows across the allotment, each climbed by a ramp at one end. Every pod the Kiln takes in comes back as two new Sproutlings, who can fetch the next. Start with the nearest beds and let the squad snowball.',
    theme: 'meadow',
    look: 'flowerpot',
    width: 80,
    depth: 64,
    dayLength: 220,
    seed: 1501,
    squad: { ember: 4, stone: 2 },
    kiln: { x: -34, z: 0 },
  })
    .terrace([-20, -26, -4, -12], 2, [{ side: 'w', from: -22, to: -16, kind: 'ramp' }])
    .terrace([4, -26, 20, -12], 2, [{ side: 'e', from: -22, to: -16, kind: 'ramp' }])
    .terrace([-20, 12, -4, 26], 2, [{ side: 'w', from: 16, to: 22, kind: 'ramp' }])
    .terrace([4, 12, 20, 26], 2, [{ side: 'e', from: 16, to: 22, kind: 'ramp' }])
    .pod(-14, -20)
    .pod(-10, -18)
    .pod(10, -20)
    .pod(14, -18)
    .pod(-14, 20)
    .pod(-10, 18)
    .pod(10, 20)
    .pod(14, 18)
    .pod(-20, 0)
    .pod(0, 0)
    .pod(30, 0)
    .pod(34, -24)
    .done(PACE['raised-beds']);
}

/** A meadow of mounds, every one with a pod inside, and idle Sproutlings to dig them. */
function moundMeadow() {
  return new Field({
    id: 'mound-meadow',
    name: 'Mound Meadow',
    brief:
      'A meadow humped with soft mounds, a seed pod in every one. Idle Sproutlings dig by themselves: drop a few by each mound, move on, and send carriers back for what comes up. A Bogspitter keeps watch over the far end.',
    theme: 'autumn',
    look: 'hedge',
    width: 84,
    depth: 64,
    dayLength: 240,
    seed: 1502,
    squad: { stone: 4, ember: 4 },
    kiln: { x: -36, z: 0 },
  })
    .mound(-22, -16)
    .mound(-20, 14)
    .mound(-6, -4)
    .mound(4, 20)
    .mound(8, -22)
    .mound(20, 4)
    .mound(28, -18)
    .mound(30, 22)
    .pod(-26, 0)
    .pod(-10, 24)
    .beast('spitter', 36, 0)
    .done(PACE['mound-meadow']);
}

/** Pods on islands in a lake, bridges to build and Dewlings who wade. */
function podIslands() {
  return new Field({
    id: 'pod-islands',
    name: 'Pod Islands',
    brief:
      'Seed pods sit on islands in a reedy lake. Dewlings wade out and carry them straight back; everyone else needs the bridges built first. Grow some Dewlings early and the lake is yours.',
    theme: 'marsh',
    look: 'root',
    width: 84,
    depth: 64,
    dayLength: 260,
    seed: 1503,
    squad: { dew: 4, ember: 4 },
    kiln: { x: -36, z: 0 },
  })
    .water([-20, -32, -16, -3])
    .water([-20, 3, -16, 32])
    .water([-16, -12, 40, -8])
    .water([-16, 8, 40, 12])
    .bridge([-20, -3, -16, 3], { x: -23, z: 0 }, [
      { x: -28, z: -10 },
      { x: -28, z: 10 },
    ])
    .pod(-4, 0)
    .pod(14, -2)
    .pod(30, 2)
    .pod(-2, -22)
    .pod(18, -24)
    .pod(-2, 22)
    .pod(20, 24)
    .pod(34, -24)
    .pod(34, 24)
    .pod(-30, -24)
    .done(PACE['pod-islands']);
}

/** Pods of every kind, each behind the hazard only its own kind can cross. */
function kindGarden() {
  return new Field({
    id: 'kind-garden',
    name: 'Kind Garden',
    brief:
      'Four garden plots grow pods of four kinds, and each plot is guarded by what only its own kind can cross: a pond, a flame vent, a coil and a crystal door. Grow a few of each kind first, then send each kind to its own plot.',
    theme: 'terrarium',
    look: 'tile',
    width: 80,
    depth: 80,
    dayLength: 280,
    seed: 1504,
    squad: { dew: 2, ember: 2, spark: 2, stone: 2 },
    kiln: { x: 0, z: 0 },
  })
    .pen([-36, -36, -12, -12], { e: [[-28, -22]] })
    .pen([12, -36, 36, -12], { w: [[-28, -22]] })
    .pen([-36, 12, -12, 36], { e: [[22, 28]] })
    .pen([12, 12, 36, 36], { w: [[22, 28]] })
    .water([-32, -32, -20, -20])
    .pod(-26, -26, 'dew')
    .vent(30, -30)
    .pod(32, -28, 'ember')
    .coil({ x: -32, z: 30 }, { x: -28, z: 30 })
    .pod(-30, 32, 'spark')
    .gate([11, 22, 13, 28], 80, 'crystal')
    .pod(24, 24, 'stone')
    .pod(30, 30, 'stone')
    .pod(0, -24)
    .pod(0, 24)
    .pod(-24, 0)
    .pod(24, 0)
    .done(PACE['kind-garden']);
}

/** Open country of grazing beasts, each worth a crowd of Sproutlings when carried home. */
function beastCountry() {
  return new Field({
    id: 'beast-country',
    name: 'Beast Country',
    brief:
      'Open country with beasts grazing across it and hardly a pod in sight. Every carcass the Kiln takes in comes back as Sproutlings, the bigger the beast the more: start on the small ones, and take the big ones once the squad has grown.',
    theme: 'autumn',
    look: 'ruin',
    width: 92,
    depth: 72,
    dayLength: 300,
    seed: 1505,
    squad: { stone: 8, ember: 6 },
    kiln: { x: -40, z: 0 },
  })
    .hline(-12, -24, 10)
    .hline(14, 6, 40)
    .beast('skitter', -20, -26)
    .beast('skitter', -18, 26)
    .beast('slug', 0, 0)
    .beast('mossback', 14, -26)
    .beast('mossback', 24, 26)
    .beast('ramhorn', 34, -4)
    .pod(-30, -20)
    .pod(-28, 20)
    .done(PACE['beast-country']);
}

/** A far nursery of pods, with beacons on the way that bring the Kiln nearer. */
function farNursery() {
  return new Field({
    id: 'far-nursery',
    name: 'Far Nursery',
    brief:
      'The nursery beds are at the far end of a long walled garden, and the walk is slow. Cold beacons stand on the way: light them, and pods go to the nearest beacon instead of all the way home. Light the way first, then harvest.',
    theme: 'dusk',
    look: 'brick',
    width: 124,
    depth: 52,
    dayLength: 320,
    seed: 1506,
    squad: { ember: 6, stone: 4 },
    kiln: { x: -56, z: 0 },
  })
    .hline(-10, -36, 50, [
      [-20, -14],
      [8, 14],
      [36, 42],
    ])
    .hline(10, -28, 58, [
      [-4, 2],
      [22, 28],
    ])
    .beacon(-24, 0)
    .beacon(16, 0)
    .beacon(46, 0)
    .pod(-36, -18)
    .pod(-12, 18)
    .pod(8, -18)
    .pod(30, 18)
    .pod(40, -18)
    .pod(54, -18)
    .pod(54, 18)
    .pod(56, 0)
    .pod(-4, 0)
    .beast('skitter', 30, -18)
    .done(PACE['far-nursery']);
}

/** A greenhouse whose belts bring pods down the aisles towards the Kiln. */
function seedBelt() {
  return new Field({
    id: 'seed-belt',
    name: 'Seed Belt',
    brief:
      'A greenhouse with belts running down its aisles towards the Kiln. A pod set on a belt rides home by itself: put the crews to work at the far ends of the belts and let the belts do the walking.',
    theme: 'terrarium',
    look: 'glass',
    width: 88,
    depth: 64,
    dayLength: 280,
    seed: 1507,
    squad: { spark: 4, ember: 4 },
    kiln: { x: -38, z: 0 },
  })
    .conveyor([-26, -24, 38, -18], -1, 0)
    .conveyor([-26, 18, 38, 24], -1, 0)
    .hline(-10, -24, 40, [
      [-4, 2],
      [22, 28],
    ])
    .hline(10, -24, 40, [
      [6, 12],
      [30, 36],
    ])
    .pod(36, -21)
    .pod(28, -21)
    .pod(36, 21)
    .pod(28, 21)
    .pod(10, 0)
    .pod(30, 0)
    .pod(38, -30)
    .pod(38, 30)
    .mound(-6, 0)
    .mound(20, -28)
    .done(PACE['seed-belt']);
}

/** Long glass aisles, open at alternate ends: a long walk, but pods all the way. */
function glasshouseAisles() {
  return new Field({
    id: 'glasshouse-aisles',
    name: 'Glasshouse Aisles',
    brief:
      'Glass partitions make long aisles of the glasshouse, each open at the opposite end from the last. Pods line every aisle. The walk to the far aisles is long: grow the squad on the near ones before you go deep.',
    theme: 'terrarium',
    look: 'glass',
    width: 84,
    depth: 72,
    dayLength: 300,
    seed: 1508,
    squad: { stone: 4, ember: 4 },
    kiln: { x: -36, z: 28 },
  })
    .hline(14, -42, 30)
    .hline(-2, -30, 42)
    .hline(-18, -42, 30)
    .pod(-30, 4)
    .pod(-10, 6)
    .pod(14, 4)
    .pod(34, 6)
    .pod(-30, -10)
    .pod(0, -10)
    .pod(30, -10)
    .pod(-20, -28)
    .pod(10, -28)
    .pod(36, -28)
    .beast('hedgehog', 20, -28)
    .done(PACE['glasshouse-aisles']);
}

/** A garden where Burrow Grubs swim through the beds and pods hide in the mounds. */
function grubGarden() {
  return new Field({
    id: 'grub-garden',
    name: 'Grub Garden',
    brief:
      'A kitchen garden full of mounds, and Burrow Grubs swimming under the beds. A grub carried home is worth a crowd of Sproutlings, if you can catch it above ground. Dig the mounds while you wait for them to surface.',
    theme: 'meadow',
    look: 'hedge',
    width: 84,
    depth: 68,
    dayLength: 300,
    seed: 1509,
    squad: { stone: 6, ember: 6 },
    kiln: { x: -36, z: 0 },
  })
    .vline(-8, -34, -6)
    .vline(-8, 6, 34)
    .vline(18, -20, 20, [[-4, 4]])
    .beast('grub', 4, -20)
    .beast('grub', 4, 20)
    .beast('grub', 30, 0)
    .mound(-20, -18)
    .mound(-20, 18)
    .mound(6, 0)
    .mound(30, -24)
    .mound(30, 24)
    .pod(-24, 0)
    .done(PACE['grub-garden']);
}

/** An orchard ring round the Kiln, pods under trees, beasts in the outer ring. */
function orchardRing() {
  return new Field({
    id: 'orchard-ring',
    name: 'Orchard Ring',
    brief:
      'The Kiln stands in a clearing ringed by an orchard wall with four gaps. Pods lie under the inner trees; beasts graze the outer ring, worth more but further and fiercer. Grow on the inner ring, then go out.',
    theme: 'autumn',
    look: 'hedge',
    width: 84,
    depth: 84,
    dayLength: 320,
    seed: 1510,
    squad: { ember: 6, stone: 6 },
    kiln: { x: 0, z: 0 },
  })
    .pen([-20, -20, 20, 20], { n: [[-3, 3]], s: [[-3, 3]], e: [[-3, 3]], w: [[-3, 3]] })
    .rock(-12, -12, 3, 'root')
    .rock(12, 12, 3, 'root')
    .pod(-12, 6)
    .pod(12, -6)
    .pod(6, 12)
    .pod(-6, -12)
    .beast('mossback', -32, -32)
    .beast('mossback', 32, 32)
    .beast('skitter', 32, -32)
    .beast('skitter', -32, 32)
    .pod(0, -34)
    .pod(34, 0)
    .done(PACE['orchard-ring']);
}

/** A rainy allotment: dewdrops fall over the pod beds on a beat. */
function rainyAllotment() {
  return new Field({
    id: 'rainy-allotment',
    name: 'Rainy Allotment',
    brief:
      'Rain drips through the allotment’s leaky cold frames, right over the pod beds, and each drop stuns whatever it lands on. Time the crews between drops and keep the squad clear of the frames when they are not working.',
    theme: 'marsh',
    look: 'fence',
    width: 84,
    depth: 64,
    dayLength: 300,
    seed: 1511,
    squad: { ember: 6, dew: 4 },
    kiln: { x: -36, z: 0 },
  })
    .pen([-18, -26, 2, -10], { s: [[-12, -6]] })
    .pen([12, -26, 32, -10], { s: [[18, 24]] })
    .pen([-18, 10, 2, 26], { n: [[-12, -6]] })
    .pen([12, 10, 32, 26], { n: [[18, 24]] })
    .drip(-8, -18, 4, 0)
    .drip(22, -18, 4, 1)
    .drip(-8, 18, 4, 2)
    .drip(22, 18, 4, 3)
    .pod(-12, -20)
    .pod(-4, -16)
    .pod(18, -20)
    .pod(26, -16)
    .pod(-12, 20)
    .pod(-4, 16)
    .pod(18, 20)
    .pod(26, 16)
    .pod(8, 0)
    .done(PACE['rainy-allotment']);
}

/** The harvest festival: every kind of growing at once, in four corners round the green. */
function harvestFestival() {
  return new Field({
    id: 'harvest-festival',
    name: 'Harvest Festival',
    brief:
      'The harvest festival fills four corners round the village green: a pod market, a mound field, a beast pen and a lake of pod islands. Everything here grows the squad; the trick is keeping every corner working at once.',
    theme: 'meadow',
    look: 'fence',
    width: 100,
    depth: 88,
    dayLength: 340,
    seed: 1512,
    squad: { ember: 6, stone: 4, dew: 2 },
    kiln: { x: 0, z: 0 },
  })
    .hline(-14, -48, -14, [[-30, -24]])
    .hline(-14, 14, 48, [[24, 30]])
    .hline(14, -48, -14, [[-30, -24]])
    .hline(14, 14, 48, [[24, 30]])
    .vline(-14, -42, -14, [[-28, -22]])
    .vline(14, -42, -14, [[-28, -22]])
    .vline(-14, 14, 42, [[22, 28]])
    .vline(14, 14, 42, [[22, 28]])
    .pod(-30, -30)
    .pod(-24, -36)
    .pod(-36, -24)
    .mound(30, -30)
    .mound(24, -36)
    .mound(36, -24)
    .beast('mossback', -30, 30)
    .beast('slug', -24, 36)
    .water([22, 22, 30, 30])
    .pod(26, 34, 'dew')
    .pod(34, 26)
    .pod(0, -30)
    .pod(0, 30)
    .done(PACE['harvest-festival']);
}

export const GROWING_FIELDS = challengeFields('growing', [
  raisedBeds(),
  moundMeadow(),
  podIslands(),
  kindGarden(),
  beastCountry(),
  farNursery(),
  seedBelt(),
  glasshouseAisles(),
  grubGarden(),
  orchardRing(),
  rainyAllotment(),
  harvestFestival(),
]);
