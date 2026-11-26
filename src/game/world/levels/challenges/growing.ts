import { composedFields } from './composed';

/**
 * Growing Season fields, made by the field composer: walled gardens of seed pods, mounds that hide
 * them and beasts whose carcasses grow a squad, behind gates, crystal doors and streams. What
 * counts is how many Sproutlings are alive at sunset. Ordered by tier.
 */
export const GROWING_FIELDS = composedFields('growing', [
  { seed: 1, tier: 1, name: 'Seedbed Lane', pace: 39 },
  { seed: 1, tier: 2, name: 'The Nursery', pace: 43 },
  { seed: 1, tier: 3, name: 'Two-Stream Meadow', pace: 64 },
  { seed: 2, tier: 4, name: 'Thorn Nursery', pace: 38 },
  { seed: 2, tier: 5, name: 'The Hungry Gardens', pace: 56 },
  { seed: 1, tier: 6, name: 'Crystal Orchard', pace: 24 },
  { seed: 1, tier: 7, name: 'Mound Hollow', pace: 35 },
  { seed: 1, tier: 8, name: 'The Kiln’s Garden', pace: 49 },
  { seed: 1, tier: 9, name: 'Crossing Gardens', pace: 43 },
  { seed: 1, tier: 10, name: 'The Wild Den', pace: 40 },
  { seed: 5, tier: 11, name: 'The Great Allotment', pace: 39 },
  { seed: 1, tier: 12, name: 'The Greenhouse Maze', pace: 79 },
]);
