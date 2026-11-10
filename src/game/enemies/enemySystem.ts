import { damageCaptain } from '../captain/captainSystem';
import { ENEMY } from '../core/config';
import type { Entity } from '../core/ecs';
import { moveAgent, steerTo } from '../navigation/steering';
import type { Enemy, Transform } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { killWorker, setIdle } from '../workers/squad';
import { spawnCarcass } from '../world/spawn';

const dir = { x: 0, z: 0 };

function walk(
  sim: Simulation,
  enemy: Enemy,
  at: Transform,
  x: number,
  z: number,
  speed: number,
  dt: number,
): void {
  steerTo(sim.nav, enemy.mover, at, x, z, dt, dir);
  moveAgent(sim.nav, at, dir.x * speed * dt, dir.z * speed * dt);
  if (dir.x !== 0 || dir.z !== 0) at.facing = Math.atan2(dir.x, dir.z);
}

/**
 * Nearest prey the enemy will go after: the captain or a worker on the ground,
 * within aggro range and inside the enemy's territory. Null when there is none.
 */
function pickPrey(sim: Simulation, enemy: Enemy, at: Transform): Transform | null {
  let best: Transform | null = null;
  let bestDist: number = ENEMY.aggroRange;
  const consider = (prey: Transform): void => {
    const dist = Math.hypot(prey.x - at.x, prey.z - at.z);
    if (dist >= bestDist) return;
    if (Math.hypot(prey.x - enemy.homeX, prey.z - enemy.homeZ) > ENEMY.territory) return;
    best = prey;
    bestDist = dist;
  };
  consider(sim.captainTransform);
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state === 'thrown' || worker.state === 'attacking') continue;
    consider(sim.transforms.require(entity));
  }
  return best;
}

/** Snaps at the ground in front of the enemy, eating workers and hurting the captain. */
function bite(sim: Simulation, enemy: Enemy, at: Transform): void {
  const mouthX = at.x + Math.sin(at.facing) * enemy.radius;
  const mouthZ = at.z + Math.cos(at.facing) * enemy.radius;
  let eaten = 0;
  for (const [entity, worker] of sim.workers.entries()) {
    if (eaten >= ENEMY.biteVictims) break;
    if (worker.state === 'thrown' || worker.state === 'attacking') continue;
    const prey = sim.transforms.require(entity);
    if (Math.hypot(prey.x - mouthX, prey.z - mouthZ) <= ENEMY.biteRange) {
      killWorker(sim, entity, worker);
      eaten++;
    }
  }
  const captain = sim.captainTransform;
  if (Math.hypot(captain.x - mouthX, captain.z - mouthZ) <= ENEMY.biteRange) damageCaptain(sim);
}

/** Throws every clinging worker to the ground nearby and leaves them dazed. */
function shakeOff(sim: Simulation, enemy: Enemy, at: Transform): void {
  for (const entity of [...enemy.latched]) {
    const worker = sim.workers.require(entity);
    const transform = sim.transforms.require(entity);
    const distance = sim.rng.range(2, 3);
    transform.x = at.x + Math.sin(worker.slot) * distance;
    transform.z = at.z + Math.cos(worker.slot) * distance;
    setIdle(sim, entity, worker);
    worker.stun = ENEMY.shakeStun;
  }
  enemy.shake = 0;
}

function defeat(sim: Simulation, entity: Entity, enemy: Enemy, at: Transform): void {
  for (const latched of [...enemy.latched]) setIdle(sim, latched, sim.workers.require(latched));
  const ground = sim.nav.nearestWalkable(at.x, at.z);
  sim.ecs.destroy(entity);
  spawnCarcass(sim, ground.x, ground.z);
  sim.stats.enemiesDefeated++;
}

function roam(sim: Simulation, enemy: Enemy, at: Transform, dt: number): void {
  const prey = pickPrey(sim, enemy, at);
  if (prey) {
    if (Math.hypot(prey.x - at.x, prey.z - at.z) <= enemy.radius + ENEMY.biteRange * 0.6) {
      at.facing = Math.atan2(prey.x - at.x, prey.z - at.z);
      enemy.state = 'windup';
      enemy.timer = ENEMY.windup;
    } else {
      walk(sim, enemy, at, prey.x, prey.z, ENEMY.speed, dt);
    }
    return;
  }
  enemy.wanderTimer -= dt;
  if (enemy.wanderTimer <= 0) {
    enemy.wanderTimer = sim.rng.range(2, 5);
    const spot = sim.nav.nearestWalkable(
      enemy.homeX + sim.rng.range(-ENEMY.wanderRange, ENEMY.wanderRange),
      enemy.homeZ + sim.rng.range(-ENEMY.wanderRange, ENEMY.wanderRange),
    );
    enemy.wanderX = spot.x;
    enemy.wanderZ = spot.z;
  }
  if (Math.hypot(enemy.wanderX - at.x, enemy.wanderZ - at.z) > 0.3) {
    walk(sim, enemy, at, enemy.wanderX, enemy.wanderZ, ENEMY.wanderSpeed, dt);
  }
}

/** Runs enemy behaviour: hunt inside the territory, bite, shake off attackers, die. */
export function updateEnemies(sim: Simulation, dt: number): void {
  for (const [entity, enemy] of sim.enemies.entries()) {
    const at = sim.transforms.require(entity);
    if (enemy.hp <= 0) {
      defeat(sim, entity, enemy, at);
      continue;
    }
    if (enemy.latched.length > 0) {
      enemy.shake += dt;
      if (enemy.shake >= ENEMY.shakeInterval) shakeOff(sim, enemy, at);
    } else {
      enemy.shake = 0;
    }

    if (enemy.state === 'roam') {
      roam(sim, enemy, at, dt);
    } else {
      enemy.timer -= dt;
      if (enemy.timer <= 0) {
        if (enemy.state === 'windup') {
          bite(sim, enemy, at);
          enemy.state = 'recover';
          enemy.timer = ENEMY.recover;
        } else {
          enemy.state = 'roam';
        }
      }
    }

    for (const latched of enemy.latched) {
      const worker = sim.workers.require(latched);
      const transform = sim.transforms.require(latched);
      transform.x = at.x + Math.sin(worker.slot) * enemy.radius * 0.7;
      transform.z = at.z + Math.cos(worker.slot) * enemy.radius * 0.7;
      transform.y = 0.55;
    }
  }
}
