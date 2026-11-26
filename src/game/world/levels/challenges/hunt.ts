import { composedFields } from './composed';

/**
 * Treasure Hunt fields, made by the field composer: walled gardens joined by gates, crystal doors
 * and streams, with hoards, twins, Dewglass, ponds and shelves to plan a route through. The day
 * ends with the last Sunshard; treasure, survivors and time all score.
 */
export const HUNT_FIELDS = composedFields('hunt', [
  { seed: 1, tier: 1, name: 'Bramble Row', pace: 131 },
  { seed: 3, tier: 2, name: 'The Long Garden', pace: 170 },
  { seed: 1, tier: 3, name: 'Two Streams', pace: 181 },
  { seed: 3, tier: 4, name: 'Heavy Harvest', pace: 280 },
  { seed: 2, tier: 5, name: 'Stream and Thicket', pace: 339 },
  { seed: 5, tier: 6, name: 'Crystal Courts', pace: 310 },
  { seed: 1, tier: 7, name: 'High Shelves', pace: 341 },
  { seed: 4, tier: 8, name: 'The Waterworks', pace: 486 },
  { seed: 20, tier: 9, name: 'Terraced Gardens', pace: 320 },
  { seed: 8, tier: 10, name: 'Twin Fountains', pace: 416 },
  { seed: 11, tier: 11, name: 'The Glasshouse', pace: 451 },
  { seed: 15, tier: 12, name: 'The Kiln Court', pace: 440 },
]);
