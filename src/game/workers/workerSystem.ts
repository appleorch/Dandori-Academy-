import { SPROUT_KINDS } from './sprouts';
import { PERIL_SECONDS, THROW, WORKER } from '../core/config';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import { moveAgent, steerTo } from '../navigation/steering';
import type { Transform, Worker } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { approachPoint, damageEnemy, enemyReach } from '../enemies/combat';
import { ENEMY_SPECS } from '../enemies/enemyKinds';
import { assignTask, findTask, killWorker, latchOn, setIdle } from './squad';
import { SPROUTS, STAGE_SPEED, stageOf } from './sprouts';
import { canBeHit, onImpact } from '../enemies/beasts';
import { BREW } from '../simulation/Simulation';
import type { NavGrid } from '../navigation/NavGrid';

const LANDING_SCAN_RANGE = 2.5;
const RUSH_SCAN_INTERVAL = 0.15;
/** Rings at least this wide are the slow boss slams and stomps that workers flee on their own. */
const BIG_RING = 3;
const dir = { x: 0, z: 0 };

/**
 * The ground a worker moves on: Dewlings wade; anyone else standing in water may only use
 * the wading grid to get out of it.
 */
export function navFor(sim: Simulation, worker: Worker, at: Transform): NavGrid {
  return SPROUTS[worker.kind].wades || sim.inWater(at.x, at.z) ? sim.wadeNav : sim.nav;
}

function speedOf(sim: Simulation, worker: Worker): number {
  const brew = sim.brewTimer > 0 ? BREW.speed : 1;
  return WORKER.speed * SPROUTS[worker.kind].speed * STAGE_SPEED[stageOf(worker.growth)] * brew;
}

function walkToward(
  sim: Simulation,
  worker: Worker,
  transform: Transform,
  x: number,
  z: number,
  dt: number,
): void {
  const nav = navFor(sim, worker, transform);
  const speed = speedOf(sim, worker);
  steerTo(nav, worker.mover, transform, x, z, dt, dir);
  moveAgent(nav, transform, dir.x * speed * dt, dir.z * speed * dt);
  if (dir.x !== 0 || dir.z !== 0) transform.facing = Math.atan2(dir.x, dir.z);
}

/** Squad members gather in a loose crowd around the captain; the crowd grows with the squad. */
function follow(sim: Simulation, worker: Worker, transform: Transform, dt: number): void {
  const { nav } = sim;
  // The other Warden's squad waits round them, where they stand.
  const other = sim.otherWarden;
  if (other && worker.party !== sim.activeWarden) {
    if (Math.hypot(other.x - transform.x, other.z - transform.z) > 2.5)
      walkToward(sim, worker, transform, other.x, other.z, dt);
    return;
  }
  const { anchor } = sim;
  // Sorted: each kind gathers in its own group in an arc behind the Warden.
  if (sim.squadSorted) {
    const facing = sim.captainTransform.facing;
    const slot = SPROUT_KINDS.indexOf(worker.kind) - 1.5;
    const angle = facing + Math.PI + slot * 0.55;
    const reach = 1.6 + 0.22 * Math.sqrt(sim.squadSize);
    const gx = anchor.x + Math.sin(angle) * reach;
    const gz = anchor.z + Math.cos(angle) * reach;
    if (Math.hypot(gx - transform.x, gz - transform.z) > 0.6 + 0.12 * Math.sqrt(sim.squadSize)) {
      if (nav.lineOfSight(transform.x, transform.z, gx, gz)) {
        walkToward(sim, worker, transform, gx, gz, dt);
        return;
      }
    } else return;
  }
  const dx = anchor.x - transform.x;
  const dz = anchor.z - transform.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= 1 + 0.3 * Math.sqrt(sim.squadSize)) return;
  // Out of the water first: the squad's path field only covers dry ground.
  if (sim.inWater(transform.x, transform.z)) {
    walkToward(sim, worker, transform, anchor.x, anchor.z, dt);
    return;
  }
  if (nav.lineOfSight(transform.x, transform.z, anchor.x, anchor.z)) {
    dir.x = dx / dist;
    dir.z = dz / dist;
  } else {
    const cell = nav.cellIndexAt(transform.x, transform.z);
    dir.x = sim.squadField.dirX[cell];
    dir.z = sim.squadField.dirZ[cell];
  }
  moveAgent(nav, transform, dir.x * speedOf(sim, worker) * dt, dir.z * speedOf(sim, worker) * dt);
  worker.mover.path.length = 0;
  if (dir.x !== 0 || dir.z !== 0) transform.facing = Math.atan2(dir.x, dir.z);
}

/** A thrown worker lands: it latches onto an enemy it hits, otherwise starts the nearest job. */
function land(sim: Simulation, entity: Entity, worker: Worker, transform: Transform): void {
  transform.x = worker.throwToX;
  transform.z = worker.throwToZ;
  transform.y = 0;
  for (const [enemyEntity, enemy] of sim.enemies.entries()) {
    const at = sim.transforms.require(enemyEntity);
    if (enemy.hp > 0 && canBeHit(enemy) && enemyReach(enemy, at, transform.x, transform.z) <= 1) {
      damageEnemy(
        sim,
        enemyEntity,
        enemy,
        WORKER.impactDamage * SPROUTS[worker.kind].impact,
        worker.kind,
      );
      onImpact(sim, enemy, at, worker.kind);
      latchOn(sim, entity, worker, enemyEntity, enemy);
      return;
    }
  }
  sim.emit('land', transform.x, transform.z, 0, worker.kind);
  worker.state = 'idle';
  worker.scan = WORKER.scanInterval;
  // Thrown into water: a Dewling just gets on with it; anyone else flounders.
  if (sim.inWater(transform.x, transform.z) && !SPROUTS[worker.kind].wades) {
    worker.peril = 'water';
    worker.perilTime = PERIL_SECONDS;
    sim.emit('splash', transform.x, transform.z);
    return;
  }
  const task = findTask(sim, transform.x, transform.z, LANDING_SCAN_RANGE, worker.kind);
  if (task !== NO_ENTITY) assignTask(sim, entity, worker, task);
}

function fly(
  sim: Simulation,
  entity: Entity,
  worker: Worker,
  transform: Transform,
  dt: number,
): void {
  worker.throwTime += dt;
  const u = worker.throwTime / worker.throwDuration;
  if (u >= 1) {
    land(sim, entity, worker, transform);
    return;
  }
  transform.x = worker.throwFromX + (worker.throwToX - worker.throwFromX) * u;
  transform.z = worker.throwFromZ + (worker.throwToZ - worker.throwFromZ) * u;
  transform.y = 0.6 + 4 * THROW.arcHeight * u * (1 - u);
}

/**
 * Moves a worker out of danger it can see coming: straight out of a boss's ring, or
 * sideways out of a charger's painted lane. Returns true if it moved.
 */
function escapeHazard(sim: Simulation, transform: Transform, dt: number): boolean {
  const step = WORKER.speed * dt;
  for (const [entity, enemy] of sim.enemies.entries()) {
    const charging = enemy.state === 'windup' || enemy.state === 'charge';
    if (!charging || ENEMY_SPECS[enemy.kind].attack !== 'charge') continue;
    const spec = ENEMY_SPECS[enemy.kind];
    const at = sim.transforms.require(entity);
    const along = (transform.x - at.x) * enemy.aimX + (transform.z - at.z) * enemy.aimZ;
    const across = (transform.x - at.x) * enemy.aimZ - (transform.z - at.z) * enemy.aimX;
    if (
      along < -1 ||
      along > spec.chargeSpeed * spec.chargeTime ||
      Math.abs(across) > enemy.radius + 0.8
    ) {
      continue;
    }
    const side = across >= 0 ? 1 : -1;
    moveAgent(sim.nav, transform, enemy.aimZ * side * step, -enemy.aimX * side * step);
    return true;
  }
  for (const [, hazard] of sim.hazards.entries()) {
    // Only a boss's ground-shaking rings are big and slow enough to scramble out of;
    // globs, pebbles and drips are for the player to avoid.
    if (hazard.time < 0 || hazard.radius < BIG_RING) continue;
    const dx = transform.x - hazard.toX;
    const dz = transform.z - hazard.toZ;
    const dist = Math.hypot(dx, dz);
    if (dist > hazard.radius + 0.4) continue;
    moveAgent(
      sim.nav,
      transform,
      dist > 0.01 ? (dx / dist) * step : step,
      dist > 0.01 ? (dz / dist) * step : 0,
    );
    transform.facing = Math.atan2(dx, dz);
    return true;
  }
  return false;
}

/**
 * A Sproutling on fire runs about wildly; one out of its depth splashes where it is. Either
 * way, unless the whistle reaches it first, it is lost when the time runs out.
 */
function sufferPeril(
  sim: Simulation,
  entity: Entity,
  worker: Worker,
  transform: Transform,
  dt: number,
): void {
  worker.perilTime -= dt;
  if (worker.perilTime <= 0) {
    sim.stats.perilLosses++;
    sim.emit(
      worker.peril === 'fire' ? 'burned' : 'drowned',
      transform.x,
      transform.z,
      0,
      worker.kind,
    );
    killWorker(sim, entity, worker, worker.peril === 'fire' ? 'fire' : 'water');
    return;
  }
  if (worker.peril === 'fire') {
    // Panic: a new direction every so often, from the simulation's own random numbers.
    worker.scan -= dt;
    if (worker.scan <= 0) {
      worker.scan = 0.4;
      worker.slot = sim.rng.range(0, Math.PI * 2);
    }
    const nav = navFor(sim, worker, transform);
    const step = speedOf(sim, worker) * 0.8 * dt;
    moveAgent(nav, transform, Math.sin(worker.slot) * step, Math.cos(worker.slot) * step);
    transform.facing = worker.slot;
  }
}

/** Runs every worker's state machine for one step. */
export function updateWorkers(sim: Simulation, dt: number): void {
  let squadSize = 0;
  for (const [, worker] of sim.workers.entries())
    if (worker.state === 'follow' && worker.party === sim.activeWarden) squadSize++;
  sim.squadSize = squadSize;

  for (const [entity, worker] of sim.workers.entries()) {
    const transform = sim.transforms.require(entity);
    if (worker.state === 'thrown') {
      fly(sim, entity, worker, transform, dt);
      continue;
    }
    if (worker.peril) {
      sufferPeril(sim, entity, worker, transform, dt);
      continue;
    }
    if (worker.stun > 0) {
      worker.stun -= dt;
      continue;
    }
    switch (worker.state) {
      case 'idle': {
        // Workers off duty scramble out of a marked ring rather than wait to be flattened.
        if (escapeHazard(sim, transform, dt)) break;
        worker.scan -= dt;
        if (worker.scan > 0) break;
        worker.scan = WORKER.scanInterval;
        const task = findTask(sim, transform.x, transform.z, WORKER.scanRange, worker.kind);
        if (task !== NO_ENTITY) assignTask(sim, entity, worker, task);
        break;
      }
      case 'follow':
        // The squad trusts the Warden: it follows into danger rather than dodging by itself.
        follow(sim, worker, transform, dt);
        break;
      case 'rush': {
        worker.rushTime -= dt;
        worker.scan -= dt;
        if (worker.scan <= 0) {
          worker.scan = RUSH_SCAN_INTERVAL;
          const task = findTask(sim, transform.x, transform.z, WORKER.rushScanRange, worker.kind);
          if (task !== NO_ENTITY) {
            assignTask(sim, entity, worker, task);
            break;
          }
        }
        const arrived = Math.hypot(worker.rushX - transform.x, worker.rushZ - transform.z) < 0.7;
        if (arrived || worker.rushTime <= 0) setIdle(sim, entity, worker);
        else walkToward(sim, worker, transform, worker.rushX, worker.rushZ, dt);
        break;
      }
      case 'toCarry': {
        const carryable = sim.carryables.require(worker.target);
        const at = sim.transforms.require(worker.target);
        if (Math.hypot(at.x - transform.x, at.z - transform.z) <= carryable.radius + 0.35) {
          worker.state = 'carrying';
          carryable.carriers.push(entity);
          sim.emit('grab', at.x, at.z, 0, worker.kind);
        } else {
          walkToward(sim, worker, transform, at.x, at.z, dt);
        }
        break;
      }
      case 'toAttack': {
        const enemy = sim.enemies.get(worker.target);
        if (!enemy || enemy.hp <= 0) {
          setIdle(sim, entity, worker);
          break;
        }
        const at = sim.transforms.require(worker.target);
        if (enemyReach(enemy, at, transform.x, transform.z) <= (enemy.shape ? 0.8 : 0.2)) {
          latchOn(sim, entity, worker, worker.target, enemy);
        } else {
          const spot = approachPoint(sim, enemy, at, transform.x, transform.z);
          walkToward(sim, worker, transform, spot.x, spot.z, dt);
        }
        break;
      }
      case 'attacking':
        damageEnemy(
          sim,
          worker.target,
          sim.enemies.require(worker.target),
          WORKER.attackDps *
            SPROUTS[worker.kind].attack *
            (sim.brewTimer > 0 ? BREW.attack : 1) *
            dt,
          worker.kind,
        );
        break;
      case 'carrying':
        // Position is driven by the carry system.
        break;
      case 'planted':
        // Waits in the ground to be plucked.
        break;
    }
  }
}
