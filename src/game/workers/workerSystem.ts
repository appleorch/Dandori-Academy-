import { THROW, WORKER } from '../core/config';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import { moveAgent, steerTo } from '../navigation/steering';
import type { Transform, Worker } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { assignTask, findTask, latchOn, setIdle } from './squad';

const LANDING_SCAN_RANGE = 2.5;
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
    if (enemy.hp > 0 && Math.hypot(at.x - transform.x, at.z - transform.z) <= enemy.radius + 0.6) {
      enemy.hp -= WORKER.impactDamage;
      latchOn(sim, entity, worker, enemyEntity, enemy);
      return;
    }
  }
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
        worker.scan -= dt;
        if (worker.scan > 0) break;
        worker.scan = WORKER.scanInterval;
        const task = findTask(sim, transform.x, transform.z, WORKER.scanRange);
        if (task !== NO_ENTITY) assignTask(sim, entity, worker, task);
        break;
      }
      case 'follow':
        follow(sim, worker, transform, dt);
        break;
      case 'toCarry': {
        const carryable = sim.carryables.require(worker.target);
        const at = sim.transforms.require(worker.target);
        if (Math.hypot(at.x - transform.x, at.z - transform.z) <= carryable.radius + 0.35) {
          worker.state = 'carrying';
          carryable.carriers.push(entity);
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
        if (Math.hypot(at.x - transform.x, at.z - transform.z) <= enemy.radius + 0.2) {
          latchOn(sim, entity, worker, worker.target, enemy);
        } else {
          walkToward(sim, worker, transform, at.x, at.z, dt);
        }
        break;
      }
      case 'attacking':
        sim.enemies.require(worker.target).hp -= WORKER.attackDps * dt;
        break;
      case 'carrying':
        // Position is driven by the carry system.
        break;
    }
  }
}
