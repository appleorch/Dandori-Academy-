import { rankValue, type Rank } from '../dandori/scoring';
import { bestRank, type SaveData } from '../save/saveManager';
import { CHALLENGE_LEVELS, LEVELS } from '../world/level';
import { sectionCompletion } from '../campaign/campaign';
import { RELIC_SETS, setProgress } from '../story/relicSets';
import { recoveredRelics } from '../story/relics';

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
  /** The hat's shape (the wide brim with a cone if not said), and a cape, if any, in a colour. */
  hatStyle?: HatStyle;
  cape?: string;
  unlocked: (save: SaveData) => boolean;
}

export type HatStyle = 'brim' | 'top' | 'cap' | 'crown' | 'beret' | 'hood';

/** Fields with a challenge medal (or a lesson with an old story rank) of at least `rank`. */
function lessonsAtLeast(save: SaveData, rank: Rank): number {
  return [...LEVELS, ...CHALLENGE_LEVELS].filter((level) => {
    const earned = bestRank(save, level.id);
    return earned !== null && rankValue(earned) >= rankValue(rank);
  }).length;
}

const has = (save: SaveData, id: string): boolean => id in save.achievements;

/** Days of the daily challenge played: told by the treasure brought home on them. */
export function dailiesPlayed(save: SaveData): number {
  const days = new Set<string>();
  for (const key of save.treasuresCollected) {
    const match = /^hunt-daily-(\d{4}-\d{2}-\d{2}):/.exec(key);
    if (match) days.add(match[1]);
  }
  return days.size;
}

/** Medals of at least `rank` earned on one challenge's fields. */
export function medalsIn(save: SaveData, mode: string, rank: Rank): number {
  return CHALLENGE_LEVELS.filter((level) => {
    if (level.challenge?.mode !== mode) return false;
    const earned = bestRank(save, level.id);
    return earned !== null && rankValue(earned) >= rankValue(rank);
  }).length;
}

const battlesWon = (save: SaveData): number =>
  Object.values(save.battles).reduce((sum, record) => sum + record.won, 0);

/** The relic sets' outfits: colours and a shape each. */
const SET_LOOKS: readonly Pick<Outfit, 'suit' | 'trim' | 'hat' | 'lamp' | 'hatStyle' | 'cape'>[] = [
  { suit: '#f4efe6', trim: '#4a7ab0', hat: '#f4efe6', lamp: '#ffe8c0', hatStyle: 'top' },
  { suit: '#5a3a22', trim: '#c9a24a', hat: '#3a2414', lamp: '#ffd890', hatStyle: 'cap' },
  {
    suit: '#2a2a4a',
    trim: '#e8c15a',
    hat: '#1a1a3a',
    lamp: '#fff2a0',
    hatStyle: 'crown',
    cape: '#1a1a3a',
  },
  { suit: '#4a6a2a', trim: '#a07a4a', hat: '#c8a060', lamp: '#d8ffa0', hatStyle: 'brim' },
  { suit: '#3a2a4a', trim: '#d8d8e8', hat: '#2a1a3a', lamp: '#e8d8ff', hatStyle: 'beret' },
  {
    suit: '#2a3a2a',
    trim: '#7aff9a',
    hat: '#1a2a1a',
    lamp: '#9affb0',
    hatStyle: 'hood',
    cape: '#1a2a1a',
  },
  {
    suit: '#2a4a6a',
    trim: '#e8c15a',
    hat: '#1a2a3a',
    lamp: '#ffe8a0',
    hatStyle: 'cap',
    cape: '#8a2a1a',
  },
  {
    suit: '#d8f0ff',
    trim: '#b48cff',
    hat: '#e8f8ff',
    lamp: '#e0f0ff',
    hatStyle: 'crown',
    cape: '#b48cff',
  },
];

/** Twelve more, earned across every way to play. */
const MORE: readonly Outfit[] = [
  {
    id: 'early-riser',
    name: 'Early Riser',
    requirement: 'Play the daily challenge on three days.',
    suit: '#f0a35e',
    trim: '#fff2c8',
    hat: '#ffd27a',
    lamp: '#fff2c8',
    hatStyle: 'cap',
    unlocked: (save) => dailiesPlayed(save) >= 3,
  },
  {
    id: 'regular',
    name: 'Regular',
    requirement: 'Play the daily challenge on fourteen days.',
    suit: '#8a5a2a',
    trim: '#ffd27a',
    hat: '#5a3a1a',
    lamp: '#ffd27a',
    hatStyle: 'top',
    unlocked: (save) => dailiesPlayed(save) >= 14,
  },
  {
    id: 'escort-bronze',
    name: 'Porter',
    requirement: 'Earn a medal on four Escort fields.',
    suit: '#6a5a4a',
    trim: '#c8b090',
    hat: '#8a7a6a',
    lamp: '#ffe0b0',
    hatStyle: 'beret',
    unlocked: (save) => medalsIn(save, 'escort', 'Bronze') >= 4,
  },
  {
    id: 'escort-gold',
    name: 'Lodestone Bearer',
    requirement: 'Earn Gold or better on every Escort field.',
    suit: '#3a3a44',
    trim: '#e8c15a',
    hat: '#5a5a66',
    lamp: '#fff2a0',
    hatStyle: 'crown',
    cape: '#5a5a66',
    unlocked: (save) => medalsIn(save, 'escort', 'Gold') >= 12,
  },
  {
    id: 'hunter',
    name: 'Hunter',
    requirement: 'Earn Gold or better on six Treasure Hunt fields.',
    suit: '#3a5a3a',
    trim: '#d8b060',
    hat: '#2a4a2a',
    lamp: '#e0ffa0',
    hatStyle: 'hood',
    unlocked: (save) => medalsIn(save, 'hunt', 'Gold') >= 6,
  },
  {
    id: 'grower',
    name: 'Green Thumb',
    requirement: 'Earn Gold or better on six Growing Season fields.',
    suit: '#4a7a3a',
    trim: '#f0d070',
    hat: '#6aa04a',
    lamp: '#d8ff9a',
    hatStyle: 'brim',
    unlocked: (save) => medalsIn(save, 'growing', 'Gold') >= 6,
  },
  {
    id: 'missioner',
    name: 'Field Agent',
    requirement: 'Earn Gold or better on six Mission fields.',
    suit: '#2a2a2a',
    trim: '#c8281e',
    hat: '#1a1a1a',
    lamp: '#ff9a7a',
    hatStyle: 'beret',
    unlocked: (save) => medalsIn(save, 'mission', 'Gold') >= 6,
  },
  {
    id: 'lean',
    name: 'Ascetic',
    requirement: 'Earn Gold or better on six Lean Squad Trial fields.',
    suit: '#d8d0c0',
    trim: '#8a7a6a',
    hat: '#c0b8a8',
    lamp: '#ffffff',
    hatStyle: 'hood',
    cape: '#a89880',
    unlocked: (save) => medalsIn(save, 'trial', 'Gold') >= 6,
  },
  {
    id: 'duelist',
    name: 'Duelist',
    requirement: 'Win ten battles.',
    suit: '#6a1a2a',
    trim: '#f0c0a0',
    hat: '#4a0a1a',
    lamp: '#ffb0a0',
    hatStyle: 'top',
    cape: '#4a0a1a',
    unlocked: (save) => battlesWon(save) >= 10,
  },
  {
    id: 'clockmaker',
    name: 'Clockmaker',
    requirement: 'Bring every part of the Great Clock home.',
    suit: '#5a4636',
    trim: '#e8cf98',
    hat: '#3a2a20',
    lamp: '#fff6dc',
    hatStyle: 'top',
    cape: '#e8cf98',
    unlocked: (save) => save.campaign.ending === 'golden' || save.campaign.ending === 'late',
  },
  {
    id: 'hard-story',
    name: 'Iron Warden',
    requirement: 'Bring ten Clock parts home in a story on Hard.',
    suit: '#3a3e48',
    trim: '#ff7a3d',
    hat: '#2a2e38',
    lamp: '#ffb07a',
    hatStyle: 'crown',
    unlocked: (save) =>
      save.campaign.difficulty === 'hard' && Object.keys(save.campaign.parts).length >= 10,
  },
  {
    id: 'collector',
    name: 'Curator',
    requirement: 'Recover a hundred relics.',
    suit: '#2a2440',
    trim: '#c8a0ff',
    hat: '#3a3058',
    lamp: '#e8d8ff',
    hatStyle: 'brim',
    cape: '#c8a0ff',
    unlocked: (save) => recoveredRelics(save.treasuresCollected).size >= 100,
  },
];

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
  // One for each relic set completed (see story/relicSets.ts).
  ...RELIC_SETS.map((relicSet, i): Outfit => ({
    id: `set-${relicSet.id}`,
    name: relicSet.name,
    requirement: `Complete the ${relicSet.name} relic set.`,
    ...SET_LOOKS[i],
    unlocked: (save) => setProgress(relicSet, recoveredRelics(save.treasuresCollected)) >= 8,
  })),
  ...MORE,
];

/** The outfit to wear: the chosen one if it is unlocked, otherwise the cadet's. */
export function wornOutfit(save: SaveData, id: string): Outfit {
  const chosen = OUTFITS.find((outfit) => outfit.id === id);
  return chosen && chosen.unlocked(save) ? chosen : OUTFITS[0];
}
