import { KILN, WORKER } from '../core/config';
import type { Simulation } from '../simulation/Simulation';
import { spawnWorker } from '../world/spawn';

/** Turns queued deliveries into new workers, one at a time, up to the field cap. */
export function updateKiln(sim: Simulation, dt: number): void {
  const { kiln } = sim;
  kiln.spawnTimer = Math.max(0, kiln.spawnTimer - dt);
  if (kiln.queue.length === 0 || kiln.spawnTimer > 0 || sim.workers.size >= WORKER.maxOnField) {
    return;
  }

  const angle = sim.rng.range(0, Math.PI * 2);
  const spot = sim.nav.nearestWalkable(
    sim.hatchAt.x + Math.sin(angle) * KILN.spawnRing,
    sim.hatchAt.z + Math.cos(angle) * KILN.spawnRing,
  );
  spawnWorker(sim, spot.x, spot.z, 'idle', kiln.queue.shift());
  sim.emit('spawn', spot.x, spot.z);
  kiln.spawnTimer = KILN.spawnInterval;
}
