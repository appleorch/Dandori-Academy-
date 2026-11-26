import { composedFields } from './composed';

/**
 * Mission fields, made by the field composer: dens of beasts in walled gardens, hoards behind
 * them, and at the top a Gravelmaw in the farthest garden. A 100% clear (every Sunshard home and
 * every beast down) earns the time bonus and is needed for Platinum and Diamond.
 */
export const MISSION_FIELDS = composedFields('mission', [
  { seed: 4, tier: 1, name: 'First Blood', pace: 135 },
  { seed: 1, tier: 2, name: 'The Long Patrol', pace: 159 },
  { seed: 1, tier: 3, name: 'River Watch', pace: 253 },
  { seed: 12, tier: 4, name: 'Vent and Shelf', pace: 225 },
  { seed: 15, tier: 5, name: 'Crystal Keep', pace: 334 },
  { seed: 13, tier: 6, name: 'The Hub', pace: 243 },
  { seed: 10, tier: 7, name: 'Bramble Bastion', pace: 301 },
  { seed: 1, tier: 8, name: 'The Inner Ward', pace: 350 },
  { seed: 9, tier: 9, name: 'Fire and Water', pace: 355 },
  { seed: 1, tier: 10, name: 'The Gravel Pit', pace: 426 },
  { seed: 2, tier: 11, name: 'Maw of the Gardens', pace: 562 },
  { seed: 4, tier: 12, name: 'The Last Stand', pace: 669 },
]);
