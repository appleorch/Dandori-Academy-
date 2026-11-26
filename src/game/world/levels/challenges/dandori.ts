import { composedFields } from './composed';

/**
 * Dandori Challenge fields, made by the field composer: everything that can be carried counts by
 * weight, beasts' carcasses too, so its gardens are full of dens as well as hoards, shelves and
 * ponds. Platinum and Diamond need everything collected.
 */
export const DANDORI_FIELDS = composedFields('dandori', [
  { seed: 1, tier: 1, name: 'Den Row', pace: 133 },
  { seed: 4, tier: 2, name: 'The Kennels', pace: 156 },
  { seed: 2, tier: 3, name: 'Thicket Run', pace: 250 },
  { seed: 11, tier: 4, name: 'Shelf and Pond', pace: 301 },
  { seed: 28, tier: 5, name: 'Twin Streams', pace: 274 },
  { seed: 7, tier: 6, name: 'Crystal Kennels', pace: 265 },
  { seed: 3, tier: 7, name: 'The Round', pace: 333 },
  { seed: 9, tier: 8, name: 'The Long Haul', pace: 431 },
  { seed: 1, tier: 9, name: 'Four Ponds', pace: 359 },
  { seed: 1, tier: 10, name: 'The Gravel Cellar', pace: 362 },
  { seed: 2, tier: 11, name: 'The Great Weigh-In', pace: 666 },
  { seed: 4, tier: 12, name: 'Everything Home', pace: 419 },
]);
