import type { SproutKind } from '../workers/sprouts';

export type EnemyKind =
  | 'mossback'
  | 'ramhorn'
  | 'spitter'
  | 'gate'
  | 'mound'
  | 'gravelmaw'
  | 'lanternroot'
  | 'rootknot'
  | 'bellwether'
  | 'skitter'
  | 'snuffer'
  | 'moth'
  | 'grub'
  | 'shellback'
  | 'slug'
  | 'newt'
  | 'hedgehog'
  | 'mimic'
  | 'waspnest'
  | 'sparkwasp'
  | 'galewing'
  | 'mirelord'
  | 'hollowwarden';

/**
 * How an enemy attacks. `slam` rears up over a ring on the ground; `none` is for
 * things that only take damage, like gates and root-knots.
 */
export type EnemyAttack = 'bite' | 'charge' | 'spit' | 'slam' | 'none';

export interface EnemySpec {
  name: string;
  attack: EnemyAttack;
  hp: number;
  radius: number;
  /** Walking speed while hunting; 0 for things rooted in place. */
  speed: number;
  /** Distance at which it notices prey. */
  aggroRange: number;
  /** How far from home prey may be before the enemy ignores it. */
  territory: number;
  /** Telegraph time before the attack lands or launches. */
  windup: number;
  /** Time spent recovering after an attack, when it takes full damage. */
  recover: number;
  /** Seconds of being clung to before it shakes everyone off. */
  shakeInterval: number;
  carcassWeight: number;
  carcassYield: number;
  /** Damage taken outside its recovery window, as a fraction. 1 means no armour. */
  armour: number;
  /** Health fractions at which it enters its next phase, highest first. */
  phases: readonly number[];
  /** Shown with a health bar across the top of the screen. */
  boss: boolean;
  /** Chargers only: speed, duration, workers crushed per charge, and recovery after a miss. */
  chargeSpeed: number;
  chargeTime: number;
  trampleKills: number;
  missRecover: number;
  /** Biters only: workers eaten per bite. */
  biteVictims: number;
}

const BASE = {
  armour: 1,
  phases: [],
  boss: false,
  chargeSpeed: 13,
  chargeTime: 1.3,
  trampleKills: 4,
  missRecover: 0,
  biteVictims: 3,
} as const;

const NO_ATTACK = {
  ...BASE,
  attack: 'none',
  speed: 0,
  aggroRange: 0,
  territory: 0,
  windup: 1,
  recover: 0,
  shakeInterval: Infinity,
  carcassWeight: 0,
  carcassYield: 0,
} as const;

export const ENEMY_SPECS: Record<EnemyKind, EnemySpec> = {
  /** Slow grazer. Bites what is in front of it and eats whatever it shakes off. */
  mossback: {
    ...BASE,
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
    ...BASE,
    name: 'Ramhorn',
    attack: 'charge',
    hp: 140,
    radius: 1.3,
    speed: 2.6,
    aggroRange: 10,
    territory: 16,
    windup: 0.9,
    recover: 2.8,
    missRecover: 2.8,
    shakeInterval: 5,
    carcassWeight: 5,
    carcassYield: 7,
  },
  /** Fragile, but lobs globs that flatten whoever stands where they land. */
  spitter: {
    ...BASE,
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
  /** A wall of bramble across a path. Each gate sets its own health. */
  gate: { ...NO_ATTACK, name: 'Bramble Gate', hp: 150, radius: 0 },
  /** A heap of soil with something buried in it. Idle Emberlings dig nearby mounds on their own. */
  mound: { ...NO_ATTACK, name: 'Mound', hp: 80, radius: 1 },
  /**
   * Boss. A plated grub that rears over a ring and slams it. Its plates take a
   * quarter damage; only while it lies winded after a slam does it take full damage.
   */
  gravelmaw: {
    ...BASE,
    name: 'Gravelmaw',
    attack: 'slam',
    hp: 450,
    radius: 2.4,
    speed: 2.2,
    aggroRange: 7,
    territory: 10,
    windup: 1.2,
    recover: 3.5,
    shakeInterval: 4,
    carcassWeight: 6,
    carcassYield: 12,
    armour: 0.25,
    // Then pebbles fly after every slam; then it burrows and comes up under the crowd.
    phases: [0.66, 0.33],
    boss: true,
  },
  /** Boss. A rooted bulb, shielded while any of its three root-knots lives. */
  lanternroot: {
    ...BASE,
    name: 'Lanternroot',
    attack: 'spit',
    hp: 360,
    radius: 2.2,
    speed: 0,
    aggroRange: 12,
    territory: 14,
    windup: 0.9,
    recover: 2.1,
    shakeInterval: 5,
    carcassWeight: 0,
    carcassYield: 0,
    // Then globs come in pairs; then seeds sprout Bogspitters and the knots regrow sooner.
    phases: [0.66, 0.33],
    boss: true,
  },
  /** One of the Lanternroot's knots. It withers when beaten and regrows later. */
  rootknot: { ...NO_ATTACK, name: 'Root-knot', hp: 60, radius: 0.9 },
  /** Final boss. A towering charger that tolls a bell before every run. */
  bellwether: {
    ...BASE,
    name: 'Bellwether',
    attack: 'charge',
    hp: 480,
    radius: 2,
    speed: 2.4,
    aggroRange: 11,
    territory: 14,
    windup: 1,
    recover: 5,
    missRecover: 1.2,
    shakeInterval: 5,
    carcassWeight: 10,
    carcassYield: 15,
    armour: 0.2,
    phases: [0.6, 0.25],
    boss: true,
    chargeTime: 1.6,
    trampleKills: 3,
  },
  /** Small, quick and weak cave vermin that hunts in packs. One bite takes one Emberling. */
  skitter: {
    ...BASE,
    name: 'Skitter',
    attack: 'bite',
    hp: 28,
    radius: 0.6,
    speed: 4.6,
    aggroRange: 8,
    territory: 13,
    windup: 0.55,
    recover: 1.3,
    shakeInterval: 2.6,
    carcassWeight: 1,
    carcassYield: 2,
    biteVictims: 1,
  },
  /**
   * Boss of the Undercroft. A pale, blind slammer. In the dark nothing hurts it;
   * inside the glow of a lit beacon it is merely armoured, and open while it lies winded
   * after a slam. As its health falls it snuffs the beacons around it and calls Skitters
   * out of the walls.
   */
  snuffer: {
    ...BASE,
    name: 'The Snuffer',
    attack: 'slam',
    hp: 520,
    radius: 2.2,
    speed: 2.3,
    aggroRange: 8,
    territory: 11,
    windup: 1.2,
    recover: 3,
    shakeInterval: 4,
    carcassWeight: 6,
    carcassYield: 10,
    armour: 0.3,
    phases: [0.66, 0.33],
    boss: true,
  },
  // The eight beasts with a rule of their own (see beasts.ts), and the wasps a nest sends.
  /** Flies out of walking reach: only a thrown Sproutling can hit it. Swoops and carries one off. */
  moth: {
    ...BASE,
    name: 'Pollen Moth',
    attack: 'bite',
    hp: 50,
    radius: 0.9,
    speed: 2.4,
    aggroRange: 8,
    territory: 14,
    windup: 1,
    recover: 1.5,
    shakeInterval: 3,
    carcassWeight: 2,
    carcassYield: 3,
  },
  /** Moves unseen under the ground, a ripple the only sign, and erupts under a moving haul. */
  grub: {
    ...BASE,
    name: 'Burrow Grub',
    attack: 'bite',
    hp: 90,
    radius: 1,
    speed: 2.2,
    aggroRange: 12,
    territory: 18,
    windup: 1.2,
    recover: 5,
    shakeInterval: 4,
    carcassWeight: 3,
    carcassYield: 4,
    biteVictims: 3,
  },
  /** Armoured on top; two Stoneling hits in quick succession flip it, open from below. */
  shellback: {
    ...BASE,
    name: 'Shellback Beetle',
    attack: 'bite',
    hp: 120,
    radius: 1.1,
    speed: 2.6,
    aggroRange: 7,
    territory: 12,
    windup: 0.9,
    recover: 0.8,
    shakeInterval: 3.5,
    carcassWeight: 4,
    carcassYield: 5,
    armour: 0.3,
    biteVictims: 2,
  },
  /** Asleep and harmless until noise wakes it; then a hungry biter. Beaten asleep, it never wakes. */
  slug: {
    ...BASE,
    name: 'Sleeper Slug',
    attack: 'bite',
    hp: 110,
    radius: 1.2,
    speed: 3,
    aggroRange: 8,
    territory: 14,
    windup: 0.7,
    recover: 1.4,
    shakeInterval: 3,
    carcassWeight: 3,
    carcassYield: 5,
    armour: 0.6,
    biteVictims: 4,
  },
  /** Lives in the water and hunts only in it or on its banks, where Dewlings can fight it. */
  newt: {
    ...BASE,
    name: 'Pike Newt',
    attack: 'bite',
    hp: 80,
    radius: 1,
    speed: 4,
    aggroRange: 9,
    territory: 16,
    windup: 0.6,
    recover: 1.5,
    shakeInterval: 3,
    carcassWeight: 3,
    carcassYield: 4,
    biteVictims: 2,
  },
  /** Spines hurt whoever clings on, unless it is curled up: after a charge, or knocked by a Stoneling. */
  hedgehog: {
    ...BASE,
    name: 'Thornback Hedgehog',
    attack: 'charge',
    hp: 90,
    radius: 0.9,
    speed: 2.4,
    aggroRange: 8,
    territory: 12,
    windup: 0.8,
    recover: 3,
    missRecover: 3,
    shakeInterval: 6,
    carcassWeight: 2,
    carcassYield: 3,
    chargeSpeed: 10,
    chargeTime: 0.9,
    trampleKills: 2,
  },
  /** Looks just like a Glowcap, but it twitches. Whoever comes close is bitten. */
  mimic: {
    ...BASE,
    name: 'Mimic Cap',
    attack: 'bite',
    hp: 45,
    radius: 0.7,
    speed: 3,
    aggroRange: 6,
    territory: 8,
    // Its later bites; the first is an ambush whose only warning is the twitch of its cap.
    windup: 0.6,
    recover: 1.6,
    shakeInterval: 3,
    carcassWeight: 1,
    carcassYield: 2,
    biteVictims: 2,
  },
  /** A papery nest that sends out Spark Wasps until it is broken. Sparklings are safe from them. */
  waspnest: {
    ...NO_ATTACK,
    name: 'Spark Wasp Nest',
    hp: 120,
    radius: 1.1,
    aggroRange: 10,
    carcassWeight: 2,
    carcassYield: 3,
  },
  /** Small and quick; its sting takes anyone but a Sparkling. */
  sparkwasp: {
    ...BASE,
    name: 'Spark Wasp',
    attack: 'bite',
    hp: 16,
    radius: 0.45,
    speed: 5,
    aggroRange: 9,
    territory: 14,
    windup: 0.45,
    recover: 1.2,
    shakeInterval: 2.5,
    carcassWeight: 0,
    carcassYield: 0,
    biteVictims: 1,
  } /**
   * Boss. A great moth-winged thing that circles out of reach and dives on the crowd, then lies
   * on the ground a moment, open to everyone. Later it dives twice, then calls Pollen Moths.
   */,
  galewing: {
    ...BASE,
    name: 'The Galewing',
    attack: 'bite',
    hp: 420,
    radius: 2,
    speed: 3.2,
    aggroRange: 14,
    territory: 22,
    windup: 1.4,
    recover: 4.5,
    shakeInterval: 4,
    carcassWeight: 8,
    carcassYield: 12,
    armour: 0.5,
    phases: [0.66, 0.33],
    boss: true,
  },
  /**
   * Final boss. The Academy's old clockwork Warden, wound wrong: it slams like the Gravelmaw,
   * and in each of its four phases only one kind of Sproutling truly hurts it (Stonelings,
   * then Emberlings, then Dewlings, then Sparklings), while every slam leaves behind the hazard
   * that kind alone can stand: fire, then water, then sparks.
   */
  hollowwarden: {
    ...BASE,
    name: 'The Hollow Warden',
    attack: 'slam',
    hp: 640,
    radius: 2.2,
    speed: 2.4,
    aggroRange: 10,
    territory: 14,
    windup: 1.2,
    recover: 3.2,
    shakeInterval: 4.5,
    carcassWeight: 10,
    carcassYield: 15,
    armour: 0.5,
    phases: [0.75, 0.5, 0.25],
    boss: true,
  },
  /**
   * Boss. Lord of a flooded pool: it swims, spits from the water and hunts only on the banks.
   * Later every spit comes with a wave that floors the bank; then it calls Pike Newts.
   */
  mirelord: {
    ...BASE,
    name: 'The Mire Lord',
    attack: 'spit',
    hp: 440,
    radius: 2,
    speed: 2.6,
    aggroRange: 11,
    territory: 12,
    windup: 1.1,
    recover: 3,
    shakeInterval: 4.5,
    carcassWeight: 8,
    carcassYield: 12,
    armour: 0.35,
    phases: [0.66, 0.33],
    boss: true,
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
  /** Distance at which a slammer rears up. */
  slamReach: 2,
  /** Root-knot regrowth, and how long the core stays open once every knot is down. */
  knotRegrow: 25,
  knotRegrowLate: 18,
  coreOpen: 14,
  /** Pause before a late-phase Bellwether turns and charges again. */
  rechargeWindup: 0.6,
  /** Root-knot regrowth in the Lanternroot's last phase. */
  knotRegrowLast: 12,
  /** Delay between a Lanternroot's paired globs in its late phase. */
  secondGlobDelay: 0.5,
  /** Reach of the Snuffer's breath over lit beacons, and the Skitters each breath calls. */
  snuffRange: 18,
  snuffBrood: 2,
} as const;

export type HazardKind = 'glob' | 'pebble' | 'drip' | 'slam' | 'stomp' | 'flame' | 'arc' | 'wave';

export interface HazardSpec {
  radius: number;
  /** Seconds from launch to impact. Slams and stomps use the windup instead. */
  flight: number;
  /** Most grounded workers it can kill; 0 for hazards that only stun. */
  kills: number;
  /** Stun for workers it does not kill. */
  stun: number;
  hurtsCaptain: boolean;
  /** Peak height of the projectile's arc; 0 for hazards with no projectile. */
  arc: number;
  /** Starting height of a projectile that falls straight down. */
  drop: number;
  /** The kind of Sproutling it cannot touch. */
  spares?: SproutKind;
  /** Sets workers on fire (to be whistled out) instead of killing them outright. */
  ignites?: boolean;
}

export const HAZARDS: Record<HazardKind, HazardSpec> = {
  glob: { radius: 1.7, flight: 1, kills: 5, stun: 0, hurtsCaptain: true, arc: 5, drop: 0 },
  pebble: { radius: 1.7, flight: 1, kills: 3, stun: 0, hurtsCaptain: true, arc: 4, drop: 0 },
  /** A dewdrop from overhead: it douses, knocking workers down and off their haul. */
  drip: {
    radius: 1.6,
    flight: 1.5,
    kills: 0,
    stun: 3,
    hurtsCaptain: false,
    arc: 0,
    drop: 9,
    spares: 'dew',
  },
  slam: { radius: 3.6, flight: 1.2, kills: 6, stun: 0, hurtsCaptain: true, arc: 0, drop: 0 },
  stomp: { radius: 5, flight: 1, kills: 0, stun: 1.6, hurtsCaptain: true, arc: 0, drop: 0 },
  /** A flame vent's burst: its ring glows first, then everything in it but an Emberling catches fire. */
  flame: {
    radius: 2,
    flight: 1.4,
    kills: 0,
    stun: 0,
    hurtsCaptain: true,
    arc: 0,
    drop: 0,
    spares: 'ember',
    ignites: true,
  },
  /** The Mire Lord's spit: a gout of pond water that drowns a few and floors the rest. Dewlings swim it. */
  wave: {
    radius: 2,
    flight: 1.1,
    kills: 2,
    stun: 2,
    hurtsCaptain: false,
    arc: 4,
    drop: 0,
    spares: 'dew',
  },
  /** One stretch of a spark coil's arc: anything but a Sparkling caught in it is lost at once. */
  arc: {
    radius: 1.1,
    flight: 1.2,
    kills: Infinity,
    stun: 0,
    hurtsCaptain: true,
    arc: 0,
    drop: 0,
    spares: 'spark',
  },
};
