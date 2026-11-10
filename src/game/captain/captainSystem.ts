import type { InputState } from '../commands/input';
import { CAPTAIN } from '../core/config';
import type { Simulation } from '../simulation/Simulation';

/** Moves the captain, clamps the cursor to command range and refreshes the squad's path field. */
export function updateCaptain(sim: Simulation, input: InputState, dt: number): void {
  const state = sim.captainState;
  const transform = sim.captainTransform;
  state.invuln = Math.max(0, state.invuln - dt);

  const length = Math.hypot(input.moveX, input.moveZ);
  if (length > 0) {
    const dirX = input.moveX / length;
    const dirZ = input.moveZ / length;
    sim.physics.moveCaptain(dirX * CAPTAIN.speed * dt, dirZ * CAPTAIN.speed * dt, transform);
    transform.facing = Math.atan2(dirX, dirZ);
  }

  const dx = input.cursorX - transform.x;
  const dz = input.cursorZ - transform.z;
  const reach = Math.hypot(dx, dz);
  const scale = reach > CAPTAIN.cursorRange ? CAPTAIN.cursorRange / reach : 1;
  sim.cursor.x = transform.x + dx * scale;
  sim.cursor.z = transform.z + dz * scale;

  const anchor = sim.nav.nearestWalkable(transform.x, transform.z);
  sim.anchor.x = anchor.x;
  sim.anchor.z = anchor.z;
  sim.squadField.compute(sim.nav.cellIndexAt(anchor.x, anchor.z));
}

/** Applies a hit to the captain unless still invulnerable from the last one. */
export function damageCaptain(sim: Simulation): void {
  const state = sim.captainState;
  if (state.invuln > 0) return;
  state.hp--;
  state.invuln = CAPTAIN.invulnTime;
  if (state.hp <= 0) sim.ended = 'captainDown';
}
