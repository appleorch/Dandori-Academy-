import { WORKER } from '../core/config';
import type { Entity } from '../core/ecs';
import { moveAgent } from '../navigation/steering';
import type { Transform } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';

const CELL = WORKER.separationRadius;
const buckets = new Map<number, Transform[]>();
const members: Transform[] = [];
const ids: Entity[] = [];

function key(cx: number, cz: number): number {
  return cx * 4096 + cz;
}

/**
 * Keeps walking and standing workers from stacking on one spot. Neighbours are
 * found through a spatial hash, so the cost stays linear in the crowd size.
 */
export function applySeparation(sim: Simulation): void {
  buckets.clear();
  members.length = 0;
  ids.length = 0;
  for (const [entity, worker] of sim.workers.entries()) {
    const { state } = worker;
    if (state === 'thrown' || state === 'carrying' || state === 'attacking') continue;
    const transform = sim.transforms.require(entity);
    members.push(transform);
    ids.push(entity);
    const k = key(Math.floor(transform.x / CELL), Math.floor(transform.z / CELL));
    const bucket = buckets.get(k);
    if (bucket) bucket.push(transform);
    else buckets.set(k, [transform]);
  }

  for (let i = 0; i < members.length; i++) {
    const self = members[i];
    const cx = Math.floor(self.x / CELL);
    const cz = Math.floor(self.z / CELL);
    let pushX = 0;
    let pushZ = 0;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const bucket = buckets.get(key(cx + ox, cz + oz));
        if (!bucket) continue;
        for (const other of bucket) {
          if (other === self) continue;
          let dx = self.x - other.x;
          let dz = self.z - other.z;
          let dist = Math.hypot(dx, dz);
          if (dist >= CELL) continue;
          if (dist < 1e-4) {
            // Exactly stacked: split along a direction derived from the entity id.
            dx = Math.sin(ids[i] * 2.4);
            dz = Math.cos(ids[i] * 2.4);
            dist = 1;
          }
          const strength = (CELL - Math.max(dist, 1e-4)) / dist;
          pushX += dx * strength;
          pushZ += dz * strength;
        }
      }
    }
    if (pushX !== 0 || pushZ !== 0) moveAgent(sim.nav, self, pushX * 0.5, pushZ * 0.5);
  }
}
