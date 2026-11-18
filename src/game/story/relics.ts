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
 * The relic a treasure is. Shards dropped by bosses and mounds are not in any lesson's list;
 * they take one from the common pool by their id.
 */
export function relicFor(levelId: string, treasureId: string, variant?: ShardVariant): Relic {
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
