import type { ShardVariant } from '../simulation/components';
import { LEVELS } from '../world/level';

/**
 * The Relics of Harmony. Every Sunshard in the valley turned up set into some small lost
 * object of the founders: the Kiln draws the light out, and the relic goes into the Field
 * Guide's cabinet. A relic is only a name, a shape and a line of description; the rules
 * still see a treasure of some weight.
 */

/** The shape a relic is modelled as. */
export type RelicShape =
  | 'watch'
  | 'acorn'
  | 'teacup'
  | 'gear'
  | 'bell'
  | 'key'
  | 'musicbox'
  | 'orrery'
  | 'lantern'
  | 'crystal'
  | 'compass'
  | 'thimble';

/** What it is made of, which sets its colours. */
export type RelicMaterial =
  'brass' | 'gold' | 'silver' | 'porcelain' | 'glass' | 'iron' | 'wood' | 'crystal';

export interface Relic {
  id: string;
  name: string;
  shape: RelicShape;
  material: RelicMaterial;
  description: string;
}

/** Ordinary finds, plain Sunshards. */
const COMMON: readonly Relic[] = [
  {
    id: 'pocketwatch',
    name: 'Sun-Drenched Pocketwatch',
    shape: 'watch',
    material: 'brass',
    description: 'Stopped at a quarter to noon. Wind it and it hums a little.',
  },
  {
    id: 'gilded-acorn',
    name: 'Gilded Acorn',
    shape: 'acorn',
    material: 'gold',
    description: 'Planted by the first Headmaster. It refused to grow out of sheer dignity.',
  },
  {
    id: 'brass-cog',
    name: 'Brass Escapement Cog',
    shape: 'gear',
    material: 'brass',
    description: 'Tick. Tock. Somewhere a clock is missing this and is furious about it.',
  },
  {
    id: 'chapel-bell',
    name: 'Chapel Handbell',
    shape: 'bell',
    material: 'brass',
    description: 'Rung once a term to begin examinations. Sproutlings still flinch at it.',
  },
  {
    id: 'greenhouse-key',
    name: 'Greenhouse Key',
    shape: 'key',
    material: 'brass',
    description: 'Opens every door in the Terrarium, and one cupboard in the kitchens.',
  },
  {
    id: 'waltz-box',
    name: 'Waltzing Music Box',
    shape: 'musicbox',
    material: 'wood',
    description: 'Plays three bars of a waltz, then stops, as if it forgot the rest.',
  },
  {
    id: 'pocket-orrery',
    name: 'Pocket Orrery',
    shape: 'orrery',
    material: 'brass',
    description: 'A tiny model of the sky, two planets short. The founders were working on it.',
  },
  {
    id: 'firefly-lantern',
    name: 'Firefly Lantern',
    shape: 'lantern',
    material: 'brass',
    description: 'Built to hold fireflies. It holds a Sunshard instead and seems happier.',
  },
  {
    id: 'sun-crystal',
    name: 'Sunwell Crystal',
    shape: 'crystal',
    material: 'crystal',
    description: 'Warm to the touch at any hour. Popular in the dormitories in winter.',
  },
  {
    id: 'surveyors-compass',
    name: 'Surveyor’s Compass',
    shape: 'compass',
    material: 'brass',
    description: 'Points north, mostly. Points at the Kiln when it gets cold.',
  },
  {
    id: 'silver-thimble',
    name: 'Seamstress’s Thimble',
    shape: 'thimble',
    material: 'silver',
    description: 'From the sewing room, where the Sproutlings’ baskets were first woven.',
  },
  {
    id: 'golden-gear',
    name: 'Golden Mainspring Gear',
    shape: 'gear',
    material: 'gold',
    description: 'The heart of the Great Clock in the bell tower. Keep it the right way up.',
  },
  {
    id: 'oak-acorn',
    name: 'Old Oak Acorn',
    shape: 'acorn',
    material: 'wood',
    description: 'From the oak the Academy was built round. It is still a little bit offended.',
  },
  {
    id: 'dinner-bell',
    name: 'Refectory Dinner Bell',
    shape: 'bell',
    material: 'silver',
    description: 'Every Sproutling within a mile knows exactly what this means.',
  },
  {
    id: 'skeleton-key',
    name: 'Silver Skeleton Key',
    shape: 'key',
    material: 'silver',
    description: 'Fits no lock anyone has found. The Sproutlings are very interested in this.',
  },
  {
    id: 'gold-watch',
    name: 'Headmaster’s Half-Hunter',
    shape: 'watch',
    material: 'gold',
    description: 'Engraved “for punctuality”. It runs eleven minutes fast.',
  },
  {
    id: 'star-orrery',
    name: 'Star-Chart Orrery',
    shape: 'orrery',
    material: 'gold',
    description: 'Its rings still turn on their own on clear nights.',
  },
  {
    id: 'study-lantern',
    name: 'Study Lantern',
    shape: 'lantern',
    material: 'silver',
    description: 'Lit a thousand late nights in the library. Smells faintly of toast.',
  },
  {
    id: 'dawn-crystal',
    name: 'Dawn Crystal',
    shape: 'crystal',
    material: 'gold',
    description: 'Grown in the east window, where the first light of every term falls.',
  },
  {
    id: 'brass-compass',
    name: 'Field Compass',
    shape: 'compass',
    material: 'gold',
    description: 'Issued to the first Wardens. The needle quivers near anything worth carrying.',
  },
  {
    id: 'lullaby-box',
    name: 'Nursery Music Box',
    shape: 'musicbox',
    material: 'brass',
    description: 'Plays the tune the Kiln crackles to when it is content.',
  },
  {
    id: 'brass-thimble',
    name: 'Weaver’s Thimble',
    shape: 'thimble',
    material: 'brass',
    description: 'Dented on one side. Somebody pushed a very stubborn reed.',
  },
  {
    id: 'seed-acorn',
    name: 'Seedbank Acorn',
    shape: 'acorn',
    material: 'brass',
    description: 'Hollow, with a seed inside it from a tree nobody has seen in a century.',
  },
  {
    id: 'tower-key',
    name: 'Bell-Tower Key',
    shape: 'key',
    material: 'gold',
    description: 'Heavy, ornate, and absolutely not to be given to a cadet. Too late.',
  },
];

/** Fragile finds, Dewglass: porcelain and glass. */
const FRAGILE: readonly Relic[] = [
  {
    id: 'porcelain-teacup',
    name: 'Porcelain Teacup',
    shape: 'teacup',
    material: 'porcelain',
    description: 'The Headmaster’s favourite. Do not mention the chip.',
  },
  {
    id: 'glass-lantern',
    name: 'Blown-Glass Lantern',
    shape: 'lantern',
    material: 'glass',
    description: 'So thin you can hear the light inside it ring.',
  },
  {
    id: 'dew-crystal',
    name: 'Dewdrop Crystal',
    shape: 'crystal',
    material: 'glass',
    description: 'Caught a morning’s dew and never let it go.',
  },
  {
    id: 'gilt-teacup',
    name: 'Gilt-Edged Teacup',
    shape: 'teacup',
    material: 'glass',
    description: 'From the founders’ own tea service. The saucer is still out there somewhere.',
  },
  {
    id: 'glass-bell',
    name: 'Glass Bell',
    shape: 'bell',
    material: 'glass',
    description: 'Rings a note so high only the Sproutlings can hear it. They hate it.',
  },
];

/** Heavy finds, Lodestones: iron and old machinery. */
const HEAVY: readonly Relic[] = [
  {
    id: 'rusted-gear',
    name: 'Rusted Relic Gear',
    shape: 'gear',
    material: 'iron',
    description: 'From the great waterwheel. It still wants to turn, and pulls at iron to do it.',
  },
  {
    id: 'iron-orrery',
    name: 'Foundry Orrery',
    shape: 'orrery',
    material: 'iron',
    description: 'Cast as a gift for the first Kiln. Weighs about as much as a Mossback.',
  },
  {
    id: 'anvil-bell',
    name: 'Foundry Bell',
    shape: 'bell',
    material: 'iron',
    description: 'Rang the shifts at the old ironworks. Clangs on its own when the wind turns.',
  },
  {
    id: 'iron-key',
    name: 'Floodgate Key',
    shape: 'key',
    material: 'iron',
    description: 'Opened the sluices under the Terrarium. The sluices would like it back.',
  },
];

export const RELICS: readonly Relic[] = [...COMMON, ...FRAGILE, ...HEAVY];

/**
 * The Great Clock's twelve parts, found in the story's grounds: each is its own relic, by the
 * treasure id it has in its section.
 */
export const CLOCK_PARTS: Readonly<Record<string, Relic>> = {
  'part-mainspring': {
    id: 'part-mainspring',
    name: 'The Great Mainspring',
    shape: 'watch',
    material: 'iron',
    description: 'Coiled tight for a hundred years. It has been waiting to let go.',
  },
  'part-escapement': {
    id: 'part-escapement',
    name: 'The Grasshopper Escapement',
    shape: 'gear',
    material: 'brass',
    description: 'It lets the Clock tick one moment at a time, and not all at once.',
  },
  'part-pendulum': {
    id: 'part-pendulum',
    name: 'The Pendulum Bob',
    shape: 'compass',
    material: 'gold',
    description: 'Fished out of the lily pond, still swinging a little out of habit.',
  },
  'part-crown-wheel': {
    id: 'part-crown-wheel',
    name: 'The Crown Wheel',
    shape: 'gear',
    material: 'gold',
    description: 'Warm to the touch. The vents have kept it at forging heat all this time.',
  },
  'part-chime-hammer': {
    id: 'part-chime-hammer',
    name: 'The Chime Hammer',
    shape: 'bell',
    material: 'silver',
    description: 'It strikes the hour. The spark coils have been striking it instead.',
  },
  'part-hour-hand': {
    id: 'part-hour-hand',
    name: 'The Hour Hand',
    shape: 'key',
    material: 'iron',
    description: 'Slow, patient, and longer than the Warden is tall.',
  },
  'part-balance-wheel': {
    id: 'part-balance-wheel',
    name: 'The Balance Wheel',
    shape: 'orrery',
    material: 'crystal',
    description: 'Sealed in the crystal vault by someone who knew what it was worth.',
  },
  'part-moon-dial': {
    id: 'part-moon-dial',
    name: 'The Moon Dial',
    shape: 'orrery',
    material: 'silver',
    description: 'It shows the phase of the moon, and, the founders claimed, of the Headmaster.',
  },
  'part-fusee': {
    id: 'part-fusee',
    name: 'The Fusee Cone',
    shape: 'gear',
    material: 'brass',
    description: 'The Gravelmaw had been sleeping on it. It is slightly flatter on one side.',
  },
  'part-bell-housing': {
    id: 'part-bell-housing',
    name: 'The Bell Housing',
    shape: 'bell',
    material: 'iron',
    description: 'The heaviest part of the Clock, and the loudest when dropped.',
  },
  'part-winding-key': {
    id: 'part-winding-key',
    name: 'The Winding Key',
    shape: 'key',
    material: 'gold',
    description: 'Without it the Clock could never be wound again. The Skitters knew.',
  },
  'part-minute-hand': {
    id: 'part-minute-hand',
    name: 'The Minute Hand',
    shape: 'lantern',
    material: 'glass',
    description: 'Glass, of all things. The founders liked to see the hours go by.',
  },
  // The Sunken Orchard's parts: the Clock's striking train, which rang the hours.
  'part-click-spring': {
    id: 'part-click-spring',
    name: 'The Click Spring',
    shape: 'watch',
    material: 'silver',
    description: 'It clicks. Constantly. The Proctor would like a word with whoever designed it.',
  },
  'part-third-wheel': {
    id: 'part-third-wheel',
    name: 'The Third Wheel',
    shape: 'gear',
    material: 'brass',
    description: 'Found sulking in the crate. Every clock needs one, and it knows it.',
  },
  'part-pinion': {
    id: 'part-pinion',
    name: 'The Lantern Pinion',
    shape: 'lantern',
    material: 'brass',
    description: 'Fished out of a drain, dripping and faintly pleased with itself.',
  },
  'part-rack-hook': {
    id: 'part-rack-hook',
    name: 'The Rack Hook',
    shape: 'key',
    material: 'iron',
    description: 'It counts the strokes. It has been counting the ripples instead, out of habit.',
  },
  'part-fly-fan': {
    id: 'part-fly-fan',
    name: 'The Fly Fan',
    shape: 'compass',
    material: 'brass',
    description: 'It slows the strike to a dignified pace. Heavy, and very dignified.',
  },
  'part-going-barrel': {
    id: 'part-going-barrel',
    name: 'The Going Barrel',
    shape: 'musicbox',
    material: 'silver',
    description: 'Half full of pond. Pour it out before fitting, the Headmaster insists.',
  },
  'part-cannon-pinion': {
    id: 'part-cannon-pinion',
    name: 'The Cannon Pinion',
    shape: 'gear',
    material: 'iron',
    description: 'Not, despite its name, a cannon. The Sproutlings were disappointed.',
  },
  'part-pallet-fork': {
    id: 'part-pallet-fork',
    name: 'The Pallet Fork',
    shape: 'key',
    material: 'gold',
    description: 'From the Root Cellar, where it had grown a fine beard of moss.',
  },
  'part-centre-arbor': {
    id: 'part-centre-arbor',
    name: 'The Centre Arbor',
    shape: 'orrery',
    material: 'brass',
    description:
      'Everything in the Clock turns round it. Down in the dark, it had nothing to turn.',
  },
  'part-strike-train': {
    id: 'part-strike-train',
    name: 'The Strike Train',
    shape: 'bell',
    material: 'gold',
    description:
      'Taken from beside the Mire Lord’s pond. It rang once when lifted, as if in thanks.',
  },
};

function poolFor(variant: ShardVariant | undefined): readonly Relic[] {
  if (variant === 'dewglass') return FRAGILE;
  if (variant === 'lodestone') return HEAVY;
  return COMMON;
}

/**
 * Which relic each treasure in each lesson is, keyed `levelId:treasureId`. Handed out in
 * lesson order, cycling through each pool, so the same lesson always holds the same relics
 * and every relic appears somewhere.
 */
const ASSIGNED: ReadonlyMap<string, Relic> = (() => {
  const map = new Map<string, Relic>();
  const next = new Map<readonly Relic[], number>();
  for (const level of LEVELS) {
    for (const treasure of level.treasures) {
      const pool = poolFor(treasure.variant);
      const index = next.get(pool) ?? 0;
      next.set(pool, index + 1);
      map.set(`${level.id}:${treasure.id}`, pool[index % pool.length]);
    }
  }
  return map;
})();

/**
 * Each boss's own relic, set into the Sunshard it drops (`<kind>-shard`): the reward for a
 * set piece, the same wherever that boss is beaten.
 */
export const BOSS_RELICS: Readonly<Record<string, Relic>> = {
  'gravelmaw-shard': {
    id: 'gravelmaw-molar',
    name: 'The Gravelmaw’s Molar',
    shape: 'crystal',
    material: 'iron',
    description:
      'It ground gravel for a century. Somebody has polished it, which feels rather cheeky.',
  },
  'lanternroot-shard': {
    id: 'lanternroot-wick',
    name: 'Everburning Wick',
    shape: 'lantern',
    material: 'glass',
    description: 'Taken from the heart of the Lanternroot. It still glows when nobody is looking.',
  },
  'bellwether-shard': {
    id: 'bellwether-clapper',
    name: 'The Bellwether’s Clapper',
    shape: 'bell',
    material: 'brass',
    description: 'Silent at last. The Headmaster keeps it in a drawer, and checks the drawer.',
  },
  'snuffer-shard': {
    id: 'snuffer-candle',
    name: 'Last Candle of the Undercroft',
    shape: 'lantern',
    material: 'silver',
    description:
      'The one flame the Snuffer never reached. Handle with both hands and some respect.',
  },
  'galewing-shard': {
    id: 'galewing-scale',
    name: 'Dusk Scale of the Galewing',
    shape: 'compass',
    material: 'crystal',
    description: 'Hold it up and the needle swings towards wherever the wind is going next.',
  },
  'mirelord-shard': {
    id: 'mirelord-crown',
    name: 'The Mire Lord’s Crown',
    shape: 'thimble',
    material: 'gold',
    description: 'Small, dented, weedy and unmistakably royal. It fits a Sproutling perfectly.',
  },
};

/**
 * The relic a treasure is. Shards dropped by bosses and mounds are not in any lesson's list;
 * they take one from the common pool by their id.
 */
export function relicFor(levelId: string, treasureId: string, variant?: ShardVariant): Relic {
  if (levelId.startsWith('campaign-') && CLOCK_PARTS[treasureId]) return CLOCK_PARTS[treasureId];
  const boss = BOSS_RELICS[treasureId];
  if (boss) return boss;
  const known = ASSIGNED.get(`${levelId}:${treasureId}`);
  if (known) return known;
  const pool = poolFor(variant);
  let hash = 0;
  for (const char of `${levelId}:${treasureId}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
}

/** Where each relic can be found: the lessons that hold it. */
export function relicLocations(relicId: string): string[] {
  const names: string[] = [];
  for (const level of LEVELS) {
    if (level.treasures.some((t) => relicFor(level.id, t.id, t.variant).id === relicId)) {
      names.push(level.name);
    }
  }
  return names;
}

/** Ids of every relic ever brought home, from the save's list of delivered treasures. */
export function recoveredRelics(treasuresCollected: readonly string[]): Set<string> {
  const found = new Set<string>();
  for (const key of treasuresCollected) {
    const split = key.indexOf(':');
    if (split < 0) continue;
    const levelId = key.slice(0, split);
    const treasureId = key.slice(split + 1);
    const level = LEVELS.find((candidate) => candidate.id === levelId);
    const spawn = level?.treasures.find((t) => t.id === treasureId);
    found.add(relicFor(levelId, treasureId, spawn?.variant).id);
  }
  return found;
}
