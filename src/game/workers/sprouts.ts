/**
 * Sproutlings: the small leaf-headed workers of the Academy. Each kind grows from a
 * different seed and is good for something the others are not. The rules for each kind
 * live here, in one table, so a capability is never spread across systems as a special case.
 */

export const SPROUT_KINDS = ['ember', 'dew', 'stone', 'spark'] as const;
export type SproutKind = (typeof SPROUT_KINDS)[number];

/** The general name, for when it does not matter which kind. */
export const SPROUTLING = 'Sproutling';
export const SPROUTLINGS = 'Sproutlings';

export interface SproutSpec {
  name: string;
  plural: string;
  /** One line on what it is for, shown in the HUD and the lesson briefings. */
  knack: string;
  /** Carriers it counts as when lifting a haul. */
  strength: number;
  /** Multipliers on attack damage per second, on the hit it lands from a throw, and on walking speed. */
  attack: number;
  impact: number;
  speed: number;
  /** How far it can be thrown, in world units: the Warden's cursor reach while this kind is chosen. */
  throwRange: number;
  /** Share of its damage that gets through a crystal gate. */
  crystal: number;
  /** What cannot hurt it. */
  fireproof: boolean;
  /** It can walk through water, carry through water, and drips do not knock it over. */
  wades: boolean;
  shockproof: boolean;
}

export const SPROUTS: Record<SproutKind, SproutSpec> = {
  ember: {
    name: 'Emberling',
    plural: 'Emberlings',
    knack: 'Fireproof, and hits hard.',
    strength: 1,
    attack: 1.5,
    impact: 1.5,
    speed: 1,
    throwRange: 10,
    crystal: 0.2,
    fireproof: true,
    wades: false,
    shockproof: false,
  },
  dew: {
    name: 'Dewling',
    plural: 'Dewlings',
    knack: 'Wades through water and shrugs off drips.',
    strength: 1,
    attack: 1,
    impact: 1,
    speed: 1,
    throwRange: 10,
    crystal: 0.2,
    fireproof: false,
    wades: true,
    shockproof: false,
  },
  stone: {
    name: 'Stoneling',
    plural: 'Stonelings',
    knack: 'Lifts like two, and the only one that cracks crystal.',
    strength: 2,
    attack: 1.2,
    impact: 3,
    speed: 0.8,
    throwRange: 8,
    crystal: 1,
    fireproof: false,
    wades: false,
    shockproof: false,
  },
  spark: {
    name: 'Sparkling',
    plural: 'Sparklings',
    knack: 'Unharmed by sparks, quick, and thrown farthest.',
    strength: 1,
    attack: 0.8,
    impact: 1,
    speed: 1.15,
    throwRange: 15,
    crystal: 0.2,
    fireproof: false,
    wades: false,
    shockproof: true,
  },
};

/** A squad's make-up: how many of each kind. Missing kinds count as none. */
export type Squad = Partial<Record<SproutKind, number>>;

/** Total Sproutlings in a squad description. */
export function squadSize(squad: Squad): number {
  return SPROUT_KINDS.reduce((sum, kind) => sum + (squad[kind] ?? 0), 0);
}

/** The kind there are most of, the first in the table on a tie; Emberlings for an empty squad. */
export function mostCommon(squad: Squad): SproutKind {
  let best: SproutKind = 'ember';
  let count = 0;
  for (const kind of SPROUT_KINDS) {
    if ((squad[kind] ?? 0) > count) {
      best = kind;
      count = squad[kind] ?? 0;
    }
  }
  return best;
}
