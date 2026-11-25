import type { InputState } from '../commands/input';
import { CAPTAIN } from '../core/config';
import { SPROUTS } from '../workers/sprouts';
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
    const fromX = transform.x;
    const fromZ = transform.z;
    sim.physics.moveCaptain(dirX * CAPTAIN.speed * dt, dirZ * CAPTAIN.speed * dt, transform);
    // The physics world has no ledges; the nav grid does, and it has the last word.
    if (sim.nav.climbsBetween(fromX, fromZ, transform.x, transform.z)) {
      transform.x = fromX;
      transform.z = fromZ;
      sim.physics.placeCaptain(transform);
    }
    transform.facing = Math.atan2(dirX, dirZ);
  }

  const dx = input.cursorX - transform.x;
  const dz = input.cursorZ - transform.z;
  const reach = Math.hypot(dx, dz);
  // How far the cursor reaches is how far the chosen kind of Sproutling can be thrown.
  const range = SPROUTS[sim.selected].throwRange;
  const scale = reach > range ? range / reach : 1;
  sim.cursor.x = transform.x + dx * scale;
  sim.cursor.z = transform.z + dz * scale;

  const anchor = sim.nav.nearestWalkable(transform.x, transform.z);
  sim.anchor.x = anchor.x;
  sim.anchor.z = anchor.z;
  sim.squadField.compute(sim.nav.cellIndexAt(anchor.x, anchor.z));
}

/**
 * Hurts every Warden within `range` of (x, z): the one in play, and in co-op the second
 * player's too.
 */
export function hurtWardensNear(
  sim: Simulation,
  x: number,
  z: number,
  range: number,
  fromX: number,
  fromZ: number,
): void {
  const captain = sim.captainTransform;
  if (Math.hypot(captain.x - x, captain.z - z) <= range) damageCaptain(sim, fromX, fromZ);
  const partner = sim.partnerWarden;
  if (partner && Math.hypot(partner.x - x, partner.z - z) <= range) sim.hurtPartner();
}

/**
 * Applies a hit from the given point: the captain loses a heart and is knocked
 * back, unless still invulnerable from the last hit.
 */
export function damageCaptain(sim: Simulation, fromX: number, fromZ: number): void {
  const state = sim.captainState;
  if (state.invuln > 0) return;
  state.hp--;
  state.invuln = CAPTAIN.invulnTime;
  const transform = sim.captainTransform;
  const dx = transform.x - fromX;
  const dz = transform.z - fromZ;
  const dist = Math.hypot(dx, dz);
  if (dist > 1e-3) {
    const push = CAPTAIN.knockback / dist;
    sim.physics.moveCaptain(dx * push, dz * push, transform);
  }
  sim.emit('captainHurt', transform.x, transform.z);
  if (state.hp <= 0) sim.ended = 'captainDown';
}
