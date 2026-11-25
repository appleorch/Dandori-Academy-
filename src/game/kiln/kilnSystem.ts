import { KILN, WORKER } from '../core/config';
import type { Simulation } from '../simulation/Simulation';
import { spawnWorker } from '../world/spawn';
import { UPGRADE_EFFECT } from '../campaign/upgrades';

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
  // In the story a new Sproutling comes up as a sprout in the ground, to be plucked.
  spawnWorker(sim, spot.x, spot.z, sim.story ? 'planted' : 'idle', kiln.queue.shift());
  sim.emit('spawn', spot.x, spot.z);
  kiln.spawnTimer =
    KILN.spawnInterval * (sim.abilities.has('kiln') ? UPGRADE_EFFECT.kilnInterval : 1);
}
