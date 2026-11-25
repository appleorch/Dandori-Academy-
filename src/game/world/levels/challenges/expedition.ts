import { generateDive } from '../../generator';
import { challengeFields, type FieldSpec } from './field';

/**
 * Expedition fields: each a small field over two or three floors of caves, made by the field
 * kit's generator from its seed (`generateDive`) and dived to the bottom by the test player
 * (`world/diveBot.ts`). Its pace is the test player's headcount at the end, which is Platinum.
 * Easiest first. Re-measure with `npm run paces` if the generator or the rules change.
 */
const DIVES: readonly { seed: number; name: string; pace: number }[] = [
  { seed: 4018, name: 'The First Stair', pace: 40 },
  { seed: 4014, name: 'Down by the Roots', pace: 35 },
  { seed: 4002, name: 'Two Floors Down', pace: 42 },
  { seed: 4011, name: 'Under the Lawn', pace: 48 },
  { seed: 4013, name: 'The Cellar Steps', pace: 38 },
  { seed: 4016, name: 'Lantern Shaft', pace: 50 },
  { seed: 4003, name: 'Three Floors Deep', pace: 46 },
  { seed: 4015, name: 'The Dripping Stair', pace: 41 },
  { seed: 4004, name: 'Echo Hollow', pace: 46 },
  { seed: 4012, name: 'The Long Descent', pace: 55 },
  { seed: 4022, name: 'Beneath the Beneath', pace: 56 },
  { seed: 4005, name: 'The Deepest Dark', pace: 62 },
];

const FIELDS: FieldSpec[] = DIVES.map(({ seed, name, pace }, i) => ({
  ...generateDive(seed, `dive-${i + 1}`),
  name,
  pace,
}));

export const EXPEDITION_FIELDS = challengeFields('expedition', FIELDS);
