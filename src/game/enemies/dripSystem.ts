import type { Simulation } from '../simulation/Simulation';
import { spawnHazard } from '../world/spawn';

/** Drops a dewdrop at each drip spot whenever its period comes round. */
export function updateDrips(sim: Simulation): void {
  const now = sim.elapsed;
  const before = sim.previousElapsed;
  for (const drip of sim.level.drips ?? []) {
    if (now < drip.offset) continue;
    const cycle = Math.floor((now - drip.offset) / drip.period);
    const previous = before < drip.offset ? -1 : Math.floor((before - drip.offset) / drip.period);
    if (cycle > previous) spawnHazard(sim, 'drip', drip, drip);
  }
}
