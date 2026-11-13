import { WORKER } from '../core/config';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import type { Enemy, Worker } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';

function removeFrom(list: Entity[], entity: Entity): void {
  const index = list.indexOf(entity);
  if (index >= 0) list.splice(index, 1);
}

/** Frees a worker from whatever it is assigned to and puts it back on walkable ground. */
export function detachWorker(sim: Simulation, entity: Entity, worker: Worker): void {
  const carryable = sim.carryables.get(worker.target);
  if (carryable) {
    removeFrom(carryable.claimed, entity);
    removeFrom(carryable.carriers, entity);
  }
  const enemy = sim.enemies.get(worker.target);
  if (enemy) removeFrom(enemy.latched, entity);
  worker.target = NO_ENTITY;

  const transform = sim.transforms.require(entity);
  const ground = sim.nav.nearestWalkable(transform.x, transform.z);
  transform.x = ground.x;
  transform.z = ground.z;
  transform.y = 0;
}

/** Makes a worker idle. It looks for nearby work again after `scanDelay` seconds. */
export function setIdle(sim: Simulation, entity: Entity, worker: Worker, scanDelay = 0): void {
  detachWorker(sim, entity, worker);
  worker.state = 'idle';
  worker.scan = scanDelay;
}

/** Calls a worker to the squad. A dazed worker snaps out of it almost at once. */
export function joinSquad(sim: Simulation, entity: Entity, worker: Worker): void {
  detachWorker(sim, entity, worker);
  worker.state = 'follow';
  worker.stun = Math.min(worker.stun, 0.2);
}

/** Sends every squad member off duty; they pick up nearby work on their own. */
export function dismissSquad(sim: Simulation): void {
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state === 'follow') setIdle(sim, entity, worker);
  }
  sim.emit('dismiss', sim.captainTransform.x, sim.captainTransform.z);
}

/** Orders the whole squad to run to the cursor and take on whatever is there. */
export function rushSquad(sim: Simulation): void {
  let sent = false;
  for (const [, worker] of sim.workers.entries()) {
    if (worker.state !== 'follow' || worker.stun > 0) continue;
    const spot = sim.nav.nearestWalkable(
      sim.cursor.x + sim.rng.range(-0.8, 0.8),
      sim.cursor.z + sim.rng.range(-0.8, 0.8),
    );
    worker.state = 'rush';
    worker.rushX = spot.x;
    worker.rushZ = spot.z;
    worker.rushTime = WORKER.rushTimeout;
    worker.scan = 0;
    sent = true;
  }
  if (sent) sim.emit('rush', sim.captainTransform.x, sim.captainTransform.z);
}

/** Assigns a worker to haul or attack `target`, whichever kind of entity it is. */
export function assignTask(sim: Simulation, entity: Entity, worker: Worker, target: Entity): void {
  const carryable = sim.carryables.get(target);
  if (carryable) {
    carryable.claimed.push(entity);
    worker.state = 'toCarry';
  } else {
    worker.state = 'toAttack';
  }
  worker.target = target;
}

/** Attaches a worker to an enemy's back, where it deals damage and cannot be bitten. */
export function latchOn(
  sim: Simulation,
  entity: Entity,
  worker: Worker,
  enemyEntity: Entity,
  enemy: Enemy,
): void {
  const transform = sim.transforms.require(entity);
  const enemyTransform = sim.transforms.require(enemyEntity);
  worker.state = 'attacking';
  worker.target = enemyEntity;
  worker.slot = Math.atan2(transform.x - enemyTransform.x, transform.z - enemyTransform.z);
  enemy.latched.push(entity);
  sim.emit('latch', transform.x, transform.z);
}

export function killWorker(sim: Simulation, entity: Entity, worker: Worker): void {
  detachWorker(sim, entity, worker);
  const at = sim.transforms.require(entity);
  sim.emit('workerLost', at.x, at.z);
  sim.ecs.destroy(entity);
  sim.stats.workersLost++;
}

/**
 * Nearest job within range and line of sight: a haul with a free carrier slot or
 * a live enemy. Returns NO_ENTITY when there is nothing to do.
 */
export function findTask(sim: Simulation, x: number, z: number, range: number): Entity {
  let best: Entity = NO_ENTITY;
  let bestDist = range;
  for (const [entity, carryable] of sim.carryables.entries()) {
    if (carryable.claimed.length >= carryable.maxCarriers) continue;
    const at = sim.transforms.require(entity);
    const dist = Math.hypot(at.x - x, at.z - z) - carryable.radius;
    if (dist < bestDist && sim.nav.lineOfSight(x, z, at.x, at.z)) {
      best = entity;
      bestDist = dist;
    }
  }
  for (const [entity, enemy] of sim.enemies.entries()) {
    if (enemy.hp <= 0) continue;
    const at = sim.transforms.require(entity);
    const dist = Math.hypot(at.x - x, at.z - z) - enemy.radius;
    if (dist < bestDist && sim.nav.lineOfSight(x, z, at.x, at.z)) {
      best = entity;
      bestDist = dist;
    }
  }
  return best;
}
