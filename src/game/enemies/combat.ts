import type { Entity } from '../core/ecs';
import type { Enemy, Transform } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { BEACON } from '../core/config';
import { ENEMY_SPECS } from './enemyKinds';

/** Distance from a point to an enemy's surface: its circle, or a gate's rectangle. */
export function enemyReach(enemy: Enemy, at: Transform, x: number, z: number): number {
  if (enemy.shape) {
    const dx = Math.max(0, Math.abs(x - enemy.shape.x) - enemy.shape.w / 2);
    const dz = Math.max(0, Math.abs(z - enemy.shape.z) - enemy.shape.d / 2);
    return Math.hypot(dx, dz);
  }
  return Math.hypot(at.x - x, at.z - z) - enemy.radius;
}

/** True while nothing can hurt it: a Lanternroot with a living root-knot, or a Snuffer in the dark. */
export function isShielded(sim: Simulation, entity: Entity, enemy: Enemy): boolean {
  if (enemy.kind === 'snuffer') {
    const at = sim.transforms.get(entity);
    return at !== undefined && !inBeaconLight(sim, at.x, at.z);
  }
  if (enemy.kind !== 'lanternroot') return false;
  for (const [, knot] of sim.enemies.entries()) {
    if (knot.parent === entity && knot.hp > 0) return true;
  }
  return false;
}

/** Fraction of damage that gets through right now: armour outside recovery, nothing while shielded. */
export function damageTaken(sim: Simulation, entity: Entity, enemy: Enemy): number {
  if (isShielded(sim, entity, enemy)) return 0;
  return enemy.state === 'recover' ? 1 : ENEMY_SPECS[enemy.kind].armour;
}

/** True inside the glow of any lit beacon. */
export function inBeaconLight(sim: Simulation, x: number, z: number): boolean {
  return sim.beacons.some(
    (beacon) => beacon.lit && Math.hypot(beacon.x - x, beacon.z - z) <= BEACON.glow,
  );
}

/** Whether workers should bother attacking it: alive, and not fully shielded. */
export function isTargetable(sim: Simulation, entity: Entity, enemy: Enemy): boolean {
  return enemy.hp > 0 && damageTaken(sim, entity, enemy) > 0;
}

export function damageEnemy(sim: Simulation, entity: Entity, enemy: Enemy, amount: number): void {
  enemy.hp -= amount * damageTaken(sim, entity, enemy);
}

/** Where a worker should stand to attack: the gate face nearest to it, or the enemy itself. */
export function approachPoint(
  sim: Simulation,
  enemy: Enemy,
  at: Transform,
  fromX: number,
  fromZ: number,
): { x: number; z: number } {
  const box = enemy.shape;
  if (!box) return { x: at.x, z: at.z };
  const x = Math.max(box.x - box.w / 2, Math.min(box.x + box.w / 2, fromX));
  const z = Math.max(box.z - box.d / 2, Math.min(box.z + box.d / 2, fromZ));
  const outX = Math.sign(fromX - x) * 0.6;
  const outZ = Math.sign(fromZ - z) * 0.6;
  return sim.nav.nearestWalkable(x + outX, z + outZ);
}
