/** Tuning values for the simulation. Distances are world units, times are seconds. */
export const SIM_DT = 1 / 60;

export const CAPTAIN = {
  speed: 7,
  radius: 0.45,
  maxHp: 3,
  invulnTime: 2.5,
  knockback: 2.5,
  cursorRange: 10,
} as const;

export const WORKER = {
  speed: 7.5,
  maxOnField: 100,
  separationRadius: 0.6,
  scanInterval: 0.3,
  scanRange: 3.5,
  attackDps: 2,
  impactDamage: 3,
  rushTimeout: 4,
  rushScanRange: 1.8,
} as const;

export const THROW = {
  cooldown: 0.14,
  pickupRange: 3.5,
  speed: 16,
  minDuration: 0.3,
  arcHeight: 3.5,
  scatter: 0.35,
  /** A throw aimed this close to an enemy homes in on it. */
  aimAssist: 2.2,
} as const;

export const WHISTLE = {
  startRadius: 1.2,
  maxRadius: 5,
  growth: 8,
} as const;

/** Score for delivering a Sunshard, per point of weight. */
export const SHARD_VALUE_PER_WEIGHT = 100;

/** Dewglass is worth this much more per weight while intact; a crack takes it away. */
export const DEWGLASS_BONUS_PER_WEIGHT = 50;
/** Score per point of weight for a Glowcap bloom. */
export const BLOOM_VALUE_PER_WEIGHT = 150;
/** A Lodestone crawls with a minimum crew and needs up to triple its weight to run. */
export const LODESTONE = { crew: 3, baseSpeed: 1, bonusSpeed: 2.8 } as const;
export const SAP = { weight: 1, maxCarriers: 2, radius: 0.4, seconds: 30, speedUp: 1.4 } as const;
export const LOG = { weight: 2, maxCarriers: 4, radius: 0.6 } as const;
/** Twins delivered this close together earn this fraction of both values as a bonus. */
export const TWIN = { window: 10, bonus: 0.5 } as const;
/** Deliveries this close together build a chain. It is shown, never scored. */
export const CHAIN = { window: 6 } as const;

export const CARRY = {
  baseSpeed: 2.2,
  bonusSpeed: 1.6,
  deliverRange: 1.5,
} as const;

/** A pod is a light haul that is worth new workers instead of score. */
export const POD = { weight: 1, maxCarriers: 2, workerYield: 2, radius: 0.45 } as const;

export const KILN = {
  spawnInterval: 0.25,
  spawnRing: 2.2,
} as const;

/**
 * A beacon is cold until the Warden walks up to it. Lit, it takes deliveries like the
 * Kiln, and its glow strips the Snuffer's armour.
 */
export const BEACON = { lightRange: 2.4, glow: 10 } as const;

/** Seconds a Sproutling lasts on fire, or out of its depth, before it is lost unless whistled. */
export const PERIL_SECONDS = 3;
