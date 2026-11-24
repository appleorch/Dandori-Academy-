import type { Simulation } from '../simulation/Simulation';
import type { Vec } from './gamepad';

/** Half-width of the cone, in radians, that aim assist looks along. */
export const ASSIST_CONE = (18 * Math.PI) / 180;
/** Nothing closer than this to the Warden is snapped to: it would sit under their feet. */
const ASSIST_MIN = 1.2;
/** How far past the aimed point a job can still be picked up. */
const ASSIST_SLACK = 2.5;

/**
 * Aim assist for sticks: when a job lies within a narrow cone along where the stick points, the
 * cursor snaps onto it. The nearest to the line of aim wins; on a tie, the nearer one. Returns
 * the aimed point unchanged when nothing qualifies. Presentation of input only: the simulation
 * sees an ordinary cursor.
 */
export function assistAim(
  from: Vec,
  aimed: Vec,
  spots: readonly Vec[],
  reach: number,
  cone = ASSIST_CONE,
): Vec {
  const ax = aimed.x - from.x;
  const az = aimed.z - from.z;
  const aimLength = Math.hypot(ax, az);
  if (aimLength < 0.5) return aimed;
  const limit = Math.min(reach, aimLength + ASSIST_SLACK);
  let best: Vec | null = null;
  let bestAngle = cone;
  let bestDistance = Infinity;
  for (const spot of spots) {
    const sx = spot.x - from.x;
    const sz = spot.z - from.z;
    const distance = Math.hypot(sx, sz);
    if (distance < ASSIST_MIN || distance > limit) continue;
    const cos = (sx * ax + sz * az) / (distance * aimLength);
    const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
    if (angle > cone) continue;
    if (
      angle < bestAngle - 1e-6 ||
      (Math.abs(angle - bestAngle) <= 1e-6 && distance < bestDistance)
    ) {
      best = spot;
      bestAngle = angle;
      bestDistance = distance;
    }
  }
  return best ? { x: best.x, z: best.z } : aimed;
}

/** Where there is work for a thrown Sproutling: hauls still short of a full crew, and beasts, gates and knots still standing. */
export function jobSpots(sim: Simulation): Vec[] {
  const spots: Vec[] = [];
  for (const [entity, haul] of sim.carryables.entries()) {
    if (haul.claimed.length >= haul.maxCarriers) continue;
    const at = sim.transforms.get(entity);
    if (at) spots.push({ x: at.x, z: at.z });
  }
  for (const [entity, enemy] of sim.enemies.entries()) {
    if (enemy.hp <= 0) continue;
    const at = sim.transforms.get(entity);
    if (at) spots.push({ x: at.x, z: at.z });
  }
  return spots;
}
