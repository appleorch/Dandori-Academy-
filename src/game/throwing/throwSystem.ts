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
  // A little scatter keeps a volley from landing on a single point.
  const landing = sim.nav.nearestWalkable(
    sim.cursor.x + sim.rng.range(-THROW.scatter, THROW.scatter),
    sim.cursor.z + sim.rng.range(-THROW.scatter, THROW.scatter),
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
}
