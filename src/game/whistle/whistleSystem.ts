import type { InputState } from '../commands/input';
import { WHISTLE } from '../core/config';
import type { Simulation } from '../simulation/Simulation';
import { joinSquad } from '../workers/squad';

/** While whistle is held, a growing circle at the cursor calls every worker inside to the squad. */
export function updateWhistle(sim: Simulation, input: InputState, dt: number): void {
  const state = sim.captainState;
  if (!input.whistleHeld) {
    state.whistleRadius = 0;
    return;
  }
  state.whistleRadius =
    state.whistleRadius === 0
      ? WHISTLE.startRadius
      : Math.min(WHISTLE.maxRadius, state.whistleRadius + WHISTLE.growth * dt);

  for (const [entity, worker] of sim.workers.entries()) {
    // The whistle calls; it does not pluck. Sprouts in the ground wait for the Warden's hand.
    if (worker.state === 'follow' || worker.state === 'thrown' || worker.state === 'planted')
      continue;
    const at = sim.transforms.require(entity);
    if (Math.hypot(at.x - sim.cursor.x, at.z - sim.cursor.z) <= state.whistleRadius) {
      joinSquad(sim, entity, worker);
    }
  }
}
