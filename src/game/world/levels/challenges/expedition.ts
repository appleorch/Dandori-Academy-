import { Field, floor } from './build';
import { challengeFields } from './field';
import type { FieldMeta } from './build';

/**
 * Expedition fields, each written by hand: a field with a way down, and two or three caves under
 * it, every cave its own place (a cistern, a mine, an ossuary, a library's stacks, a clock's
 * works...). There is no clock; what is found below counts once it comes up the stair. Floors
 * keep the Kiln by the foot of their stair and, but the last, a way down at the far end.
 */

/** Measured by the test player (`npm run paces`): its headcount at the end, which is Platinum. */
const PACE: Record<string, number> = {
  'the-old-well': 20,
  'rabbit-warren': 28,
  'the-old-mine': 16,
  'the-catacombs': 18,
  'sunken-library': 21,
  'the-pump-house': 17,
  'glowcap-grotto': 21,
  'the-clock-pit': 22,
  'ant-hill': 28,
  'crystal-caverns': 20,
  'the-flooded-vault': 30,
  'the-deep-garden': 29,
};

/** A cave floor's frame: 56 by 44 unless said, the stair and Kiln on the west side. */
function cave(id: string, name: string, extra: Partial<FieldMeta> = {}): Field {
  return new Field({
    id,
    name,
    brief: 'A cave under the field.',
    theme: 'cave',
    look: 'rock',
    width: 56,
    depth: 44,
    dayLength: 0,
    seed: 0,
    squad: {},
    kiln: { x: -22, z: 0 },
    ...extra,
  });
}

/** A field's frame: no clock, the way down at the far end. */
function surface(meta: Omit<FieldMeta, 'dayLength'>): Field {
  return new Field({ ...meta, dayLength: 0 });
}

function theOldWell() {
  const id = 'the-old-well';
  return surface({
    id,
    name: 'The Old Well',
    brief:
      'An old well stands at the end of the village green, and a ladder goes down it: first into a flooded cistern where the shards wait on the stones between the pools, then into the dry cellar beneath. Dewlings wade straight across the cistern.',
    theme: 'meadow',
    look: 'brick',
    width: 72,
    depth: 52,
    seed: 1701,
    squad: { dew: 6, ember: 6, stone: 4 },
    kiln: { x: -30, z: 0 },
  })
    .rock(-6, -14, 4, 'brick')
    .rock(8, 14, 4, 'brick')
    .shards(
      [
        [-16, -18],
        [-12, 16],
        [4, 0],
        [16, -18],
      ],
      1,
    )
    .shard(20, 18, 2)
    .pod(-20, 8)
    .descent(28, 0, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Cistern', { look: 'brick' })
          .water([-12, -18, 2, -6])
          .water([-12, 6, 2, 18])
          .water([8, -10, 18, 10])
          // Shards on the dry stones between the pools; Dewlings cut straight across.
          .shards(
            [
              [-4, 0],
              [5, -16],
              [5, 16],
              [22, -2],
            ],
            2,
          )
          .shards(
            [
              [-14, -20],
              [-14, 20],
            ],
            1,
          )
          .descent(24, -16, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Dry Cellar')
          .vline(-6, -22, 22, [[-4, 4]])
          .hline(0, -6, 28, [[12, 18]])
          .shards(
            [
              [4, -14],
              [20, -14],
              [4, 14],
              [22, 14],
            ],
            3,
          )
          .beast('skitter', 14, -8),
      ),
    )
    .done(PACE[id]);
}

function rabbitWarren() {
  const id = 'rabbit-warren';
  return surface({
    id,
    name: 'Rabbit Warren',
    brief:
      'A rabbit hole under the hedgerows leads into the warren: tunnels of roots with Skitters running them, and below, the nursery chamber where Burrow Grubs swim through the floor among soft mounds.',
    theme: 'meadow',
    look: 'hedge',
    width: 76,
    depth: 56,
    seed: 1702,
    squad: { ember: 8, stone: 8 },
    kiln: { x: -32, z: 0 },
  })
    .hline(-12, -20, 30, [[-4, 2]])
    .hline(12, -20, 30, [[10, 16]])
    .shards(
      [
        [-12, -22],
        [0, 0],
        [18, 22],
        [24, -22],
      ],
      1,
    )
    .shard(14, 0, 2)
    .descent(30, 0, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Burrows', { look: 'root' })
          .vline(-8, -22, 22, [
            [-16, -10],
            [10, 16],
          ])
          .vline(8, -22, 22, [[-3, 3]])
          .shards(
            [
              [0, -16],
              [0, 16],
              [18, -14],
              [18, 14],
            ],
            2,
          )
          .beast('skitter', 0, 0)
          .beast('skitter', 16, -6)
          .descent(24, 0, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Nursery Chamber', { look: 'root', width: 60, depth: 48 })
          .beast('grub', 4, -10)
          .beast('grub', 14, 12)
          .mound(-6, 14)
          .mound(20, -16)
          .shards(
            [
              [0, 0],
              [12, -18],
              [22, 4],
              [6, 18],
            ],
            3,
          ),
      ),
    )
    .done(PACE[id]);
}

function theOldMine() {
  const id = 'the-old-mine';
  return surface({
    id,
    name: 'The Old Mine',
    brief:
      'A quarry with a mine shaft at its foot. The first gallery still has its ore belts, running back towards the shaft; the seam below is walled with crystal doors only Stonelings crack quickly. Bring plenty of Stonelings.',
    theme: 'autumn',
    look: 'rock',
    width: 76,
    depth: 56,
    seed: 1703,
    squad: { stone: 10, ember: 6 },
    kiln: { x: -32, z: 0 },
  })
    .rock(-8, -10, 5)
    .rock(6, 12, 5)
    .rock(18, -14, 4)
    .shards(
      [
        [-14, 16],
        [0, -22],
        [24, 4],
        [12, 24],
      ],
      2,
    )
    .descent(30, 0, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Ore Gallery', { look: 'gear', width: 64 })
          .conveyor([-14, -14, 26, -10], -1, 0)
          .conveyor([-14, 10, 26, 14], -1, 0)
          .shards(
            [
              [22, -12],
              [22, 12],
              [8, -12],
              [8, 12],
            ],
            3,
          )
          .shard(12, 0, 2)
          .descent(28, 0, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Crystal Seam', { look: 'glass' })
          .vline(0, -22, 22, [[-3, 3]])
          .gate([-1, -3, 1, 3], 90, 'crystal')
          .vline(14, -22, 22, [[10, 16]])
          .gate([13, 10, 15, 16], 90, 'crystal')
          .shards(
            [
              [8, -14],
              [8, 14],
              [22, -10],
              [22, 10],
            ],
            4,
          ),
      ),
    )
    .done(PACE[id]);
}

function theCatacombs() {
  const id = 'the-catacombs';
  return surface({
    id,
    name: 'The Catacombs',
    brief:
      'Steps under the ruined chapel go down into the catacombs: an ossuary of narrow halls with alcoves on both sides, and below it a crypt where dewdrops fall from the vault on a slow beat. Count the drops before you cross.',
    theme: 'dusk',
    look: 'ruin',
    width: 76,
    depth: 60,
    seed: 1704,
    squad: { ember: 8, stone: 8 },
    kiln: { x: -32, z: 0 },
  })
    .pen([-4, -18, 22, 18], { w: [[-3, 3]] })
    .shards(
      [
        [-18, -22],
        [-16, 22],
        [6, -8],
        [6, 8],
      ],
      1,
    )
    .shard(-4, -26, 2)
    .descent(14, 0, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Ossuary', { look: 'ruin', width: 64, depth: 48 })
          .hline(-8, -10, 30, [
            [-10, -4],
            [8, 12],
          ])
          .hline(8, -10, 30, [
            [8, 12],
            [22, 28],
          ])
          .vline(4, -24, -8)
          .vline(16, -24, -8)
          .vline(4, 8, 24)
          .vline(16, 8, 24)
          .shards(
            [
              [-2, -16],
              [10, -16],
              [24, -16],
              [-2, 16],
              [10, 16],
              [24, 16],
            ],
            2,
          )
          .beast('skitter', 12, 0)
          .descent(28, 0, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Crypt', { look: 'rock' })
          .drip(-4, -8, 4, 0)
          .drip(8, 6, 4, 2)
          .drip(18, -4, 4, 1)
          .shards(
            [
              [-2, -8],
              [10, 6],
              [20, -4],
            ],
            3,
          )
          .shards(
            [
              [4, 16],
              [20, 14],
            ],
            2,
          ),
      ),
    )
    .done(PACE[id]);
}

function sunkenLibrary() {
  const id = 'sunken-library';
  return surface({
    id,
    name: 'Sunken Library',
    brief:
      'A trapdoor in the reading garden drops into the Academy’s sunken library: first the stacks, aisles of books with the shards shelved at the ends, then the archive, split by chasms you can throw across but must walk round.',
    theme: 'dusk',
    look: 'book',
    width: 72,
    depth: 56,
    seed: 1705,
    squad: { ember: 8, spark: 6, stone: 4 },
    kiln: { x: -30, z: 0 },
  })
    .vline(-8, -28, 10)
    .vline(10, -10, 28)
    .shards(
      [
        [-18, -20],
        [0, 20],
        [20, -20],
        [18, 6],
      ],
      1,
    )
    .descent(28, -20, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Stacks', { look: 'book' })
          .vline(-6, -22, 12)
          .vline(6, -12, 22)
          .vline(18, -22, 12)
          .shards(
            [
              [0, -18],
              [0, 18],
              [12, -18],
              [12, 18],
              [24, 18],
            ],
            2,
          )
          .beast('skitter', 12, 0)
          .descent(24, -18, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Archive', { look: 'pit', width: 60, depth: 48 })
          .hline(0, -14, 30, [[-14, -8]], 'pit', 4)
          .vline(10, -24, 0, [[-24, -18]], 'pit', 4)
          .shards(
            [
              [0, -14],
              [20, -14],
              [4, 14],
              [22, 14],
            ],
            3,
          )
          .beast('mossback', 18, 6),
      ),
    )
    .done(PACE[id]);
}

function thePumpHouse() {
  const id = 'the-pump-house';
  return surface({
    id,
    name: 'The Pump House',
    brief:
      'The greenhouse pump house has a hatch to the works below: a hall of water pipes, its channel crossed by one bridge site that wants two logs, and under that the boiler room, where flame vents guard nooks only Emberlings can work.',
    theme: 'terrarium',
    look: 'glass',
    width: 72,
    depth: 52,
    seed: 1706,
    squad: { ember: 8, stone: 6, dew: 3 },
    kiln: { x: -30, z: 0 },
  })
    .pen([-10, -16, 14, 16], { w: [[-3, 3]], e: [[-3, 3]] })
    .shards(
      [
        [-2, -8],
        [6, 8],
        [-18, 18],
        [24, -18],
      ],
      1,
    )
    .descent(28, 0, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Pipe Hall', { look: 'tile', width: 60 })
          .water([2, -22, 6, -3])
          .water([2, 3, 6, 22])
          .bridge([2, -3, 6, 3], { x: -1, z: 0 }, [
            { x: -10, z: -12 },
            { x: -12, z: 12 },
          ])
          .shards(
            [
              [14, -14],
              [20, 14],
              [-12, 0],
            ],
            2,
          )
          .shard(18, -2, 3)
          .descent(26, 16, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Boiler Room', { look: 'brick' })
          .hline(-8, -6, 28, [
            [2, 8],
            [19, 25],
          ])
          .vline(16, -22, -8)
          .vent(10, -18)
          .shard(12, -16, 2)
          .vent(22, -18, 4, 2)
          .shard(24, -16, 2)
          .shards(
            [
              [4, 10],
              [20, 12],
            ],
            3,
          ),
      ),
    )
    .done(PACE[id]);
}

function glowcapGrotto() {
  const id = 'glowcap-grotto';
  return surface({
    id,
    name: 'Glowcap Grotto',
    brief:
      'A sinkhole in the marsh opens into a grotto three floors deep: fungus caves lit only by cold beacons, then still pools only Dewlings work, and at the bottom the mushroom heart, where Pollen Moths flutter over the richest shards.',
    theme: 'marsh',
    look: 'root',
    width: 76,
    depth: 56,
    seed: 1707,
    squad: { dew: 6, ember: 8, spark: 6 },
    kiln: { x: -32, z: 0 },
  })
    .water([-12, -24, 2, -14])
    .water([4, 14, 18, 24])
    .shards(
      [
        [-6, -19],
        [11, 19],
      ],
      1,
    )
    .shards(
      [
        [-16, 14],
        [20, -18],
        [6, 0],
      ],
      1,
    )
    .descent(30, 0, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Fungus Caves', { look: 'root' })
          .hline(-8, -10, 28, [[14, 20]])
          .hline(8, -10, 28, [[0, 6]])
          .beacon(8, -16)
          .beacon(14, 16)
          .shards(
            [
              [2, -16],
              [22, -16],
              [4, 16],
              [22, 16],
            ],
            2,
          )
          .descent(24, 0, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Still Pools', { look: 'rock' })
          .water([-8, -18, 6, -6])
          .water([-8, 6, 6, 18])
          .water([12, -6, 22, 6])
          .shards(
            [
              [-2, -12],
              [0, 12],
              [16, 0],
            ],
            2,
          )
          .shard(20, -16, 3)
          .descent(24, 16, `${id}-3`),
      ),
      floor(
        cave(`${id}-3`, 'The Mushroom Heart', { look: 'root', width: 60, depth: 48 })
          .beast('moth', 4, -10)
          .beast('moth', 14, 12)
          .beast('moth', 22, -4)
          .shards(
            [
              [4, -12],
              [14, 14],
              [22, -6],
              [10, 0],
            ],
            3,
          ),
      ),
    )
    .done(PACE[id]);
}

function theClockPit() {
  const id = 'the-clock-pit';
  return surface({
    id,
    name: 'The Clock Pit',
    brief:
      'The pit under the Great Clock goes down through its works: the gearworks, where coils crackle in the dead ends; the escapement, all belts ticking back and forth; and the mainspring chamber at the bottom, held by Bogspitters.',
    theme: 'terrarium',
    look: 'gear',
    width: 76,
    depth: 56,
    seed: 1708,
    squad: { spark: 8, stone: 8, ember: 6 },
    kiln: { x: -32, z: 0 },
  })
    .vline(-6, -28, -6)
    .vline(-6, 6, 28)
    .vline(14, -16, 16, [[-3, 3]])
    .shards(
      [
        [-16, -20],
        [-16, 20],
        [4, -18],
        [4, 18],
        [24, 0],
      ],
      1,
    )
    .descent(30, -20, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Gearworks', { look: 'gear' })
          .hline(-8, 0, 28, [
            [6, 12],
            [21, 26],
          ])
          .vline(18, -22, -8)
          .coil({ x: 22, z: -18 }, { x: 26, z: -18 })
          .shard(24, -16, 2)
          .shards(
            [
              [0, 10],
              [14, 16],
              [24, 6],
            ],
            2,
          )
          .descent(24, 16, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Escapement', { look: 'gear', width: 64 })
          .conveyor([-14, -16, 28, -12], -1, 0)
          .conveyor([-14, 12, 28, 16], -1, 0)
          .hline(0, -10, 24, [[-10, -4]])
          .shards(
            [
              [24, -14],
              [24, 14],
              [10, -6],
              [10, 6],
            ],
            3,
          )
          .descent(28, 0, `${id}-3`),
      ),
      floor(
        cave(`${id}-3`, 'The Mainspring', { look: 'gear', width: 60, depth: 48 })
          .pen([0, -14, 24, 14], { w: [[-3, 3]] })
          .beast('spitter', 12, -6)
          .beast('spitter', 12, 6)
          .shards(
            [
              [8, 0],
              [18, -8],
              [18, 8],
            ],
            4,
          ),
      ),
    )
    .done(PACE[id]);
}

function antHill() {
  const id = 'ant-hill';
  return surface({
    id,
    name: 'Ant Hill',
    brief:
      'A great ant hill rises from the lawn with its door at the top. Inside: narrow galleries, a larder of shards too heavy for a small crew, and the queen’s chamber at the bottom, where Mossbacks have moved in.',
    theme: 'autumn',
    look: 'cliff',
    width: 76,
    depth: 60,
    seed: 1709,
    squad: { stone: 10, ember: 8 },
    kiln: { x: -32, z: 0 },
  })
    .terrace([0, -14, 24, 14], 3, [{ side: 'w', from: -3, to: 3, kind: 'ramp' }])
    .shards(
      [
        [-16, -20],
        [-16, 20],
        [30, -22],
        [30, 22],
      ],
      1,
    )
    .shard(-4, 22, 2)
    .descent(16, 0, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Galleries', { look: 'root', width: 60 })
          .hline(-12, -14, 30, [
            [-14, -8],
            [20, 26],
          ])
          .hline(0, -14, 30, [[6, 12]])
          .hline(12, -14, 30, [
            [-14, -8],
            [20, 26],
          ])
          .shards(
            [
              [0, -18],
              [16, -6],
              [0, 6],
              [16, 18],
            ],
            2,
          )
          .beast('skitter', 6, -6)
          .descent(26, 18, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Larder', { look: 'root' })
          .vline(4, -22, 22, [
            [-14, -8],
            [8, 14],
          ])
          .shards(
            [
              [14, -12],
              [14, 12],
            ],
            5,
          )
          .shard(-8, 14, 2)
          .descent(24, 0, `${id}-3`),
      ),
      floor(
        cave(`${id}-3`, 'The Queen’s Chamber', { look: 'root', width: 64, depth: 52 })
          .beast('mossback', 8, -12)
          .beast('mossback', 18, 12)
          .shards(
            [
              [14, -16],
              [22, 16],
              [4, 4],
            ],
            4,
          ),
      ),
    )
    .done(PACE[id]);
}

function crystalCaverns() {
  const id = 'crystal-caverns';
  return surface({
    id,
    name: 'Crystal Caverns',
    brief:
      'A crystal garden hides a cleft into the caverns: a geode of crystal doors, then a hall of chasms crossed only at their ends, and at the bottom the crystal heart, where a coil crackles over the last of the treasure.',
    theme: 'terrarium',
    look: 'glass',
    width: 76,
    depth: 56,
    seed: 1710,
    squad: { stone: 10, spark: 6, ember: 4 },
    kiln: { x: -32, z: 0 },
  })
    .pen([-8, -20, 18, 20], { w: [[-3, 3]] })
    .gate([-9, -3, -7, 3], 80, 'crystal')
    .shards(
      [
        [0, -10],
        [10, 10],
        [-18, -22],
        [26, 22],
      ],
      1,
    )
    .descent(10, -8, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Geode', { look: 'glass' })
          .pen([-4, -16, 22, 16], { w: [[-3, 3]] })
          .gate([-5, -3, -3, 3], 90, 'crystal')
          .shards(
            [
              [6, -8],
              [16, 8],
              [6, 8],
            ],
            3,
          )
          .shard(-14, -16, 2)
          .descent(16, -8, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Chasm Hall', { look: 'pit', width: 60, depth: 48 })
          .vline(-6, -24, 18, [], 'pit', 4)
          .vline(10, -18, 24, [], 'pit', 4)
          .shards(
            [
              [2, -16],
              [2, 16],
              [20, -16],
              [20, 16],
            ],
            3,
          )
          .descent(26, 0, `${id}-3`),
      ),
      floor(
        cave(`${id}-3`, 'The Crystal Heart', { look: 'glass' })
          .hline(-8, 0, 28, [
            [0, 6],
            [19, 24],
          ])
          .vline(16, -22, -8)
          .coil({ x: 20, z: -18 }, { x: 24, z: -18 })
          .shard(22, -16, 2)
          .shards(
            [
              [4, 10],
              [16, 14],
              [22, 4],
            ],
            4,
          ),
      ),
    )
    .done(PACE[id]);
}

function theFloodedVault() {
  const id = 'the-flooded-vault';
  return surface({
    id,
    name: 'The Flooded Vault',
    brief:
      'Inside a moat, a vault door stands open over a stair. Below: an antechamber half underwater, halls behind bramble gates of growing strength, and at the bottom the treasury itself, where Shellbacks bask among the shards.',
    theme: 'marsh',
    look: 'brick',
    width: 80,
    depth: 60,
    seed: 1711,
    squad: { dew: 6, stone: 8, ember: 6 },
    kiln: { x: -34, z: 0 },
  })
    .water([0, -20, 4, -3])
    .water([0, 3, 4, 20])
    .water([4, -20, 24, -16])
    .water([4, 16, 24, 20])
    .water([24, -20, 28, 20])
    .bridge([0, -3, 4, 3], { x: -3, z: 0 }, [
      { x: -16, z: -10 },
      { x: -18, z: 10 },
    ])
    .shards(
      [
        [-20, -22],
        [-20, 22],
        [34, -24],
        [34, 24],
      ],
      1,
    )
    .descent(14, 0, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Antechamber', { look: 'brick' })
          .water([-6, -20, 10, -4])
          .water([12, 4, 26, 20])
          .shards(
            [
              [14, -2],
              [-10, 12],
            ],
            2,
          )
          .shards(
            [
              [2, 10],
              [18, -12],
            ],
            2,
          )
          .descent(24, 0, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Vault Halls', { look: 'brick', width: 64 })
          .vline(-4, -22, 22, [[-3, 3]])
          .gate([-5, -3, -3, 3], 80)
          .vline(14, -22, 22, [[-3, 3]])
          .gate([13, -3, 15, 3], 140)
          .shards(
            [
              [4, -14],
              [4, 14],
            ],
            3,
          )
          .shards(
            [
              [22, -14],
              [22, 14],
            ],
            4,
          )
          .descent(28, 14, `${id}-3`),
      ),
      floor(
        cave(`${id}-3`, 'The Treasury', { look: 'brick', width: 60, depth: 48 })
          .beast('shellback', 6, -10)
          .beast('shellback', 16, 12)
          .shards(
            [
              [10, -14],
              [20, 16],
              [22, -4],
              [4, 6],
            ],
            4,
          ),
      ),
    )
    .done(PACE[id]);
}

function theDeepGarden() {
  const id = 'the-deep-garden';
  return surface({
    id,
    name: 'The Deep Garden',
    brief:
      'Under the oldest tree in the grounds, its roots go down three floors: a maze of roots, an underground lake with an island in the middle, and at the bottom the den of a Gravelmaw, sleeping on the richest hoard of all.',
    theme: 'autumn',
    look: 'root',
    width: 80,
    depth: 60,
    seed: 1712,
    squad: { stone: 12, ember: 10, dew: 4 },
    kiln: { x: -34, z: 0 },
  })
    .rock(0, 0, 6, 'root')
    .rock(-14, -16, 3, 'root')
    .rock(16, 16, 3, 'root')
    .shards(
      [
        [-20, 20],
        [10, -22],
        [26, 6],
        [-6, 14],
      ],
      1,
    )
    .descent(8, 0, `${id}-1`)
    .floors(
      floor(
        cave(`${id}-1`, 'The Root Maze', { look: 'root', width: 60, depth: 48 })
          .pen([-8, -16, 24, 16], { w: [[8, 14]], e: [[-14, -8]] })
          .hline(0, -8, 14, [[0, 6]])
          .vline(8, -16, 0)
          .shards(
            [
              [0, -10],
              [16, -10],
              [0, 8],
              [18, 8],
            ],
            2,
          )
          .descent(28, 20, `${id}-2`),
      ),
      floor(
        cave(`${id}-2`, 'The Underground Lake', { look: 'rock', width: 60, depth: 48 })
          .water([-6, -18, 20, -12])
          .water([-6, 12, 20, 18])
          .water([-6, -12, 0, -3])
          .water([-6, 3, 0, 12])
          .water([14, -12, 20, 12])
          .bridge([-6, -3, 0, 3], { x: -9, z: 0 }, [
            { x: -18, z: -12 },
            { x: -18, z: 12 },
          ])
          .shards(
            [
              [6, -4],
              [8, 6],
            ],
            4,
          )
          .shards(
            [
              [2, -15],
              [10, 15],
            ],
            2,
          )
          .descent(26, 0, `${id}-3`),
      ),
      floor(
        cave(`${id}-3`, 'The Gravelmaw’s Den', { look: 'rock', width: 64, depth: 52 })
          .beast('gravelmaw', 12, 0, { drop: 6 })
          .shards(
            [
              [4, -16],
              [22, -16],
              [4, 16],
              [22, 16],
            ],
            3,
          ),
      ),
    )
    .done(PACE[id]);
}

export const EXPEDITION_FIELDS = challengeFields('expedition', [
  theOldWell(),
  rabbitWarren(),
  theOldMine(),
  theCatacombs(),
  sunkenLibrary(),
  thePumpHouse(),
  glowcapGrotto(),
  theClockPit(),
  antHill(),
  crystalCaverns(),
  theFloodedVault(),
  theDeepGarden(),
]);
