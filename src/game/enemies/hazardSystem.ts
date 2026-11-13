import { damageCaptain } from '../captain/captainSystem';
import type { Hazard } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { killWorker } from '../workers/squad';
import { ENEMY } from './enemyKinds';

const ARC_HEIGHT = 5;

function splash(sim: Simulation, hazard: Hazard): void {
  let flattened = 0;
  for (const [entity, worker] of sim.workers.entries()) {
    if (flattened >= ENEMY.splashKills) break;
    if (worker.state === 'thrown' || worker.state === 'attacking') continue;
    const at = sim.transforms.require(entity);
    if (Math.hypot(at.x - hazard.toX, at.z - hazard.toZ) <= hazard.radius) {
      killWorker(sim, entity, worker);
      flattened++;
    }
  }
  const captain = sim.captainTransform;
  if (Math.hypot(captain.x - hazard.toX, captain.z - hazard.toZ) <= hazard.radius) {
    damageCaptain(sim, hazard.toX, hazard.toZ);
  }
  sim.emit('splat', hazard.toX, hazard.toZ);
}

/** Flies every glob along its arc and resolves the ones that land. */
export function updateHazards(sim: Simulation, dt: number): void {
  for (const [entity, hazard] of sim.hazards.entries()) {
    hazard.time += dt;
    const u = Math.min(1, hazard.time / hazard.duration);
    const at = sim.transforms.require(entity);
    at.x = hazard.fromX + (hazard.toX - hazard.fromX) * u;
    at.z = hazard.fromZ + (hazard.toZ - hazard.fromZ) * u;
    at.y = 1 + 4 * ARC_HEIGHT * u * (1 - u);
    if (u >= 1) {
      splash(sim, hazard);
      sim.ecs.destroy(entity);
      sim.entityVersion++;
    }
  }
}
