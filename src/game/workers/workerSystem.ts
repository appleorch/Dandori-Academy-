import { THROW, WORKER } from '../core/config';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import { moveAgent, steerTo } from '../navigation/steering';
import type { Transform, Worker } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { approachPoint, damageEnemy, enemyReach } from '../enemies/combat';
import { ENEMY_SPECS } from '../enemies/enemyKinds';
import { assignTask, findTask, latchOn, setIdle } from './squad';

const LANDING_SCAN_RANGE = 2.5;
const RUSH_SCAN_INTERVAL = 0.15;
/** Rings at least this wide are the slow boss slams and stomps that workers flee on their own. */
const BIG_RING = 3;
const dir = { x: 0, z: 0 };

function walkToward(
  sim: Simulation,
  worker: Worker,
  transform: Transform,
  x: number,
  z: number,
  dt: number,
): void {
  steerTo(sim.nav, worker.mover, transform, x, z, dt, dir);
  moveAgent(sim.nav, transform, dir.x * WORKER.speed * dt, dir.z * WORKER.speed * dt);
  if (dir.x !== 0 || dir.z !== 0) transform.facing = Math.atan2(dir.x, dir.z);
}

/** Squad members gather in a loose crowd around the captain; the crowd grows with the squad. */
function follow(sim: Simulation, worker: Worker, transform: Transform, dt: number): void {
  const { anchor, nav } = sim;
  const dx = anchor.x - transform.x;
  const dz = anchor.z - transform.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= 1 + 0.3 * Math.sqrt(sim.squadSize)) return;
  if (nav.lineOfSight(transform.x, transform.z, anchor.x, anchor.z)) {
    dir.x = dx / dist;
    dir.z = dz / dist;
  } else {
    const cell = nav.cellIndexAt(transform.x, transform.z);
    dir.x = sim.squadField.dirX[cell];
    dir.z = sim.squadField.dirZ[cell];
  }
  moveAgent(nav, transform, dir.x * WORKER.speed * dt, dir.z * WORKER.speed * dt);
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
    if (enemy.hp > 0 && enemyReach(enemy, at, transform.x, transform.z) <= 1) {
      damageEnemy(sim, enemyEntity, enemy, WORKER.impactDamage);
      latchOn(sim, entity, worker, enemyEntity, enemy);
      return;
    }
  }
  sim.emit('land', transform.x, transform.z);
  worker.state = 'idle';
  worker.scan = WORKER.scanInterval;
  const task = findTask(sim, transform.x, transform.z, LANDING_SCAN_RANGE);
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

/** Runs every worker's state machine for one step. */
export function updateWorkers(sim: Simulation, dt: number): void {
  let squadSize = 0;
  for (const [, worker] of sim.workers.entries()) if (worker.state === 'follow') squadSize++;
  sim.squadSize = squadSize;

  for (const [entity, worker] of sim.workers.entries()) {
    const transform = sim.transforms.require(entity);
    if (worker.state === 'thrown') {
      fly(sim, entity, worker, transform, dt);
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
        const task = findTask(sim, transform.x, transform.z, WORKER.scanRange);
        if (task !== NO_ENTITY) assignTask(sim, entity, worker, task);
        break;
      }
      case 'follow':
        if (!escapeHazard(sim, transform, dt)) follow(sim, worker, transform, dt);
        break;
      case 'rush': {
        worker.rushTime -= dt;
        worker.scan -= dt;
        if (worker.scan <= 0) {
          worker.scan = RUSH_SCAN_INTERVAL;
          const task = findTask(sim, transform.x, transform.z, WORKER.rushScanRange);
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
          sim.emit('grab', at.x, at.z);
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
        damageEnemy(sim, worker.target, sim.enemies.require(worker.target), WORKER.attackDps * dt);
        break;
      case 'carrying':
        // Position is driven by the carry system.
        break;
    }
  }
}
