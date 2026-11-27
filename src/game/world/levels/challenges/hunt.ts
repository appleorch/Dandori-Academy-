import { byPace, Field } from './build';
import { challengeFields } from './field';

/**
 * Treasure Hunt fields, each written by hand around its own idea. The day ends with the last
 * Sunshard; treasure, survivors and time all score, so every field is a route to plan: where to
 * go first, what to send ahead, which shortcut is worth its price.
 */

/** Measured by the test player (`npm run paces`): its finishing time, which is Platinum. */
const PACE: Record<string, number> = {
  'picnic-blanket': 162,
  'the-sundial': 99,
  'stepping-stones': 271,
  'the-reading-room': 512,
  'flowerpot-terraces': 238,
  'the-scullery': 150,
  'hedge-maze': 248,
  'drip-grotto': 164,
  'island-keep': 298,
  'the-spiral': 344,
  'night-market': 119,
  'clock-face': 296,
};

/** A picnic blanket's tiled cross splits the lawn in four, each quarter open at a different place. */
function picnicBlanket() {
  return new Field({
    id: 'picnic-blanket',
    name: 'Picnic Blanket',
    brief:
      'A giant picnic blanket lies across the lawn, its raised seams splitting it into four quarters, each open to the next at a different place. Sixteen little shards are strewn about. Walk the Warden through the middle and throw as you pass: nobody should stand idle. One of the shards in the far quarter is a Mimic.',
    theme: 'meadow',
    look: 'tile',
    width: 72,
    depth: 52,
    dayLength: 300,
    seed: 1101,
    squad: { ember: 8, spark: 6 },
    kiln: { x: -30, z: 0 },
  })
    .hline(0, -18, 34, [
      [-4, 2],
      [20, 26],
    ])
    .vline(8, -24, 24, [
      [-17, -11],
      [11, 17],
    ])
    .rock(-8, -14)
    .rock(22, 14)
    .shards(
      [
        [-20, -16],
        [-12, -6],
        [-4, -20],
        [2, -10],
        [-20, 16],
        [-10, 8],
        [0, 18],
      ],
      1,
    )
    .shards(
      [
        [14, -18],
        [26, -8],
        [30, -20],
        [14, 8],
        [28, 18],
      ],
      2,
    )
    .shards(
      [
        [-2, 6],
        [20, -4],
        [32, 6],
        [16, 20],
      ],
      3,
    )
    .beast('mimic', 26, 10)
    .bloom(30, -20, 70)
    .done(PACE['picnic-blanket']);
}

/** A sundial's gnomon walls part the garden into four wedges, twins on opposite sides. */
function theSundial() {
  return new Field({
    id: 'the-sundial',
    name: 'The Sundial',
    brief:
      'The Kiln stands at the foot of a sundial; its four long shadows wall the garden into quarters that open only at the rim. Each rune shard has its twin in the opposite quarter: bring both halves home within ten seconds of each other for half their value again. Start the far one first.',
    theme: 'autumn',
    look: 'ruin',
    width: 80,
    depth: 80,
    dayLength: 360,
    seed: 1102,
    squad: { ember: 7, stone: 7, spark: 4 },
    kiln: { x: -4, z: 4 },
  })
    .hline(0, 8, 38, [[28, 34]])
    .hline(0, -38, -10, [[-34, -28]])
    .vline(0, 10, 38, [[28, 34]])
    .vline(0, -38, -8, [[-34, -28]])
    .rock(20, 20, 4)
    .rock(-20, -20, 4)
    .rock(20, -22, 4)
    .rock(-22, 20, 4)
    .shard(28, -26, 3, { twin: 'a' })
    .shard(-28, 26, 3, { twin: 'a' })
    .shard(-28, -14, 2, { twin: 'b' })
    .shard(28, 14, 2, { twin: 'b' })
    .shard(14, -32, 2, { twin: 'c' })
    .shard(-14, 32, 2, { twin: 'c' })
    .shards(
      [
        [12, -12],
        [-12, 12],
        [30, 30],
        [-30, -30],
        [32, -8],
        [-32, 8],
      ],
      1,
    )
    .shards(
      [
        [16, 30],
        [-16, -30],
      ],
      4,
    )
    .beast('mossback', 24, -14)
    .bloom(32, 32, 90)
    .done(PACE['the-sundial']);
}

/** A lake of islands: bridge the channels with logs, or let Dewlings wade straight across. */
function steppingStones() {
  return (
    new Field({
      id: 'stepping-stones',
      name: 'Stepping Stones',
      brief:
        'A lake of little islands between the Kiln and a far shore piled with treasure. Bridges wait for logs across the channels; Dewlings wade straight through, and the channels themselves hide shards only they can lift. Build the bridges for the heavy hoard, and send Dewlings for the rest.',
      theme: 'marsh',
      look: 'root',
      width: 88,
      depth: 60,
      dayLength: 380,
      seed: 1103,
      squad: { dew: 7, ember: 6, stone: 5 },
      kiln: { x: -36, z: 0 },
    })
      // Channels: three running north-south, two east-west between the island rows.
      .water([-24, -30, -20, -3])
      .water([-24, 3, -20, 30])
      .water([-4, -30, 0, -3])
      .water([-4, 3, 0, 30])
      .water([16, -30, 20, -3])
      .water([16, 3, 20, 30])
      .water([-20, -12, -14, -8])
      .water([-8, -12, -4, -8])
      .water([0, -12, 8, -8])
      .water([12, -12, 16, -8])
      // (dry causeways at x 8 to 12 join the side islands to the middle one)
      .water([-20, 8, -14, 12])
      .water([-10, 8, -4, 12])
      .water([0, 8, 8, 12])
      .water([12, 8, 16, 12])
      .bridge([-24, -3, -20, 3], { x: -27, z: 0 }, [
        { x: -32, z: -10 },
        { x: -32, z: 10 },
      ])
      .bridge([-4, -3, 0, 3], { x: -7, z: 0 }, [
        { x: -12, z: -4 },
        { x: -12, z: 4 },
      ])
      .bridge([16, -3, 20, 3], { x: 13, z: 0 }, [
        { x: 12, z: -4 },
        { x: 12, z: 4 },
      ])
      // Shards in the channels: Dewlings only.
      .shards(
        [
          [-22, -18],
          [-2, 20],
          [18, -22],
          [10, 10],
          [-16, 10],
        ],
        2,
      )
      .shards(
        [
          [-10, -20],
          [-12, 20],
          [8, -20],
          [6, 22],
          [28, -22],
          [30, 22],
        ],
        1,
      )
      .shards(
        [
          [30, -6],
          [34, 6],
          [28, 14],
        ],
        4,
      )
      .shard(36, -14, 5, { variant: 'lodestone' })
      .beast('mossback', 30, 0)
      .bloom(36, 22, 100)
      .done(PACE['stepping-stones'])
  );
}

/** Library aisles of books, a hidden way through the back stacks, Dewglass on the reading desk. */
function theReadingRoom() {
  return new Field({
    id: 'the-reading-room',
    name: 'The Reading Room',
    brief:
      'Aisles of giant books run the length of the reading room, open at alternate ends, so the long way round is very long. One stack at the back is not books at all but a cracked panel: break it and the aisles join up. Dewglass waits on the reading desk at the top of its steps; drop it and it cracks.',
    theme: 'dusk',
    look: 'book',
    width: 84,
    depth: 64,
    dayLength: 720,
    seed: 1104,
    squad: { ember: 6, stone: 6, spark: 6 },
    kiln: { x: -36, z: 24 },
  })
    .vline(-24, -32, 22, [])
    .vline(-8, -22, 32, [])
    .vline(8, -32, 22, [])
    .vline(24, -22, 32, [])
    .gate([-25, 10, -23, 16], 120, 'hidden')
    .gate([7, -4, 9, 2], 120, 'hidden')
    .terrace([30, -30, 40, -18], 3, [{ side: 's', from: 33, to: 37, kind: 'ramp' }])
    .shard(33, -26, 2, { variant: 'dewglass' })
    .shard(37, -24, 2, { variant: 'dewglass' })
    .shards(
      [
        [-32, -20],
        [-30, 0],
        [-16, -26],
        [-16, 10],
        [0, -10],
        [0, 26],
        [16, -26],
        [16, 8],
        [32, 10],
        [32, 26],
      ],
      2,
    )
    .shards(
      [
        [-16, -6],
        [0, 12],
        [16, -10],
      ],
      3,
    )
    .beast('skitter', 0, -20)
    .beast('skitter', 16, 20)
    .bloom(36, 0, 110)
    .done(PACE['the-reading-room']);
}

/** Three tiers of flowerpot terraces, ramps at alternate ends and drops back down as shortcuts. */
function flowerpotTerraces() {
  return new Field({
    id: 'flowerpot-terraces',
    name: 'Flowerpot Terraces',
    brief:
      'Three tiers of flowerpot terraces climb away from the Kiln, each ramp at the opposite end from the last, so the way up zigzags. The way down need not: every tier has a drop straight back towards home. Heavy shards wait on the top tier; carry them down the drops, never the ramps.',
    theme: 'meadow',
    look: 'flowerpot',
    width: 76,
    depth: 72,
    dayLength: 400,
    seed: 1105,
    squad: { stone: 8, ember: 6, dew: 4 },
    kiln: { x: 0, z: 28 },
  })
    .terrace([-34, -34, 34, 12], 2, [
      { side: 's', from: 24, to: 30, kind: 'ramp', length: 6 },
      { side: 's', from: -8, to: -2, kind: 'ledge' },
    ])
    .terrace(
      [-30, -34, 30, -4],
      4,
      [
        { side: 's', from: -26, to: -20, kind: 'ramp', length: 5 },
        { side: 's', from: 2, to: 8, kind: 'ledge' },
      ],
      2,
    )
    .terrace(
      [-24, -34, 24, -18],
      6,
      [
        { side: 's', from: 16, to: 22, kind: 'ramp', length: 5 },
        { side: 's', from: -6, to: 0, kind: 'ledge' },
      ],
      4,
    )
    .shards(
      [
        [-28, 8],
        [-14, 4],
        [12, 6],
        [28, 4],
      ],
      1,
    )
    .shards(
      [
        [-24, -10],
        [-6, -12],
        [14, -10],
        [24, -8],
      ],
      2,
    )
    .shards(
      [
        [-16, -28],
        [-2, -26],
        [12, -28],
      ],
      4,
    )
    .shard(20, -24, 6)
    .shards(
      [
        [-30, 22],
        [24, 22],
      ],
      1,
    )
    .beast('mossback', -16, -10)
    .bloom(-20, -26, 120)
    .done(PACE['flowerpot-terraces']);
}

/** A scullery floor of conveyor belts: two carry hauls homeward, one carries them away. */
function theScullery() {
  return new Field({
    id: 'the-scullery',
    name: 'The Scullery',
    brief:
      'The scullery floor is all moving belts. Two run towards the Kiln and carry any haul set on them home for nothing; the third runs the wrong way and will take a careless crew back where it came from. Tiled counters split the room. Read the belts before you throw.',
    theme: 'terrarium',
    look: 'tile',
    width: 80,
    depth: 56,
    dayLength: 360,
    seed: 1106,
    squad: { spark: 8, ember: 6, stone: 4 },
    kiln: { x: -34, z: 0 },
  })
    .conveyor([-24, -22, 30, -16], -1, 0)
    .conveyor([-24, 16, 30, 22], -1, 0)
    .conveyor([-4, -6, 24, 0], 1, 0)
    .hline(-11, -20, 34, [
      [-6, 0],
      [14, 20],
    ])
    .hline(9, -20, 34, [
      [2, 8],
      [22, 28],
    ])
    .rock(36, -4, 3, 'tile')
    .shards(
      [
        [32, -19],
        [24, 19],
        [34, 19],
        [12, -19],
      ],
      2,
    )
    .shards(
      [
        [28, 4],
        [18, 4],
      ],
      3,
    )
    .shards(
      [
        [-14, -2],
        [0, 4],
        [16, 4],
        [30, 4],
        [-8, -26],
        [10, -26],
        [-8, 26],
        [10, 26],
      ],
      1,
    )
    .shards(
      [
        [36, -26],
        [36, 26],
      ],
      4,
    )
    .beast('hedgehog', 26, -26)
    .bloom(34, 4, 80)
    .done(PACE['the-scullery']);
}

/** A hedge maze with more than one way to its heart, where a Lodestone sits; a beacon halfway. */
function hedgeMaze() {
  return new Field({
    id: 'hedge-maze',
    name: 'Hedge Maze',
    brief:
      'A hedge maze with the Kiln at one corner and a crawling Lodestone at its heart. There is more than one way in, and none of them is short. A cold beacon halfway through lights a second place to bring things home to. The Lodestone creeps away from anyone too few to lift it: send enough, all at once.',
    theme: 'meadow',
    look: 'hedge',
    width: 80,
    depth: 80,
    dayLength: 420,
    seed: 1107,
    squad: { stone: 8, ember: 8, spark: 4 },
    kiln: { x: -32, z: 32 },
  })
    .pen([-30, -30, 30, 30], { n: [[-4, 2]], e: [[16, 22]], w: [[-22, -16]], s: [[8, 14]] })
    .pen([-18, -18, 18, 18], { n: [[10, 16]], s: [[-14, -8]], e: [[-6, 0]] })
    .pen([-8, -8, 8, 8], { w: [[-3, 3]], e: [[-3, 3]] })
    .hline(-24, -30, -6)
    .hline(24, 6, 30)
    .vline(-24, -6, 30, [[10, 16]])
    .vline(24, -30, 6, [[-16, -10]])
    .shard(0, 0, 5, { variant: 'lodestone' })
    .shards(
      [
        [-36, -36],
        [36, -36],
        [36, 36],
        [-36, 0],
        [0, -36],
      ],
      2,
    )
    .shards(
      [
        [-26, -10],
        [26, 10],
        [-12, 26],
        [12, -26],
        [-20, 20],
        [20, -20],
      ],
      1,
    )
    .shards(
      [
        [-12, -12],
        [12, 12],
        [12, -12],
      ],
      3,
    )
    .beacon(-12, 12)
    .beast('mossback', 26, -26)
    .beast('skitter', -26, -26)
    .bloom(36, -36, 120)
    .done(PACE['hedge-maze']);
}

/** A dark grotto of rooms and tunnels where dewdrops fall; beacons light the way home. */
function dripGrotto() {
  return (
    new Field({
      id: 'drip-grotto',
      name: 'Drip Grotto',
      brief:
        'A grotto of rooms and low tunnels under the garden, dark but for cold beacons: light them and hauls go to the nearest. Dewdrops fall in the tunnels on a steady beat; time the crews through between drops. The richest room is the farthest.',
      theme: 'cave',
      look: 'rock',
      width: 84,
      depth: 60,
      dayLength: 420,
      seed: 1108,
      squad: { dew: 6, ember: 6, stone: 6 },
      kiln: { x: -34, z: 0 },
    })
      // Rock between the rooms; the tunnels are the gaps.
      .hline(-12, -42, 42, [
        [-30, -24],
        [-6, 0],
        [20, 26],
      ])
      .hline(12, -42, 42, [
        [-18, -12],
        [6, 12],
        [30, 36],
      ])
      .vline(-18, -12, 12, [[-3, 3]])
      .vline(6, -30, -12, [[-24, -18]])
      .vline(6, 12, 30, [[18, 24]])
      .vline(24, -12, 12, [[-3, 3]])
      .drip(-3, -12, 4, 0)
      .drip(9, 12, 4, 2)
      .drip(24, 0, 4, 1)
      .beacon(-4, -22)
      .beacon(14, 22)
      .beacon(34, 0)
      .shards(
        [
          [-30, -22],
          [-12, -24],
          [16, -24],
          [34, -24],
          [-30, 22],
          [-6, 24],
          [24, 24],
        ],
        2,
      )
      .shards(
        [
          [-8, 0],
          [14, 0],
          [30, -6],
          [36, 6],
        ],
        3,
      )
      .shard(36, -2, 5)
      .beast('grub', 30, -22)
      .beast('skitter', -4, 22)
      .bloom(36, 24, 130)
      .done(PACE['drip-grotto'])
  );
}

/** A keep on an island: four bridges in, each needing logs, the hoard inside behind brambles. */
function islandKeep() {
  return (
    new Field({
      id: 'island-keep',
      name: 'Island Keep',
      brief:
        'A moated keep in the middle of the field, with four bridge sites in from the four sides and logs scattered on the banks. One bridge is enough to get in; more make every trip shorter. Inside, the hoard sits behind bramble gates, and the banks outside have plenty of their own.',
      theme: 'autumn',
      look: 'brick',
      width: 84,
      depth: 84,
      dayLength: 440,
      seed: 1109,
      squad: { ember: 8, stone: 7, dew: 5 },
      kiln: { x: -34, z: 34 },
    })
      // The moat, broken only where the bridge sites are.
      .water([-22, -22, -3, -18])
      .water([3, -22, 22, -18])
      .water([-22, 18, -3, 22])
      .water([3, 18, 22, 22])
      .water([-22, -18, -18, -3])
      .water([-22, 3, -18, 18])
      .water([18, -18, 22, -3])
      .water([18, 3, 22, 18])
      .bridge([-3, -22, 3, -18], { x: 0, z: -25 }, [
        { x: -10, z: -32 },
        { x: 10, z: -32 },
      ])
      .bridge([-3, 18, 3, 22], { x: 0, z: 25 }, [
        { x: -10, z: 32 },
        { x: 10, z: 32 },
      ])
      .bridge([-22, -3, -18, 3], { x: -25, z: 0 }, [
        { x: -32, z: -10 },
        { x: -32, z: 10 },
      ])
      .bridge([18, -3, 22, 3], { x: 25, z: 0 }, [
        { x: 32, z: -10 },
        { x: 32, z: 10 },
      ])
      // The keep's walls, with a gate on each face.
      .pen([-14, -14, 14, 14], { n: [[-3, 3]], s: [[-3, 3]], w: [[-3, 3]], e: [[-3, 3]] })
      .gate([-3, -15, 3, -13], 120)
      .gate([-3, 13, 3, 15], 120)
      .gate([-15, -3, -13, 3], 120)
      .gate([13, -3, 15, 3], 120)
      .shards(
        [
          [-6, -6],
          [6, 6],
          [-6, 6],
          [6, -6],
        ],
        4,
      )
      .shard(0, 0, 6)
      .shards(
        [
          [-36, -36],
          [36, -36],
          [36, 36],
          [-30, 0],
          [30, -30],
          [0, 36],
          [0, -36],
          [36, 0],
        ],
        2,
      )
      .shards(
        [
          [-12, -32],
          [12, 32],
          [-32, 12],
          [32, -12],
        ],
        1,
      )
      .beast('ramhorn', 32, 32)
      .beast('mossback', -32, -32)
      .bloom(0, 4, 140)
      .done(PACE['island-keep'])
  );
}

/** A spiral hedge round to a hoard at its centre, with two bramble gates that cut across it. */
function theSpiral() {
  return (
    new Field({
      id: 'the-spiral',
      name: 'The Spiral',
      brief:
        'A hedge spiral winds three times round the hoard at its centre. Walk it and the hoard is a long way off; break the two bramble gates that cut straight across the rings and it is a short one, once the brambles are down. Shards line the whole way round.',
      theme: 'autumn',
      look: 'hedge',
      width: 80,
      depth: 80,
      dayLength: 500,
      seed: 1110,
      squad: { ember: 9, stone: 9, spark: 4 },
      kiln: { x: -34, z: 34 },
    })
      // Ring 1 (outer), open in the south-west.
      .hline(-30, -30, 30)
      .vline(30, -30, 30)
      .hline(30, -22, 30)
      .vline(-30, -30, 22)
      // Ring 2, open in the north-east.
      .hline(-20, -20, 14)
      .vline(-20, -20, 20)
      .hline(20, -20, 20)
      .vline(20, -12, 20)
      // Ring 3 (inner), open in the south-west.
      .hline(-10, -10, 10)
      .vline(10, -10, 10)
      .hline(10, -4, 10)
      .vline(-10, -10, 4)
      // The shortcuts: brambles across the rings on the west.
      .gate([-31, -4, -29, 2], 140)
      .gate([-21, -4, -19, 2], 140)
      .gate([-11, -2, -9, 2], 100)
      .shards(
        [
          [0, 0],
          [-4, 4],
          [4, -4],
        ],
        4,
      )
      .shard(4, 4, 6)
      .shards(
        [
          [0, -25],
          [25, 0],
          [0, 25],
          [-25, -20],
          [25, -25],
          [-25, 25],
        ],
        1,
      )
      .shards(
        [
          [0, -15],
          [15, 0],
          [0, 15],
          [-15, -15],
          [15, 15],
        ],
        2,
      )
      .beast('mossback', 15, -15)
      .beast('spitter', -25, 0)
      .bloom(25, 25, 120)
      .done(PACE['the-spiral'])
  );
}

/** A night market of fenced stalls, Glowcaps sprouting stall by stall through the day. */
function nightMarket() {
  return new Field({
    id: 'night-market',
    name: 'Night Market',
    brief:
      'A night market of fenced stalls. All day long Glowcaps sprout in one stall after another, and wilt if nobody lifts them in time: they are worth points but never a medal, so each one is a choice. The Sunshards are spread over every stall, the heaviest at the far end of the market.',
    theme: 'dusk',
    look: 'fence',
    width: 84,
    depth: 64,
    dayLength: 400,
    seed: 1111,
    squad: { ember: 7, spark: 7, stone: 6 },
    kiln: { x: -36, z: 0 },
  })
    .pen([-24, -28, -4, -8], { s: [[-16, -10]], e: [[-22, -16]] })
    .pen([2, -28, 22, -8], { s: [[10, 16]], w: [[-22, -16]] })
    .pen([28, -28, 40, -8], { s: [[31, 37]] })
    .pen([-24, 8, -4, 28], { n: [[-16, -10]], e: [[16, 22]] })
    .pen([2, 8, 22, 28], { n: [[10, 16]], w: [[16, 22]] })
    .pen([28, 8, 40, 28], { n: [[31, 37]] })
    .shards(
      [
        [-18, -20],
        [-10, -14],
        [8, -20],
        [16, -14],
        [-18, 20],
        [-10, 14],
        [8, 20],
        [16, 14],
      ],
      2,
    )
    .shards(
      [
        [34, -20],
        [34, 20],
      ],
      5,
    )
    .shards(
      [
        [-14, 0],
        [6, 0],
        [24, -2],
        [36, 2],
      ],
      1,
    )
    .bloom(-14, -18, 40)
    .bloom(12, 18, 90)
    .bloom(34, -14, 140)
    .bloom(-14, 22, 190)
    .bloom(34, 16, 240)
    .beast('moth', 12, -18)
    .beast('moth', -14, 18)
    .done(PACE['night-market']);
}

/** A clock face: the Kiln at the hub, twelve hour-alcoves round a ring road, crystal spokes. */
function clockFace() {
  return (
    new Field({
      id: 'clock-face',
      name: 'Clock Face',
      brief:
        'The garden is laid out as a clock face: the Kiln at the hub, a ring road round it, and twelve hour-alcoves off the ring, each with its treasure. Crystal doors in the inner wall make spokes straight to the hub, but only Stonelings crack them quickly. Plan a lap of the hours, not a walk to each.',
      theme: 'terrarium',
      look: 'gear',
      width: 96,
      depth: 96,
      dayLength: 480,
      seed: 1112,
      squad: { stone: 9, ember: 7, spark: 6 },
      kiln: { x: -4, z: 0 },
    })
      // The inner wall round the hub, with a gap south and three crystal doors.
      .pen([-14, -14, 14, 14], { s: [[-3, 3]], n: [[-3, 3]], e: [[-3, 3]], w: [[-3, 3]] })
      .gate([-3, -15, 3, -13], 100, 'crystal')
      .gate([13, -3, 15, 3], 100, 'crystal')
      .gate([-15, -3, -13, 3], 100, 'crystal')
      // The outer wall of the ring road, its alcoves between short spokes.
      .pen([-30, -30, 30, 30], {
        n: [
          [-24, -18],
          [-3, 3],
          [18, 24],
        ],
        s: [
          [-24, -18],
          [-3, 3],
          [18, 24],
        ],
        w: [
          [-24, -18],
          [-3, 3],
          [18, 24],
        ],
        e: [
          [-24, -18],
          [-3, 3],
          [18, 24],
        ],
      })
      .vline(-12, -46, -30)
      .vline(12, -46, -30)
      .vline(-12, 30, 46)
      .vline(12, 30, 46)
      .hline(-12, -46, -30)
      .hline(12, -46, -30)
      .hline(-12, 30, 46)
      .hline(12, 30, 46)
      .shards(
        [
          [0, -40],
          [0, 40],
          [-40, 0],
          [40, 0],
        ],
        4,
      )
      .shards(
        [
          [-24, -40],
          [24, -40],
          [-24, 40],
          [24, 40],
          [-40, -24],
          [-40, 24],
          [40, -24],
          [40, 24],
        ],
        2,
      )
      .shards(
        [
          [-38, -38],
          [38, -38],
          [-38, 38],
          [38, 38],
        ],
        3,
      )
      .shards(
        [
          [-22, 0],
          [22, 0],
          [0, -22],
          [0, 22],
        ],
        1,
      )
      .beast('mossback', 38, 38)
      .beast('spitter', -38, -38)
      .beast('skitter', 40, -20)
      .bloom(-38, 38, 150)
      .done(PACE['clock-face'])
  );
}

export const HUNT_FIELDS = challengeFields(
  'hunt',
  byPace([
    picnicBlanket(),
    theSundial(),
    steppingStones(),
    theReadingRoom(),
    flowerpotTerraces(),
    theScullery(),
    hedgeMaze(),
    dripGrotto(),
    islandKeep(),
    theSpiral(),
    nightMarket(),
    clockFace(),
  ]),
);
