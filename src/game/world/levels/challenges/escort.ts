import { dayFor, generateField } from '../../generator';
import { challengeFields, type FieldSpec } from './field';

/**
 * Escort fields: each made by the field kit's generator from its seed (see generator.ts), and
 * played through by the test player, whose time is its pace. Easiest first. Re-measure with
 * `npm run paces` if the generator or the rules change; the level tests check every pace.
 */
const ESCORTS: readonly { seed: number; name: string; pace: number }[] = [
  { seed: 3012, name: 'Stone on the Move', pace: 69 },
  { seed: 3009, name: 'The Slow Road Home', pace: 74 },
  { seed: 3006, name: 'Heavy Going', pace: 79 },
  { seed: 3020, name: 'A Weight on the Lawn', pace: 83 },
  { seed: 3008, name: 'The Crawling Stone', pace: 87 },
  { seed: 3016, name: 'Hold Fast', pace: 112 },
  { seed: 3004, name: 'Ambush Alley', pace: 118 },
  { seed: 3002, name: 'Every Pair of Hands', pace: 128 },
  { seed: 3018, name: 'The Long Haul', pace: 137 },
  { seed: 3022, name: 'Through the Thick of It', pace: 151 },
  { seed: 3005, name: 'No Rest on the Way', pace: 170 },
  { seed: 3019, name: 'The Last Lodestone', pace: 192 },
];

const FIELDS: FieldSpec[] = ESCORTS.map(({ seed, name, pace }, i) => ({
  ...generateField(seed, 'escort', `route-${i + 1}`),
  name,
  pace,
  dayLength: dayFor(pace),
}));

export const ESCORT_FIELDS = challengeFields('escort', FIELDS);
