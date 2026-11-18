import { HAZARDS } from './enemyKinds';
import type { Simulation } from '../simulation/Simulation';
import { spawnHazard } from '../world/spawn';

/** Seconds between the stretches of hazard laid along a spark coil's arc. */
const ARC_SPACING = 1.6;

/** True the step a repeating timer with this period and offset comes round. */
function due(sim: Simulation, period: number, offset: number): boolean {
  const now = sim.elapsed;
  const before = sim.previousElapsed;
  if (now < offset) return false;
  const cycle = Math.floor((now - offset) / period);
  const previous = before < offset ? -1 : Math.floor((before - offset) / period);
  return cycle > previous;
}

/**
 * Flame vents and spark coils. Each starts its warning on its own beat: a vent's ring glows
 * and then bursts; a coil's whole span lights up and then arcs. The warning is the hazard's
 * flight time, so there is always a moment to get out of the way, or to send in the one kind
 * of Sproutling it cannot hurt.
 */
export function updateVents(sim: Simulation): void {
  for (const vent of sim.level.vents ?? []) {
    if (due(sim, vent.period, vent.offset)) spawnHazard(sim, 'flame', vent, vent);
  }
  for (const coil of sim.level.coils ?? []) {
    if (!due(sim, coil.period, coil.offset)) continue;
    const length = Math.hypot(coil.b.x - coil.a.x, coil.b.z - coil.a.z);
    const pieces = Math.max(1, Math.round(length / ARC_SPACING));
    for (let i = 0; i <= pieces; i++) {
      const t = i / pieces;
      const at = {
        x: coil.a.x + (coil.b.x - coil.a.x) * t,
        z: coil.a.z + (coil.b.z - coil.a.z) * t,
      };
      spawnHazard(sim, 'arc', at, at, HAZARDS.arc.flight);
    }
  }
}
