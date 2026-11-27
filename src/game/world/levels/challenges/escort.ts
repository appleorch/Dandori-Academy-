import { byPace, enlarge, Field } from './build';
import { challengeFields } from './field';

/**
 * Escort fields, each written by hand around the road home. One relic, a crawling Lodestone,
 * must come home; it creeps away from anyone too few to lift it, beasts wait along the way and
 * more arrive as the day goes on. Every field offers a different road, and a different trouble on
 * it: a stream to bridge, steps to come down, belts, beacons, gates, chasms, a maze.
 */

/** Measured by the test player (`npm run paces`): its finishing time, which is Platinum. */
const PACE: Record<string, number> = {
  'garden-gate': 81,
  'the-footbridge': 139,
  'flowerpot-steps': 99,
  'belt-run': 67,
  'two-paths': 128,
  'the-crossroads': 147,
  'lantern-way': 64,
  'moat-crossing': 109,
  'spitter-gauntlet': 107,
  'burrow-road': 139,
  'hedge-labyrinth': 65,
  'the-long-haul': 207,
};

/** A walled yard with the relic behind a bramble gate, ambushes through the side gaps. */
function gardenGate() {
  return new Field({
    id: 'garden-gate',
    name: 'Garden Gate',
    brief:
      'The relic waits in the back yard, behind a bramble gate. Break the gate, lift the Lodestone, and bring it through the front yard while beasts slip in through the gaps in the side walls, two waves of them.',
    theme: 'meadow',
    look: 'brick',
    width: 84,
    depth: 52,
    dayLength: 200,
    seed: 1601,
    squad: { ember: 6, stone: 6 },
    kiln: { x: -36, z: 0 },
  })
    .vline(10, -26, 26, [[-3, 3]])
    .gate([9, -3, 11, 3], 80)
    .hline(-14, -20, 10, [[-8, -2]])
    .hline(14, -20, 10, [[-4, 2]])
    .shard(30, 0, 8, { variant: 'lodestone' })
    .beast('skitter', 26, -16)
    .ambush('skitter', -4, -22, 24)
    .ambush('mossback', 0, 22, 48)
    .done(PACE['garden-gate']);
}

/** The relic across a stream: three logs for the footbridge, or Dewlings to carry it over. */
function theFootbridge() {
  return new Field({
    id: 'the-footbridge',
    name: 'The Footbridge',
    brief:
      'The relic lies across the stream, and the footbridge is only a site waiting for three logs. Build it while the first beasts gather on the near bank. Nothing heavy crosses the water: the Lodestone comes home over the bridge or not at all.',
    theme: 'marsh',
    look: 'root',
    width: 88,
    depth: 56,
    dayLength: 220,
    seed: 1602,
    squad: { ember: 6, stone: 6, dew: 3 },
    kiln: { x: -38, z: 0 },
  })
    .water([4, -28, 10, -4])
    .water([4, 4, 10, 28])
    .bridge([4, -4, 10, 4], { x: 1, z: 0 }, [
      { x: -14, z: -16 },
      { x: -20, z: 12 },
      { x: -6, z: 20 },
    ])
    .shard(30, 6, 8, { variant: 'lodestone' })
    .beast('slug', 24, -14)
    .ambush('skitter', -10, -22, 21)
    .ambush('skitter', -14, 22, 42)
    .ambush('spitter', -24, -20, 66)
    .done(PACE['the-footbridge']);
}

/** The relic on the top of three flowerpot steps: down the ramps, or the drops. */
function flowerpotSteps() {
  return new Field({
    id: 'flowerpot-steps',
    name: 'Flowerpot Steps',
    brief:
      'The relic sits on the top of three great flowerpot steps. Each step has a ramp at one end and a drop at the other: the drops are quicker, and a Lodestone carried off one keeps its crew. Beasts climb the ramps behind you.',
    theme: 'meadow',
    look: 'flowerpot',
    width: 76,
    depth: 76,
    dayLength: 240,
    seed: 1603,
    squad: { stone: 8, ember: 4 },
    kiln: { x: 0, z: 32 },
  })
    .terrace([-34, -36, 34, 10], 2, [
      { side: 's', from: 22, to: 28, kind: 'ramp' },
      { side: 's', from: -10, to: -4, kind: 'ledge' },
    ])
    .terrace(
      [-28, -36, 28, -6],
      4,
      [
        { side: 's', from: -24, to: -18, kind: 'ramp', length: 5 },
        { side: 's', from: 4, to: 10, kind: 'ledge' },
      ],
      2,
    )
    .terrace(
      [-20, -36, 20, -20],
      6,
      [
        { side: 's', from: 12, to: 18, kind: 'ramp', length: 5 },
        { side: 's', from: -8, to: -2, kind: 'ledge' },
      ],
      4,
    )
    .shard(-4, -28, 8, { variant: 'lodestone' })
    .beast('skitter', 20, -12)
    .ambush('skitter', 28, 0, 27)
    .ambush('mossback', -28, 20, 54)
    .ambush('skitter', 28, 24, 78)
    .done(PACE['flowerpot-steps']);
}

/** A scullery belt that carries the relic most of the way, if it is set on it. */
function beltRun() {
  return new Field({
    id: 'belt-run',
    name: 'Belt Run',
    brief:
      'A long scullery belt runs from the far end of the room towards the Kiln. Set the Lodestone on it and it rides most of the way home by itself, crew and all; take it the long way round the counters and it is a slow walk. Beasts come up the side aisles.',
    theme: 'terrarium',
    look: 'tile',
    width: 96,
    depth: 52,
    dayLength: 220,
    seed: 1604,
    squad: { ember: 6, spark: 6 },
    kiln: { x: -42, z: 0 },
  })
    .conveyor([-30, -3, 34, 3], -1, 0)
    .hline(-9, -26, 40, [
      [-4, 2],
      [22, 28],
    ])
    .hline(9, -26, 40, [
      [6, 12],
      [30, 36],
    ])
    .shard(40, 0, 9, { variant: 'lodestone' })
    .beast('hedgehog', 20, -18)
    .ambush('skitter', 0, -20, 18)
    .ambush('hedgehog', 10, 20, 36)
    .ambush('skitter', -20, -20, 57)
    .done(PACE['belt-run']);
}

/** Two roads home: the short one is where the ambushes come in. */
function twoPaths() {
  return new Field({
    id: 'two-paths',
    name: 'Two Paths',
    brief:
      'A long wall splits the field into two roads. The south road is short and open, and it is where the beasts arrive; the north road winds round a pond and is quiet. Which way the Lodestone goes is up to you, and it can change halfway.',
    theme: 'autumn',
    look: 'ruin',
    width: 100,
    depth: 56,
    dayLength: 240,
    seed: 1605,
    squad: { stone: 8, ember: 6 },
    kiln: { x: -44, z: 0 },
  })
    .hline(0, -30, 34, [[-6, 0]])
    .water([-12, -22, 4, -10])
    .rock(16, -16, 4)
    .shard(42, 0, 9, { variant: 'lodestone' })
    .beast('mossback', 24, 14)
    .ambush('skitter', 0, 20, 18)
    .ambush('ramhorn', 14, 22, 42)
    .ambush('skitter', -16, 18, 66)
    .done(PACE['two-paths']);
}

/** The relic beyond a crossroads where beasts come in from every arm. */
function theCrossroads() {
  return new Field({
    id: 'the-crossroads',
    name: 'The Crossroads',
    brief:
      'Four hedged arms meet at a crossroads between the Kiln and the relic. Beasts come in down the side arms in turn, so the crossing is the dangerous part: clear it, then carry, and keep a guard on the arm the next wave will come from.',
    theme: 'meadow',
    look: 'hedge',
    width: 84,
    depth: 84,
    dayLength: 240,
    seed: 1606,
    squad: { ember: 8, stone: 6 },
    kiln: { x: -36, z: 36 },
  })
    .pen([-30, -30, -8, -8], {})
    .pen([8, -30, 30, -8], {})
    .pen([-30, 8, -8, 30], {})
    .pen([8, 8, 30, 30], {})
    .shard(34, -34, 9, { variant: 'lodestone' })
    .beast('skitter', 0, -24)
    .ambush('skitter', 0, -38, 21)
    .ambush('mossback', 38, 0, 42)
    .ambush('skitter', -38, 0, 63)
    .ambush('spitter', 0, 38, 84)
    .done(PACE['the-crossroads']);
}

/** A dark way lined with cold beacons: a lit beacon is home too. */
function lanternWay() {
  return new Field({
    id: 'lantern-way',
    name: 'Lantern Way',
    brief:
      'A long dark way runs from the Kiln to the relic, lined with cold beacons. A lit beacon is a place to bring things home to, the Lodestone too: light the way as you go, and the relic need not come all the way back. Something lives in the dark.',
    theme: 'dusk',
    look: 'brick',
    width: 120,
    depth: 44,
    dayLength: 260,
    seed: 1607,
    squad: { ember: 8, stone: 4 },
    kiln: { x: -54, z: 0 },
  })
    .hline(-8, -40, 50, [
      [-22, -16],
      [10, 16],
      [36, 42],
    ])
    .hline(8, -40, 50, [
      [-8, -2],
      [24, 30],
    ])
    .beacon(-30, 0)
    .beacon(-4, 0)
    .beacon(18, 0)
    .shard(52, 0, 9, { variant: 'lodestone' })
    .beast('moth', 20, 0)
    .ambush('skitter', 10, -16, 24)
    .ambush('moth', 30, 16, 48)
    .ambush('skitter', -10, 16, 72)
    .done(PACE['lantern-way']);
}

/** The relic in a moated keep: a bridge to build and a crystal door to crack. */
function moatCrossing() {
  return new Field({
    id: 'moat-crossing',
    name: 'Moat Crossing',
    brief:
      'The relic is kept in a little moated keep. One bridge site crosses the moat and waits for two logs; behind it, a crystal door only Stonelings crack quickly. Get both open before the Lodestone can leave, while beasts circle the moat.',
    theme: 'autumn',
    look: 'brick',
    width: 88,
    depth: 72,
    dayLength: 260,
    seed: 1608,
    squad: { stone: 8, ember: 6 },
    kiln: { x: -38, z: 28 },
  })
    .water([8, -24, 36, -20])
    .water([8, 20, 36, 24])
    .water([32, -20, 36, 20])
    .water([8, -20, 12, -3])
    .water([8, 3, 12, 20])
    .bridge([8, -3, 12, 3], { x: 5, z: 0 }, [
      { x: -10, z: -10 },
      { x: -16, z: 10 },
    ])
    .pen([14, -16, 30, 16], { w: [[-3, 3]] })
    .gate([13, -3, 15, 3], 90, 'crystal')
    .shard(24, 0, 8, { variant: 'lodestone' })
    .beast('mossback', 0, -28)
    .ambush('skitter', 0, 30, 24)
    .ambush('spitter', -20, -26, 51)
    .ambush('skitter', 40, -30, 78)
    .done(PACE['moat-crossing']);
}

/** A road under a ridge of terraces where Spitters stand. */
function spitterGauntlet() {
  return new Field({
    id: 'spitter-gauntlet',
    name: 'Spitter Gauntlet',
    brief:
      'The road home runs under a ridge of terraces, and Bogspitters stand on them. Carry the Lodestone through and the crew takes spit all the way; climb the ramps and clear them first, and the road is quiet, if slower. More spitters come later.',
    theme: 'autumn',
    look: 'cliff',
    width: 100,
    depth: 64,
    dayLength: 260,
    seed: 1609,
    squad: { stone: 8, ember: 8 },
    items: { emberbrew: 1, stillwater: 1 },
    kiln: { x: -44, z: 20 },
  })
    .terrace([-24, -30, -4, -12], 3, [{ side: 's', from: -20, to: -14, kind: 'ramp' }])
    .terrace([6, -30, 26, -12], 3, [{ side: 's', from: 16, to: 22, kind: 'ramp' }])
    .beast('spitter', -14, -20)
    .beast('spitter', 16, -20)
    .shard(42, 14, 9, { variant: 'lodestone' })
    .rock(0, 12, 4)
    .ambush('spitter', 36, -24, 36)
    .ambush('skitter', -10, 28, 60)
    .done(PACE['spitter-gauntlet']);
}

/** A road over soft ground where Burrow Grubs swim, with mounds to dig on the way. */
function burrowRoad() {
  return new Field({
    id: 'burrow-road',
    name: 'Burrow Road',
    brief:
      'The road home crosses soft ground where Burrow Grubs swim under the soil. They surface under anything slow, and nothing is slower than a crew with a Lodestone. Keep a guard walking beside the relic, and strike the moment a grub comes up.',
    theme: 'meadow',
    look: 'root',
    width: 96,
    depth: 56,
    dayLength: 260,
    seed: 1610,
    squad: { stone: 8, ember: 8 },
    kiln: { x: -42, z: 0 },
  })
    .rock(-14, -12, 4, 'root')
    .rock(4, 14, 4, 'root')
    .rock(22, -10, 4, 'root')
    .beast('grub', -4, 0)
    .beast('grub', 20, 8)
    .mound(-24, 18)
    .mound(10, -20)
    .shard(40, 0, 9, { variant: 'lodestone' })
    .ambush('grub', 0, -20, 30)
    .ambush('skitter', -20, 22, 60)
    .done(PACE['burrow-road']);
}

/** A hedge labyrinth with the relic at its heart and ambushes at its junctions. */
function hedgeLabyrinth() {
  return new Field({
    id: 'hedge-labyrinth',
    name: 'Hedge Labyrinth',
    brief:
      'The relic lies at the heart of a hedge labyrinth with more than one way out. A Lodestone is too heavy to carry round every corner: find the shortest road before you lift it. Beasts appear at the junctions as the day goes on.',
    theme: 'autumn',
    look: 'hedge',
    width: 84,
    depth: 84,
    dayLength: 280,
    seed: 1611,
    squad: { ember: 8, stone: 8 },
    kiln: { x: -36, z: 36 },
  })
    .pen([-28, -28, 28, 28], { w: [[14, 20]], n: [[-4, 2]], e: [[-20, -14]] })
    .pen([-14, -14, 14, 14], { s: [[-10, -4]], e: [[4, 10]] })
    .hline(0, -28, -14, [[-24, -18]])
    .vline(0, 14, 28, [[18, 24]])
    .vline(0, -28, -14, [[-24, -18]])
    .shard(0, 0, 8, { variant: 'lodestone' })
    .beast('skitter', 20, 20)
    .ambush('skitter', -20, -20, 27)
    .ambush('mossback', 22, -22, 54)
    .ambush('skitter', -22, 22, 81)
    .done(PACE['hedge-labyrinth']);
}

/** The longest road: a heavy relic, a loop of a field and wave after wave. */
function theLongHaul() {
  return new Field({
    id: 'the-long-haul',
    name: 'The Long Haul',
    brief:
      'The heaviest Lodestone of all, at the far corner of a big field, and a long loop of a road home round a central copse, either way. Wave after wave of beasts comes in from the edges. You start with sprays: keep enough on the relic, enough on guard, and never stop moving.',
    theme: 'dusk',
    look: 'ruin',
    width: 112,
    depth: 84,
    dayLength: 320,
    seed: 1612,
    squad: { stone: 9, ember: 8, spark: 3 },
    items: { emberbrew: 2, stillwater: 1 },
    kiln: { x: -48, z: 34 },
  })
    .pen([-24, -20, 24, 20], { w: [[-3, 3]], e: [[-3, 3]] })
    .rock(-10, 0, 5)
    .rock(10, 0, 5)
    .shard(48, -34, 11, { variant: 'lodestone' })
    .beast('mossback', 36, -20)
    .ambush('skitter', 0, -36, 24)
    .ambush('mossback', 48, 20, 48)
    .ambush('skitter', 0, 36, 72)
    .ambush('ramhorn', -40, -30, 96)
    .done(PACE['the-long-haul']);
}

/** How much bigger each Escort field is played than it is written: its roads are long. */
const ROAD = 1.5;

export const ESCORT_FIELDS = challengeFields(
  'escort',
  byPace(
    [
      gardenGate(),
      theFootbridge(),
      flowerpotSteps(),
      beltRun(),
      twoPaths(),
      theCrossroads(),
      lanternWay(),
      moatCrossing(),
      spitterGauntlet(),
      burrowRoad(),
      hedgeLabyrinth(),
      theLongHaul(),
    ].map((spec) => enlarge({ ...spec, dayLength: Math.round(spec.dayLength * 1.6) }, ROAD)),
  ),
);
