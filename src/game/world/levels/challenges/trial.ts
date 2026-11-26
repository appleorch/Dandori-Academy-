import { composedFields } from './composed';

/**
 * Lean Squad Trial fields, made by the field composer: no clock and no Kiln growth, walled
 * gardens of shelves, ponds, hoards and hazard nooks behind gates and streams. Every Sproutling
 * lost is gone for good; the pace is how many the test player lost. Ordered by tier.
 */
export const TRIAL_FIELDS = composedFields('trial', [
  { seed: 1, tier: 1, name: 'Careful Gardens', pace: 4 },
  { seed: 7, tier: 2, name: 'The Shelves', pace: 0 },
  { seed: 11, tier: 3, name: 'Over the Water', pace: 9 },
  { seed: 8, tier: 4, name: 'Coil Corners', pace: 0 },
  { seed: 2, tier: 5, name: 'Pond and Bramble', pace: 6 },
  { seed: 12, tier: 6, name: 'The Terrace Ring', pace: 4 },
  { seed: 1, tier: 7, name: 'Crystal Stair', pace: 0 },
  { seed: 6, tier: 8, name: 'High and Dry', pace: 8 },
  { seed: 9, tier: 9, name: 'Ember Nook', pace: 3 },
  { seed: 11, tier: 10, name: 'The Long Haul Home', pace: 4 },
  { seed: 6, tier: 11, name: 'Spark and Stone', pace: 10 },
  { seed: 31, tier: 12, name: 'Every One Counts', pace: 7 },
]);
