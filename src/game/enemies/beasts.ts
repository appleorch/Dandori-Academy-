import { NO_ENTITY, type Entity } from '../core/ecs';
import type { Enemy, Transform } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { killWorker, setIdle } from '../workers/squad';
import type { SproutKind } from '../workers/sprouts';
import { spawnEnemy, spawnHazard } from '../world/spawn';
import { ENEMY_SPECS, type EnemyKind, type EnemySpec } from './enemyKinds';

/**
 * The beasts with a rule of their own. Each asks the player a different question:
 *
 * - **Pollen Moth**: flies out of walking reach, so only a thrown Sproutling hits it. It swoops on
 *   a Sproutling and carries it off; hit the moth before it gets away and it lets go.
 * - **Burrow Grub**: moves unseen underground (a ripple shows where) and erupts under a moving
 *   haul. Underground nothing touches it; surfaced (after a strike, or for air every 20 seconds),
 *   it lies open for a while.
 * - **Shellback Beetle**: heavily armoured until two Stoneling hits in quick succession flip it
 *   (or a volley of four hits from anyone).
 * - **Sleeper Slug**: asleep until noise wakes it (the whistle near it, a fight nearby, or being
 *   hurt, after a moment). Beaten asleep in one volley, it never bites.
 * - **Pike Newt**: hunts only in and beside water, and moves through it.
 * - **Thornback Hedgehog**: its spines kill whoever clings on, unless it is curled up, as it is
 *   while winded after a charge or for a while after a Stoneling hits it.
 * - **Mimic Cap**: a Glowcap that twitches. Whoever comes close is bitten.
 * - **Spark Wasp Nest**: sends out Spark Wasps while anyone is near, until it is broken. Their
 *   stings cannot hurt a Sparkling.
 */

/** Special states. */
const MOTH_CARRYING = 1;
const GRUB_SURFACED = 1;
const SHELL_FLIPPED = 1;
const SLUG_WAKING = 1;
const SLUG_AWAKE = 2;
const MIMIC_REVEALED = 1;
const GALE_LANDED = 1;

const MOTH = {
  /** Height it flies at; thrown Sproutlings still reach it. */
  height: 1.6,
  swoopSpeed: 7,
  /** How close to its mark the swoop must end to catch someone. */
  catchReach: 1.6,
  /** Seconds before a catch is carried off for good, and damage that makes it let go. */
  carry: 5,
  letGo: 8,
  /** Pause between swoops. */
  rest: 4,
} as const;
/** It surfaces after striking, and for air after `breath` seconds under without a strike. */
const GRUB = { strikeReach: 0.9, surfaced: 5, breath: 20 } as const;
/** Two Stoneling hits flip it, or a volley of four hits of any kind. */
const SHELL = { flipAt: 4, stoneHit: 2, otherHit: 1, window: 3, flipped: 6 } as const;
const SLUG = { wakeDelay: 2.5, hearing: 9 } as const;
const NEWT = { bank: 2.5 } as const;
const HEDGEHOG = { spineEvery: 1.2, curl: 3 } as const;
const MIMIC = { spring: 1.6 } as const;
const NEST = { every: 7, most: 3, range: 10 } as const;

export const BEAST_KINDS: readonly EnemyKind[] = [
  'moth',
  'grub',
  'shellback',
  'slug',
  'newt',
  'hedgehog',
  'mimic',
  'waspnest',
];

/** How high a beast's body is drawn and reached: a flying moth, or wasps. */
export function flightHeight(enemy: Enemy): number {
  if (enemy.kind === 'moth') return MOTH.height;
  if (enemy.kind === 'sparkwasp') return 0.8;
  if (enemy.kind === 'galewing') return enemy.special === GALE_LANDED ? 0 : 3;
  return 0;
}

/** Whether a thrown Sproutling landing on it can hit it at all: not a grub underground. */
export function canBeHit(enemy: Enemy): boolean {
  // The guided morning's fence is not for breaking: it opens by itself.
  // Nor is a boss arena's pillar: only a charging beast cracks it.
  const style = (enemy.shape as { style?: string } | null)?.style;
  if (enemy.kind === 'gate' && (style === 'fence' || style === 'pillar')) return false;
  return !(enemy.kind === 'grub' && enemy.special !== GRUB_SURFACED);
}

/** Whether walking Sproutlings can go for it: not a moth (too high), a grub underground or a disguised mimic. */
export function walkersCanReach(enemy: Enemy): boolean {
  if (enemy.kind === 'moth') return false;
  if (enemy.kind === 'galewing') return enemy.special === GALE_LANDED;
  if (enemy.kind === 'mimic') return enemy.special === MIMIC_REVEALED;
  return canBeHit(enemy);
}

/** The share of damage a beast takes, where its own rule decides; undefined to use the usual rule. */
export function beastDamage(enemy: Enemy): number | undefined {
  switch (enemy.kind) {
    case 'grub':
      return enemy.special === GRUB_SURFACED ? 1 : 0;
    case 'shellback':
      return enemy.special === SHELL_FLIPPED ? 1 : ENEMY_SPECS.shellback.armour;
    case 'slug':
      return enemy.special !== SLUG_AWAKE ? 1 : undefined;
    case 'mimic':
      return 1;
    default:
      return undefined;
  }
}

/** Whether a beast's state is its open one, for drawing: a flipped beetle, a surfaced grub, a curled hedgehog. */
export function isOpen(enemy: Enemy): boolean {
  if (enemy.kind === 'shellback') return enemy.special === SHELL_FLIPPED;
  if (enemy.kind === 'grub') return enemy.special === GRUB_SURFACED;
  if (enemy.kind === 'hedgehog') return enemy.state === 'recover';
  return false;
}

/** Whether a beast is still in its disguise or asleep: drawn quiet, with no alert. */
export function isDormant(enemy: Enemy): boolean {
  if (enemy.kind === 'slug') return enemy.special !== SLUG_AWAKE;
  if (enemy.kind === 'mimic') return enemy.special !== MIMIC_REVEALED;
  return false;
}

/** A thrown Sproutling has hit a beast: Stonelings flip beetles and curl hedgehogs; any hit wakes or unmasks. */
export function onImpact(sim: Simulation, enemy: Enemy, at: Transform, kind: SproutKind): void {
  if (enemy.kind === 'shellback' && enemy.special !== SHELL_FLIPPED) {
    enemy.charges += kind === 'stone' ? SHELL.stoneHit : SHELL.otherHit;
    enemy.specialTimer = SHELL.window;
    if (enemy.charges >= SHELL.flipAt) {
      enemy.special = SHELL_FLIPPED;
      enemy.charges = 0;
      enemy.state = 'recover';
      enemy.timer = SHELL.flipped;
      sim.emit('crack', at.x, at.z);
    }
  }
  if (enemy.kind === 'hedgehog' && kind === 'stone' && enemy.state !== 'charge') {
    enemy.state = 'recover';
    enemy.timer = Math.max(enemy.timer, HEDGEHOG.curl);
  }
  if (enemy.kind === 'mimic' && enemy.special !== MIMIC_REVEALED) {
    enemy.special = MIMIC_REVEALED;
    enemy.state = 'recover';
    enemy.timer = 1.5;
    sim.emit('phase', at.x, at.z);
  }
}

/** Grounded Sproutlings a beast may go for (not flying, clinging on, planted or being carried). */
function* grounded(sim: Simulation): Generator<[Entity, Transform]> {
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state === 'thrown' || worker.state === 'attacking' || worker.state === 'planted')
      continue;
    if (worker.stun > 50) continue;
    yield [entity, sim.transforms.require(entity)];
  }
}

/** Whether a point is in water or within a stride of its bank. */
export function nearWater(sim: Simulation, x: number, z: number): boolean {
  if (sim.inWater(x, z)) return true;
  const r = NEWT.bank;
  return (
    sim.inWater(x + r, z) || sim.inWater(x - r, z) || sim.inWater(x, z + r) || sim.inWater(x, z - r)
  );
}

/** Flies (or burrows) straight at a point, ignoring walls; kept inside the field. */
function glide(sim: Simulation, at: Transform, x: number, z: number, speed: number, dt: number) {
  const dx = x - at.x;
  const dz = z - at.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-3) return;
  const step = Math.min(dist, speed * dt);
  at.x += (dx / dist) * step;
  at.z += (dz / dist) * step;
  at.x = Math.max(-sim.level.width / 2 + 1, Math.min(sim.level.width / 2 - 1, at.x));
  at.z = Math.max(-sim.level.depth / 2 + 1, Math.min(sim.level.depth / 2 - 1, at.z));
  at.facing = Math.atan2(dx, dz);
}

/** Lets go of whoever a moth holds, setting them down dazed where it is. */
function dropCatch(sim: Simulation, enemy: Enemy, at: Transform): void {
  const worker = sim.workers.get(enemy.prey);
  if (worker) {
    const spot = sim.nav.nearestWalkable(at.x, at.z);
    const where = sim.transforms.require(enemy.prey);
    where.x = spot.x;
    where.z = spot.z;
    where.y = 0;
    worker.stun = 1;
  }
  enemy.prey = NO_ENTITY;
  enemy.special = 0;
}

function moth(sim: Simulation, enemy: Enemy, spec: EnemySpec, at: Transform, dt: number): void {
  enemy.specialTimer -= dt;
  if (enemy.special === MOTH_CARRYING) {
    const worker = sim.workers.get(enemy.prey);
    if (!worker) {
      enemy.prey = NO_ENTITY;
      enemy.special = 0;
      return;
    }
    // Off home with its catch, unless it is hit hard enough to let go.
    glide(sim, at, enemy.homeX, enemy.homeZ + spec.territory, spec.speed, dt);
    const held = sim.transforms.require(enemy.prey);
    held.x = at.x;
    held.z = at.z;
    held.y = MOTH.height - 0.4;
    worker.stun = 99;
    if (enemy.hp < enemy.grabHp - MOTH.letGo) {
      dropCatch(sim, enemy, at);
      enemy.state = 'recover';
      enemy.timer = spec.recover;
      enemy.specialTimer = MOTH.rest;
      sim.emit('rescued', at.x, at.z);
    } else if (enemy.specialTimer <= 0) {
      killWorker(sim, enemy.prey, worker, 'eaten');
      enemy.prey = NO_ENTITY;
      enemy.special = 0;
      enemy.specialTimer = MOTH.rest;
    }
    return;
  }
  if (enemy.state === 'recover') {
    enemy.timer -= dt;
    if (enemy.timer <= 0) enemy.state = 'roam';
    return;
  }
  if (enemy.state === 'windup') {
    // The swoop: diving at the marked spot.
    glide(sim, at, enemy.targetX, enemy.targetZ, MOTH.swoopSpeed, dt);
    enemy.timer -= dt;
    if (enemy.timer > 0) return;
    let best: Entity = NO_ENTITY;
    let bestDist: number = MOTH.catchReach;
    for (const [entity, spot] of grounded(sim)) {
      const dist = Math.hypot(spot.x - at.x, spot.z - at.z);
      if (dist < bestDist) {
        best = entity;
        bestDist = dist;
      }
    }
    if (best === NO_ENTITY) {
      enemy.state = 'recover';
      enemy.timer = spec.recover;
      return;
    }
    const worker = sim.workers.require(best);
    setIdle(sim, best, worker);
    worker.stun = 99;
    enemy.prey = best;
    enemy.special = MOTH_CARRYING;
    enemy.grabHp = enemy.hp;
    enemy.specialTimer = MOTH.carry;
    enemy.state = 'roam';
    sim.emit('grab', at.x, at.z, 0, worker.kind);
    return;
  }
  // Hunting: picks the nearest grounded Sproutling in its territory and marks it.
  let mark: Transform | null = null;
  let markDist: number = spec.aggroRange;
  if (enemy.specialTimer <= 0) {
    for (const [, spot] of grounded(sim)) {
      const dist = Math.hypot(spot.x - at.x, spot.z - at.z);
      if (
        dist < markDist &&
        Math.hypot(spot.x - enemy.homeX, spot.z - enemy.homeZ) < spec.territory
      ) {
        mark = spot;
        markDist = dist;
      }
    }
  }
  enemy.alert = mark !== null;
  if (mark) {
    enemy.targetX = mark.x;
    enemy.targetZ = mark.z;
    enemy.state = 'windup';
    enemy.timer = spec.windup;
    sim.emit('chargeWindup', at.x, at.z);
  } else {
    // A lazy loop round home.
    const t = sim.tick * 0.01 + enemy.homeX;
    glide(sim, at, enemy.homeX + Math.sin(t) * 3, enemy.homeZ + Math.cos(t * 1.3) * 3, 1.2, dt);
  }
}

function grub(sim: Simulation, enemy: Enemy, spec: EnemySpec, at: Transform, dt: number): void {
  if (enemy.special === GRUB_SURFACED) {
    enemy.timer -= dt;
    if (enemy.timer <= 0) {
      // Back under: everyone clinging on falls off.
      for (const latched of [...enemy.latched]) setIdle(sim, latched, sim.workers.require(latched));
      enemy.special = 0;
      enemy.state = 'roam';
    }
    return;
  }
  // Up for air now and then, strike or no strike.
  enemy.specialTimer += dt;
  if (enemy.specialTimer >= GRUB.breath && enemy.state !== 'windup') {
    enemy.specialTimer = 0;
    enemy.special = GRUB_SURFACED;
    enemy.state = 'recover';
    enemy.timer = GRUB.surfaced;
    sim.emit('dug', at.x, at.z);
    return;
  }
  // Under the ground: after the nearest haul on the move.
  let target: Transform | null = null;
  let entity: Entity = NO_ENTITY;
  let nearest: number = spec.aggroRange;
  for (const [haul, carryable] of sim.carryables.entries()) {
    if (!carryable.moving || carryable.carriers.length === 0) continue;
    const spot = sim.transforms.require(haul);
    const dist = Math.hypot(spot.x - at.x, spot.z - at.z);
    if (dist < nearest && Math.hypot(spot.x - enemy.homeX, spot.z - enemy.homeZ) < spec.territory) {
      target = spot;
      entity = haul;
      nearest = dist;
    }
  }
  enemy.alert = target !== null;
  if (enemy.state === 'windup') {
    // It keeps under the haul as the ripple builds.
    if (target) glide(sim, at, target.x, target.z, spec.speed * 1.5, dt);
    enemy.timer -= dt;
    if (enemy.timer > 0) return;
    // Erupts: carriers right over it are taken, the rest scatter.
    let taken = 0;
    // Grounded includes carriers. Listed first, since taking one changes the world being walked.
    for (const [worker, spot] of [...grounded(sim)]) {
      if (taken >= spec.biteVictims) break;
      if (Math.hypot(spot.x - at.x, spot.z - at.z) > enemy.radius + 1) continue;
      killWorker(sim, worker, sim.workers.require(worker), 'eaten');
      taken++;
    }
    enemy.special = GRUB_SURFACED;
    enemy.state = 'recover';
    enemy.timer = GRUB.surfaced;
    enemy.specialTimer = 0;
    sim.emit('slam', at.x, at.z);
    return;
  }
  if (target) {
    enemy.targetX = target.x;
    enemy.targetZ = target.z;
    glide(sim, at, target.x, target.z, spec.speed, dt);
    const haul = sim.carryables.get(entity);
    if (haul && nearest <= haul.radius + GRUB.strikeReach) {
      enemy.state = 'windup';
      enemy.timer = spec.windup;
      sim.emit('slamWindup', at.x, at.z);
    }
  } else if (Math.hypot(enemy.homeX - at.x, enemy.homeZ - at.z) > 0.5) {
    glide(sim, at, enemy.homeX, enemy.homeZ, spec.speed * 0.5, dt);
  }
}

function slug(sim: Simulation, enemy: Enemy, at: Transform, dt: number): boolean {
  if (enemy.special === SLUG_AWAKE) return false;
  enemy.alert = false;
  enemy.shake = 0;
  if (enemy.special === SLUG_WAKING) {
    enemy.specialTimer -= dt;
    if (enemy.specialTimer <= 0) {
      enemy.special = SLUG_AWAKE;
      enemy.state = 'roam';
      sim.emit('phase', at.x, at.z);
    }
    return true;
  }
  const whistled =
    sim.captainState.whistleRadius > 0 &&
    Math.hypot(sim.cursor.x - at.x, sim.cursor.z - at.z) <
      SLUG.hearing + sim.captainState.whistleRadius;
  let fight = false;
  for (const [, other] of sim.enemies.entries()) {
    if (other === enemy || !other.alert || other.hp <= 0) continue;
    if (Math.hypot(other.homeX - at.x, other.homeZ - at.z) < SLUG.hearing) fight = true;
  }
  if (whistled || fight || enemy.hp < enemy.maxHp) {
    enemy.special = SLUG_WAKING;
    enemy.specialTimer = SLUG.wakeDelay;
  }
  return true;
}

function hedgehog(sim: Simulation, enemy: Enemy, dt: number): void {
  if (enemy.state === 'recover' || enemy.latched.length === 0) {
    enemy.specialTimer = HEDGEHOG.spineEvery;
    return;
  }
  enemy.specialTimer -= dt;
  if (enemy.specialTimer > 0) return;
  enemy.specialTimer = HEDGEHOG.spineEvery;
  const victim = enemy.latched[0];
  const at = sim.transforms.require(victim);
  sim.emit('bite', at.x, at.z);
  killWorker(sim, victim, sim.workers.require(victim), 'crushed');
}

function mimic(sim: Simulation, enemy: Enemy, at: Transform): boolean {
  if (enemy.special === MIMIC_REVEALED) return false;
  enemy.alert = false;
  const captain = sim.captainTransform;
  let close: Transform | null =
    Math.hypot(captain.x - at.x, captain.z - at.z) < MIMIC.spring ? captain : null;
  for (const [, spot] of grounded(sim)) {
    if (Math.hypot(spot.x - at.x, spot.z - at.z) < MIMIC.spring) close = spot;
  }
  if (close) {
    at.facing = Math.atan2(close.x - at.x, close.z - at.z);
    // Springs: a bite at once, then it is a plain biter.
    enemy.special = MIMIC_REVEALED;
    // An ambush: it snaps the very next moment, before anyone can cling on.
    enemy.state = 'windup';
    enemy.timer = 0.01;
    enemy.alert = true;
    sim.emit('chargeWindup', at.x, at.z);
  }
  return true;
}

function nest(sim: Simulation, entity: Entity, enemy: Enemy, at: Transform, dt: number): void {
  const captain = sim.captainTransform;
  let near = Math.hypot(captain.x - at.x, captain.z - at.z) < NEST.range;
  for (const [, spot] of grounded(sim)) {
    if (Math.hypot(spot.x - at.x, spot.z - at.z) < NEST.range) near = true;
  }
  enemy.alert = near;
  enemy.specialTimer -= dt;
  if (!near || enemy.specialTimer > 0) return;
  enemy.specialTimer = NEST.every;
  let wasps = 0;
  for (const [, other] of sim.enemies.entries())
    if (other.parent === entity && other.hp > 0) wasps++;
  if (wasps >= NEST.most) return;
  const spot = sim.nav.nearestWalkable(at.x + sim.rng.range(-1.5, 1.5), at.z + 1.6);
  spawnEnemy(sim, spot.x, spot.z, 'sparkwasp', { parent: entity });
  sim.emit('spit', at.x, at.z);
}

/**
 * Runs a beast's own rule. True when it has decided what the beast does this step, so the usual
 * hunting and attacking is skipped; false to let the usual rule run (perhaps after a tweak).
 */
export function beastBrain(
  sim: Simulation,
  entity: Entity,
  enemy: Enemy,
  spec: EnemySpec,
  at: Transform,
  dt: number,
): boolean {
  switch (enemy.kind) {
    case 'moth':
      moth(sim, enemy, spec, at, dt);
      return true;
    case 'grub':
      grub(sim, enemy, spec, at, dt);
      return true;
    case 'shellback':
      if (enemy.special !== SHELL_FLIPPED && enemy.charges > 0) {
        enemy.specialTimer -= dt;
        if (enemy.specialTimer <= 0) enemy.charges = 0;
      }
      if (enemy.special === SHELL_FLIPPED && enemy.state !== 'recover') enemy.special = 0;
      return false;
    case 'slug':
      return slug(sim, enemy, at, dt);
    case 'hedgehog':
      hedgehog(sim, enemy, dt);
      return false;
    case 'mimic':
      return mimic(sim, enemy, at);
    case 'waspnest':
      nest(sim, entity, enemy, at, dt);
      return true;
    case 'galewing':
      galewing(sim, enemy, spec, at, dt);
      return true;
    default:
      return false;
  }
}

/** Picks the nearest grounded Sproutling (or the Warden) in a flier's territory, or null. */
function markFor(sim: Simulation, enemy: Enemy, spec: EnemySpec, at: Transform): Transform | null {
  let mark: Transform | null = null;
  let markDist: number = spec.aggroRange;
  const consider = (spot: Transform) => {
    const dist = Math.hypot(spot.x - at.x, spot.z - at.z);
    if (dist >= markDist) return;
    if (Math.hypot(spot.x - enemy.homeX, spot.z - enemy.homeZ) > spec.territory) return;
    mark = spot;
    markDist = dist;
  };
  consider(sim.captainTransform);
  for (const [, spot] of grounded(sim)) consider(spot);
  return mark;
}

/** Starts a dive on a mark: the ring on the ground is where it will land. */
function beginDive(sim: Simulation, enemy: Enemy, at: Transform, mark: Transform, windup: number) {
  const spot = sim.nav.nearestWalkable(mark.x, mark.z);
  enemy.targetX = spot.x;
  enemy.targetZ = spot.z;
  enemy.state = 'windup';
  enemy.timer = windup;
  spawnHazard(sim, 'slam', spot, spot, windup);
  sim.emit('chargeWindup', at.x, at.z);
}

/**
 * The Galewing circles out of walking reach and dives on the crowd, the ring on the ground
 * showing where. After a dive it lies on the ground, open to everyone, then takes off again
 * (shaking everyone off). From its second phase it dives twice before it rests.
 */
function galewing(sim: Simulation, enemy: Enemy, spec: EnemySpec, at: Transform, dt: number) {
  if (enemy.special === GALE_LANDED) {
    enemy.alert = false;
    enemy.timer -= dt;
    if (enemy.timer <= 0) {
      for (const latched of [...enemy.latched]) setIdle(sim, latched, sim.workers.require(latched));
      enemy.special = 0;
      enemy.state = 'roam';
      sim.emit('shake', at.x, at.z);
    }
    return;
  }
  if (enemy.state === 'windup') {
    const left = Math.max(enemy.timer, dt);
    const dist = Math.hypot(enemy.targetX - at.x, enemy.targetZ - at.z);
    glide(sim, at, enemy.targetX, enemy.targetZ, dist / left, dt);
    enemy.timer -= dt;
    if (enemy.timer > 0) return;
    sim.emit('slam', at.x, at.z);
    const mark = enemy.phase > 0 && enemy.charges === 0 ? markFor(sim, enemy, spec, at) : null;
    if (mark) {
      // Straight back up and down again.
      enemy.charges = 1;
      beginDive(sim, enemy, at, mark, spec.windup * 0.7);
      return;
    }
    enemy.charges = 0;
    enemy.special = GALE_LANDED;
    enemy.state = 'recover';
    enemy.timer = spec.recover;
    return;
  }
  const mark = markFor(sim, enemy, spec, at);
  enemy.alert = mark !== null;
  if (mark) {
    enemy.targetX = mark.x;
    enemy.targetZ = mark.z;
    beginDive(sim, enemy, at, mark, spec.windup);
  } else {
    const t = sim.tick * 0.006 + enemy.homeX;
    glide(sim, at, enemy.homeX + Math.sin(t) * 6, enemy.homeZ + Math.cos(t) * 6, spec.speed, dt);
  }
}

/** A moth that dies with someone in its grip drops them. */
export function onBeastDefeated(sim: Simulation, enemy: Enemy, at: Transform): void {
  if (enemy.kind === 'moth' && enemy.prey !== NO_ENTITY) dropCatch(sim, enemy, at);
}
