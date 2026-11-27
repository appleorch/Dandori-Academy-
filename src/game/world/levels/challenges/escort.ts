import { generateField } from '../../generator';
import { challengeFields, type FieldSpec } from './field';

/**
 * Escort fields: each made by the field kit's generator from its seed (see generator.ts), and
 * played through by the test player, whose time is its pace. Easiest first. Re-measure with
 * `npm run paces` if the generator or the rules change; the level tests check every pace.
 */
const ESCORTS: readonly { seed: number; name: string; pace: number; day: number }[] = [
  { seed: 3012, name: 'Stone on the Move', pace: 69, day: 110 },
  { seed: 3009, name: 'The Slow Road Home', pace: 74, day: 120 },
  { seed: 3006, name: 'Heavy Going', pace: 79, day: 125 },
  { seed: 3020, name: 'A Weight on the Lawn', pace: 83, day: 135 },
  { seed: 3008, name: 'The Crawling Stone', pace: 87, day: 140 },
  { seed: 3016, name: 'Hold Fast', pace: 112, day: 180 },
  { seed: 3004, name: 'Ambush Alley', pace: 118, day: 190 },
  { seed: 3002, name: 'Every Pair of Hands', pace: 128, day: 205 },
  { seed: 3018, name: 'The Long Haul', pace: 137, day: 220 },
  { seed: 3022, name: 'Through the Thick of It', pace: 151, day: 240 },
  { seed: 3005, name: 'No Rest on the Way', pace: 169, day: 270 },
  { seed: 3019, name: 'The Last Lodestone', pace: 126, day: 305 },
];

/** Two of the longest fields grant sprays to start with, by seed: a little help. */
const GRANTED: Readonly<Record<number, { emberbrew: number; stillwater: number }>> = {
  3005: { emberbrew: 1, stillwater: 1 },
  3019: { emberbrew: 2, stillwater: 1 },
};

// Easiest first, by pace, numbered in that order.
const FIELDS: FieldSpec[] = [...ESCORTS]
  .sort((a, b) => a.pace - b.pace)
  .map(({ seed, name, pace, day }, i) => ({
    ...generateField(seed, 'escort', `route-${i + 1}`),
    name,
    pace,
    // Written down, not worked out from the pace: measuring again must never move the day.
    dayLength: day,
    ...(GRANTED[seed] ? { items: GRANTED[seed] } : {}),
  }));

export const ESCORT_FIELDS = challengeFields('escort', FIELDS);
