import type { InputState } from '../commands/input';
import { THROW } from '../core/config';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import type { Simulation } from '../simulation/Simulation';

/** While throw is held, launches the squad member nearest the captain at the cursor. */
export function updateThrowing(sim: Simulation, input: InputState, dt: number): void {
  const state = sim.captainState;
  state.throwCooldown = Math.max(0, state.throwCooldown - dt);
  if (!input.throwHeld || input.whistleHeld || state.throwCooldown > 0) return;

  const from = sim.captainTransform;
  let chosen: Entity = NO_ENTITY;
  let chosenDist: number = THROW.pickupRange;
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state !== 'follow' || worker.stun > 0) continue;
    const at = sim.transforms.require(entity);
    const dist = Math.hypot(at.x - from.x, at.z - from.z);
    if (dist < chosenDist) {
      chosen = entity;
      chosenDist = dist;
    }
  }
  if (chosen === NO_ENTITY) return;

  const worker = sim.workers.require(chosen);
  // Aim assist: a throw aimed near an enemy goes for the enemy itself.
  let aimX = sim.cursor.x;
  let aimZ = sim.cursor.z;
  let lockDist: number = THROW.aimAssist;
  for (const [entity, enemy] of sim.enemies.entries()) {
    const at = sim.transforms.require(entity);
    const dist = Math.hypot(at.x - sim.cursor.x, at.z - sim.cursor.z) - enemy.radius;
    if (enemy.hp > 0 && dist < lockDist) {
      lockDist = dist;
      aimX = at.x;
      aimZ = at.z;
    }
  }
  // A little scatter keeps a volley from landing on a single point.
  const landing = sim.nav.nearestWalkable(
    aimX + sim.rng.range(-THROW.scatter, THROW.scatter),
    aimZ + sim.rng.range(-THROW.scatter, THROW.scatter),
  );
  worker.state = 'thrown';
  worker.throwFromX = from.x;
  worker.throwFromZ = from.z;
  worker.throwToX = landing.x;
  worker.throwToZ = landing.z;
  worker.throwTime = 0;
  worker.throwDuration = Math.max(
    THROW.minDuration,
    Math.hypot(landing.x - from.x, landing.z - from.z) / THROW.speed,
  );
  from.facing = Math.atan2(landing.x - from.x, landing.z - from.z);
  state.throwCooldown = THROW.cooldown;
  sim.emit('throw', from.x, from.z);
}
