import { ENEMY, ENEMY_SPECS } from '../enemies/enemyKinds';
import type { Simulation } from '../simulation/Simulation';

/**
 * Whether a ground point is about to be hit: inside a landing ring, in front of a
 * biter that is winding up, or in a charger's lane. Presentation only: it decides
 * which workers flash, never what happens to them.
 */
export function inDanger(sim: Simulation, x: number, z: number): boolean {
  for (const [, hazard] of sim.hazards.entries()) {
    if (hazard.time >= 0 && Math.hypot(x - hazard.toX, z - hazard.toZ) <= hazard.radius)
      return true;
  }
  for (const [entity, enemy] of sim.enemies.entries()) {
    const spec = ENEMY_SPECS[enemy.kind];
    if (enemy.state !== 'windup' && enemy.state !== 'charge') continue;
    const at = sim.transforms.require(entity);
    if (spec.attack === 'bite') {
      const mouthX = at.x + Math.sin(at.facing) * enemy.radius;
      const mouthZ = at.z + Math.cos(at.facing) * enemy.radius;
      if (Math.hypot(x - mouthX, z - mouthZ) <= ENEMY.biteRange) return true;
    } else if (spec.attack === 'charge') {
      const along = (x - at.x) * enemy.aimX + (z - at.z) * enemy.aimZ;
      const across = (x - at.x) * enemy.aimZ - (z - at.z) * enemy.aimX;
      if (
        along > -1 &&
        along < spec.chargeSpeed * spec.chargeTime &&
        Math.abs(across) < enemy.radius + 0.4
      ) {
        return true;
      }
    }
  }
  return false;
}
