import { rankValue, type Rank } from '../dandori/scoring';
import { bestRank, type SaveData } from '../save/saveManager';
import { CHALLENGE_LEVELS, LEVELS } from '../world/level';
import { sectionCompletion } from '../campaign/campaign';

/** One look for the Warden. Purely cosmetic; earned, never bought. */
export interface Outfit {
  id: string;
  name: string;
  /** How it is earned, shown while it is still locked. */
  requirement: string;
  suit: string;
  trim: string;
  hat: string;
  /** Colour of the hand lantern and the lamp on the pack. */
  lamp: string;
  unlocked: (save: SaveData) => boolean;
}

/** Fields with a challenge medal (or a lesson with an old story rank) of at least `rank`. */
function lessonsAtLeast(save: SaveData, rank: Rank): number {
  return [...LEVELS, ...CHALLENGE_LEVELS].filter((level) => {
    const earned = bestRank(save, level.id);
    return earned !== null && rankValue(earned) >= rankValue(rank);
  }).length;
}

const has = (save: SaveData, id: string): boolean => id in save.achievements;

export const OUTFITS: readonly Outfit[] = [
  {
    id: 'cadet',
    name: 'Cadet',
    requirement: 'Issued on the first day.',
    suit: '#2f6f8f',
    trim: '#c9a24a',
    hat: '#e8c15a',
    lamp: '#ffd890',
    unlocked: () => true,
  },
  {
    id: 'kindling',
    name: 'Kindling',
    requirement: 'Earn Gold or better on five challenge fields.',
    suit: '#9a3a22',
    trim: '#ffb347',
    hat: '#f0703a',
    lamp: '#ffb060',
    unlocked: (save) => lessonsAtLeast(save, 'Gold') >= 5,
  },
  {
    id: 'harvest',
    name: 'Harvest',
    requirement: 'Earn Gold or better on twelve challenge fields.',
    suit: '#6a5a2a',
    trim: '#e2b05a',
    hat: '#c86a2a',
    lamp: '#ffd27a',
    unlocked: (save) => lessonsAtLeast(save, 'Gold') >= 12,
  },
  {
    id: 'marsh',
    name: 'Marsh Warden',
    requirement: 'Defeat the Gravelmaw, the Lanternroot and the Bellwether.',
    suit: '#2e5a48',
    trim: '#9adcd0',
    hat: '#4a7a5a',
    lamp: '#c8ff9a',
    unlocked: (save) =>
      has(save, 'gatecrasher') && has(save, 'uprooted') && has(save, 'bell-ringer'),
  },
  {
    id: 'lamplighter',
    name: 'Lamplighter',
    requirement: 'Defeat the Snuffer.',
    suit: '#2a2c44',
    trim: '#6a8aff',
    hat: '#3a3e66',
    lamp: '#9ab8ff',
    unlocked: (save) => has(save, 'lights-on'),
  },
  {
    id: 'ironclad',
    name: 'Ironclad',
    requirement: 'Clear any lesson on Hard in Time Attack.',
    suit: '#4a4e58',
    trim: '#c8ccd4',
    hat: '#6a6e78',
    lamp: '#ffffff',
    unlocked: (save) => has(save, 'hardened'),
  },
  {
    id: 'card-shark',
    name: 'High Roller',
    requirement: 'Win every chip at a certain table.',
    suit: '#1c1c22',
    trim: '#c8281e',
    hat: '#2a1a1a',
    lamp: '#ff9a7a',
    unlocked: (save) => has(save, 'card-shark'),
  },
  {
    id: 'platinum',
    name: 'Platinum',
    requirement: 'Earn Platinum or better on thirty challenge fields.',
    suit: '#cfe8f0',
    trim: '#7fe3ff',
    hat: '#f4fbff',
    lamp: '#bff4ff',
    unlocked: (save) => lessonsAtLeast(save, 'Platinum') >= 30,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    requirement: 'Earn Diamond on five challenge fields.',
    suit: '#eef6ff',
    trim: '#b48cff',
    hat: '#ffffff',
    lamp: '#e6f6ff',
    unlocked: (save) => lessonsAtLeast(save, 'Diamond') >= 5,
  },
  // One for each story section explored to the last relic and beast.
  ...(
    [
      ['quad', 'Quadrangle', '#4a7a3a', '#e8d070', '#7ab04a', 'The Wild Quad'],
      ['orchard', 'Orchard', '#3a6a7a', '#f0b0a0', '#d8604a', 'the Sunken Orchard'],
      ['foundry', 'Foundry', '#5a3a2a', '#ffb347', '#3a3030', 'the Clockwork Foundry'],
      ['observatory', 'Stargazer', '#2a3050', '#b8f0ff', '#e8f4ff', 'the Frostglass Observatory'],
    ] as const
  ).map(([section, name, suit, trim, hat, place]): Outfit => ({
    id: `section-${section}`,
    name,
    requirement: `Find everything in ${place}: every relic home and every beast beaten.`,
    suit,
    trim,
    hat,
    lamp: trim,
    unlocked: (save) => sectionCompletion(save.campaign, section) >= 1,
  })),
];

/** The outfit to wear: the chosen one if it is unlocked, otherwise the cadet's. */
export function wornOutfit(save: SaveData, id: string): Outfit {
  const chosen = OUTFITS.find((outfit) => outfit.id === id);
  return chosen && chosen.unlocked(save) ? chosen : OUTFITS[0];
}
