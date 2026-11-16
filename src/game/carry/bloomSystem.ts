import { SIM_DT } from '../core/config';
import type { Simulation } from '../simulation/Simulation';
import { setIdle } from '../workers/squad';
import { spawnBloom } from '../world/spawn';

/** Sprouts each Glowcap at its time, and wilts any that nobody lifted in time. */
export function updateBlooms(sim: Simulation): void {
  const now = sim.elapsed;
  const blooms = sim.level.blooms ?? [];
  blooms.forEach((bloom, index) => {
    // Sprout on the one step whose time window contains the bloom's start time.
    if (now >= bloom.at && now - SIM_DT < bloom.at) {
      spawnBloom(sim, bloom, index);
      sim.emit('bloom', bloom.x, bloom.z, bloom.weight);
    }
  });
  for (const [entity, carryable] of sim.carryables.entries()) {
    if (carryable.kind !== 'bloom' || now < carryable.wiltsAt) continue;
    if (carryable.carriers.length >= carryable.weight) continue;
    for (const worker of [...carryable.claimed]) setIdle(sim, worker, sim.workers.require(worker));
    const at = sim.transforms.require(entity);
    sim.emit('wilt', at.x, at.z);
    sim.ecs.destroy(entity);
    sim.entityVersion++;
  }
}
