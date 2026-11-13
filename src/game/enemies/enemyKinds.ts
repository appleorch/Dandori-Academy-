export type EnemyKind = 'mossback' | 'ramhorn' | 'spitter';

export type EnemyAttack = 'bite' | 'charge' | 'spit';

export interface EnemySpec {
  name: string;
  attack: EnemyAttack;
  hp: number;
  radius: number;
  /** Walking speed while hunting. */
  speed: number;
  /** Distance at which it notices prey. */
  aggroRange: number;
  /** How far from home prey may be before the enemy ignores it. */
  territory: number;
  /** Telegraph time before the attack lands or launches. */
  windup: number;
  /** Time spent recovering after an attack, when it is safest to hit. */
  recover: number;
  /** Seconds of being clung to before it shakes everyone off. */
  shakeInterval: number;
  carcassWeight: number;
  carcassYield: number;
}

export const ENEMY_SPECS: Record<EnemyKind, EnemySpec> = {
  /** Slow grazer. Bites what is in front of it and eats whatever it shakes off. */
  mossback: {
    name: 'Mossback',
    attack: 'bite',
    hp: 100,
    radius: 1.1,
    speed: 3.6,
    aggroRange: 7,
    territory: 12,
    windup: 0.8,
    recover: 1.6,
    shakeInterval: 3.2,
    carcassWeight: 3,
    carcassYield: 4,
  },
  /** Charges in a straight line, trampling the squad, then stands winded. */
  ramhorn: {
    name: 'Ramhorn',
    attack: 'charge',
    hp: 140,
    radius: 1.3,
    speed: 2.6,
    aggroRange: 10,
    territory: 16,
    windup: 0.9,
    recover: 2.8,
    shakeInterval: 5,
    carcassWeight: 5,
    carcassYield: 7,
  },
  /** Fragile, but lobs globs that flatten whoever stands where they land. */
  spitter: {
    name: 'Bogspitter',
    attack: 'spit',
    hp: 60,
    radius: 0.9,
    speed: 1.6,
    aggroRange: 11,
    territory: 14,
    windup: 0.9,
    recover: 2.4,
    shakeInterval: 3.5,
    carcassWeight: 2,
    carcassYield: 3,
  },
};

/** Values shared by every enemy kind. */
export const ENEMY = {
  wanderSpeed: 1.2,
  wanderRange: 3,
  shakeStun: 1.6,
  /** Extra pause after a shake before a biter snaps at the dazed. */
  shakePause: 0.5,
  biteRange: 1.4,
  biteVictims: 3,
  chargeSpeed: 13,
  chargeTime: 1.3,
  trampleKills: 4,
  spitFlight: 1,
  splashRadius: 1.7,
  splashKills: 5,
} as const;
