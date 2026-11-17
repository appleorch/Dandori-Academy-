import type { Persona } from './ai';

export type Disguise = 'fedora' | 'contessa' | 'cowboy' | 'professor' | 'mossback';

export interface Player {
  name: string;
  disguise: Disguise;
  persona: Persona;
  /** Where the seat is round the table, in radians from the Warden's chair. */
  angle: number;
  /** Body colour: every Emberling is a slightly different shade of ember. */
  color: string;
  /** If true the ember on its head flares on a bluff, not on a good hand. */
  flareOnBluff?: boolean;
  /** Things it says: when folding, when betting big, when winning, when knocked out. */
  quips: { fold: readonly string[]; raise: readonly string[]; win: readonly string[]; out: string };
}

const DEGREES = Math.PI / 180;

/**
 * The regulars, clockwise from the Warden's left. They are Emberlings. They would like
 * it understood that they are not.
 */
export const PLAYERS: readonly Player[] = [
  {
    name: 'Mr. Ashford',
    disguise: 'fedora',
    persona: { tight: 0.7, aggression: 0.5, bluff: 0.15 },
    angle: 250 * DEGREES,
    color: '#e8562a',
    quips: {
      fold: ['Not this time.', 'I know when to walk.'],
      raise: ['Let us be serious.', 'I have seen enough.'],
      win: ['As expected.', 'A fair hand, fairly played.'],
      out: 'I was never here.',
    },
  },
  {
    name: 'The Contessa',
    disguise: 'contessa',
    persona: { tight: 0.4, aggression: 0.8, bluff: 0.5 },
    angle: 215 * DEGREES,
    color: '#f0703a',
    flareOnBluff: true,
    quips: {
      fold: ['How dull.', 'Take it, darling.'],
      raise: ['Do keep up, darling.', 'More. Always more.'],
      win: ['Naturally.', 'Was there ever a doubt?'],
      out: 'My carriage is waiting. Probably.',
    },
  },
  {
    name: 'Tex Cinder',
    disguise: 'cowboy',
    persona: { tight: 0.2, aggression: 0.7, bluff: 0.3 },
    angle: 180 * DEGREES,
    color: '#ff8a3a',
    quips: {
      fold: ['Aw, shucks.', 'I fold, partner.'],
      raise: ['Yee-haw!', 'Reckon I will raise.'],
      win: ['Hoo-ee!', 'Rake it in, boys.'],
      out: 'This town ain’t big enough anyhow.',
    },
  },
  {
    name: 'Professor Wick',
    disguise: 'professor',
    persona: { tight: 0.55, aggression: 0.4, bluff: 0.1 },
    angle: 145 * DEGREES,
    color: '#e0622e',
    quips: {
      fold: ['Statistically unwise.', 'The odds decline.'],
      raise: ['By my calculations...', 'A measured increase.'],
      win: ['Quod erat demonstrandum.', 'Precisely as modelled.'],
      out: 'An outlier. A mere outlier.',
    },
  },
  {
    name: 'A Normal Mossback',
    disguise: 'mossback',
    persona: { tight: 0.15, aggression: 0.15, bluff: 0.05 },
    angle: 110 * DEGREES,
    color: '#f47a34',
    quips: {
      fold: ['Moo. I mean, growl.', 'Mossbacks fold now.'],
      raise: ['Grr. More chips. Grr.', 'Normal Mossback raise.'],
      win: ['Squeak! I mean, roar.', 'Mossback happy.'],
      out: 'Going back to the... swamp. Yes.',
    },
  },
];

export const WARDEN = 'You';
export const STARTING_STACK = 1500;
/** Radius of the table top, and how far out the chairs stand. */
export const TABLE_RADIUS = 1.5;
export const SEAT_RADIUS = 2.05;
export const TABLE_TOP = 0.8;

/** Position on the floor plan for a seat angle and a distance from the table's centre. */
export function around(angle: number, radius: number): [number, number] {
  return [Math.sin(angle) * radius, Math.cos(angle) * radius];
}
