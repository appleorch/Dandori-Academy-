import { damageCaptain } from '../captain/captainSystem';
import type { Hazard } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { killWorker, setIdle } from '../workers/squad';
import { HARD } from '../core/difficulty';
import { HAZARDS, type HazardKind } from './enemyKinds';
import { PERIL_SECONDS } from '../core/config';
import type { SimEventType } from '../simulation/events';

/** What a hazard sounds like when it lands. */
const LANDING_EVENT: Record<HazardKind, SimEventType> = {
  glob: 'splat',
  pebble: 'slam',
  drip: 'splash',
  slam: 'slam',
  stomp: 'slam',
  flame: 'flare',
  arc: 'zap',
};

/** Resolves a hazard where it lands: kills up to its limit, stuns the rest, hurts the captain. */
function land(sim: Simulation, hazard: Hazard): void {
  const spec = HAZARDS[hazard.kind];
  const kills = hazard.kind === 'drip' && sim.hard ? HARD.dripKills : spec.kills;
  let killed = 0;
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state === 'thrown' || worker.state === 'attacking' || worker.state === 'planted')
      continue;
    if (spec.spares === worker.kind) continue;
    const at = sim.transforms.require(entity);
    if (Math.hypot(at.x - hazard.toX, at.z - hazard.toZ) > hazard.radius) continue;
    if (spec.ignites) {
      if (worker.peril !== 'fire') {
        setIdle(sim, entity, worker);
        worker.peril = 'fire';
        worker.perilTime = PERIL_SECONDS;
        worker.scan = 0;
        sim.emit('ignite', at.x, at.z);
      }
      continue;
    }
    if (killed < kills) {
      killWorker(sim, entity, worker);
      killed++;
    } else if (spec.stun > 0) {
      setIdle(sim, entity, worker);
      worker.stun = spec.stun;
    }
  }
  const captain = sim.captainTransform;
  if (
    spec.hurtsCaptain &&
    Math.hypot(captain.x - hazard.toX, captain.z - hazard.toZ) <= hazard.radius
  ) {
    damageCaptain(sim, hazard.toX, hazard.toZ);
  }
  sim.emit(LANDING_EVENT[hazard.kind], hazard.toX, hazard.toZ);
}

/** Moves every hazard along its path and resolves the ones that arrive. */
export function updateHazards(sim: Simulation, dt: number): void {
  for (const [entity, hazard] of sim.hazards.entries()) {
    hazard.time += dt;
    const spec = HAZARDS[hazard.kind];
    const u = Math.max(0, Math.min(1, hazard.time / hazard.duration));
    const at = sim.transforms.require(entity);
    at.x = hazard.fromX + (hazard.toX - hazard.fromX) * u;
    at.z = hazard.fromZ + (hazard.toZ - hazard.fromZ) * u;
    at.y = spec.drop > 0 ? spec.drop * (1 - u * u) : 1 + 4 * spec.arc * u * (1 - u);
    if (hazard.time >= hazard.duration) {
      land(sim, hazard);
      sim.ecs.destroy(entity);
      sim.entityVersion++;
    }
  }
}
