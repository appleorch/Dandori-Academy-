import type { Relic, RelicMaterial, RelicShape } from './relics';

/**
 * The relic sets: eight themed sets of eight, found in the Escort fields and the daily
 * challenge's fields (a new field every day, so a reason to come back). A set completed earns
 * its outfit in the Wardrobe (see outfits.ts).
 */
export interface RelicSet {
  id: string;
  name: string;
  /** What completing it earns, in words. */
  bonus: string;
  relics: readonly Relic[];
}

type Item = readonly [name: string, description: string];

function set(
  id: string,
  name: string,
  shape: RelicShape,
  material: RelicMaterial,
  items: readonly Item[],
): RelicSet {
  return {
    id,
    name,
    bonus: `The ${name} outfit in the Wardrobe.`,
    relics: items.map(([itemName, description], i) => ({
      id: `set-${id}-${i + 1}`,
      name: itemName,
      shape,
      material,
      description,
    })),
  };
}

export const RELIC_SETS: readonly RelicSet[] = [
  set('tea', 'Tea Service', 'teacup', 'porcelain', [
    ['Founders’ Teapot', 'Still warm, somehow. Nobody has dared ask why.'],
    ['Saucer of Plenty', 'There is always one biscuit on it. Always exactly one.'],
    ['Milk Jug with a Chip', 'The chip is shaped like the Academy, if you squint.'],
    ['Sugar Tongs', 'For the Headmaster’s seven lumps. He denies it.'],
    ['Tea Strainer', 'Strains tea, gossip and, once, a very small newt.'],
    ['Cosy of the First Term', 'Knitted badly with great love.'],
    ['Lemon Fork', 'Nobody knows what it is for. It knows.'],
    ['The Last Teacup', 'Twelve were made. Eleven were dropped.'],
  ]),
  set('desk', 'Founders’ Desk', 'key', 'wood', [
    ['Inkwell of Long Letters', 'Dry for a century; still smells of ink.'],
    ['Blotter Rocker', 'Rocks gently when the wind is from the east.'],
    ['Seal of the Academy', 'Presses a sprig and a cog into hot wax.'],
    ['Letter Opener', 'Opened the Academy’s first letter: a complaint.'],
    ['Paperweight Acorn', 'Holds down the windiest of papers.'],
    ['Drawer Key', 'Opens a drawer that is not in the desk.'],
    ['Quill Stand', 'Shaped like a heron, holding its breath.'],
    ['Ledger Clasp', 'Kept the accounts shut, and the accountant cheerful.'],
  ]),
  set('orrery', 'Orrery Room', 'orrery', 'brass', [
    ['Little Moon', 'Goes round the little world, very seriously.'],
    ['Comet Arm', 'Bent from a night it went round too fast.'],
    ['Sun Bearing', 'Spins at the lightest breath.'],
    ['Star Pin', 'Marks a star nobody else has seen.'],
    ['Ring of Saturn', 'Fits no planet the Academy owns.'],
    ['Crank Handle', 'Turn it and the heavens oblige.'],
    ['Season Wheel', 'Has a fifth season marked “later”.'],
    ['Orrery Key', 'Winds the sky. Gently, please.'],
  ]),
  set('garden', 'Garden Tools', 'thimble', 'iron', [
    ['First Trowel', 'Dug the Academy’s first bed, and the second by mistake.'],
    ['Seed Dibber', 'Makes the perfect hole for one seed. Only one.'],
    ['Pruning Thimble', 'For snipping the very smallest leaves.'],
    ['Watering Rose', 'Sprinkles like a gentle laugh.'],
    ['Twine Spool', 'The twine never runs out; the patience does.'],
    ['Plant Label of Hope', 'Reads “something lovely” in faded pencil.'],
    ['Hoe Head', 'Hoed for forty years, then retired to a shelf.'],
    ['Cloche Handle', 'All that is left of a very fine bell jar.'],
  ]),
  set('music', 'Music Room', 'musicbox', 'silver', [
    ['Tuning Fork', 'Hums the note the Clock struck at noon.'],
    ['Metronome Weight', 'Keeps time for anyone who asks.'],
    ['Music Box Comb', 'Plays a lullaby to beetles.'],
    ['Silver Whistle', 'The first Warden’s, before the Kiln learned to call.'],
    ['Organ Stop', 'Labelled “Vox Sproutling”. Do not pull it.'],
    ['Bell Clapper', 'Rang the first bell of term, and the last.'],
    ['Pitch Pipe', 'Squeaks hopefully in the right key.'],
    ['Conductor’s Baton', 'Points the way at every crossroads.'],
  ]),
  set('lamps', 'Lamplighters', 'lantern', 'glass', [
    ['Wick Trimmer', 'For lamps that burn a touch too keen.'],
    ['Lantern Pane', 'Green glass that makes the night look kind.'],
    ['Snuffer Cap', 'Puts out a flame politely.'],
    ['Match Tin', 'One match left. It is waiting for something.'],
    ['Lamp Hook', 'Hung the first lamp on the first night.'],
    ['Glow Jar', 'A firefly’s summer house, empty now.'],
    ['Reflector Disc', 'Throws light into the darkest hedge.'],
    ['Beacon Lens', 'Made for a beacon that was never built.'],
  ]),
  set('voyage', 'Voyagers', 'compass', 'gold', [
    ['Pocket Compass', 'Points to wherever you left your hat.'],
    ['Map Pin', 'Pinned the Academy to the map, a little crooked.'],
    ['Spyglass Cap', 'From a spyglass that saw the sea once.'],
    ['Sextant Arc', 'Measures how far the sun has to go.'],
    ['Travel Clock', 'Wakes you an hour early, out of kindness.'],
    ['Luggage Tag', 'Reads “Return to the Kiln if found”.'],
    ['Rope Toggle', 'Held a hammock on the long voyage here.'],
    ['Captain’s Button', 'Brass, polished by a hundred thumbs.'],
  ]),
  set('crystal', 'Crystal Cabinet', 'crystal', 'crystal', [
    ['Prism Shard', 'Splits a sunbeam into seven small cheers.'],
    ['Geode Half', 'Its other half is somewhere, missing it.'],
    ['Frost Spar', 'Cold to the touch even at noon.'],
    ['Rose Quartz Heart', 'Given to the Academy by its first friend.'],
    ['Smoky Point', 'Smells faintly of bonfires.'],
    ['Amber Drop', 'A tiny seed is inside, still waiting.'],
    ['Moonstone', 'Glows on the nights the Clock would have struck.'],
    ['Cabinet Key', 'Opens the cabinet these all came from.'],
  ]),
];

/** Every set relic, in order. */
export const SET_RELICS: readonly Relic[] = RELIC_SETS.flatMap((s) => s.relics);

/** Whether a field's treasure comes from the sets: the Escort fields and the daily fields. */
export function setsField(levelId: string): boolean {
  return levelId.startsWith('escort-') || levelId.startsWith('hunt-daily-');
}

/** How many of a set's relics are among those recovered. */
export function setProgress(set: RelicSet, found: ReadonlySet<string>): number {
  return set.relics.filter((relic) => found.has(relic.id)).length;
}
