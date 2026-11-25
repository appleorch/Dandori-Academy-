import { moveAgent } from '../navigation/steering';
import type { Simulation } from '../simulation/Simulation';

/** How fast a belt carries what is on it, in units a second. */
export const CONVEYOR_SPEED = 3;

/**
 * Conveyor belts: every haul on one is carried along it (with its crew), and so is every
 * Sproutling standing or walking on one. A belt never carries a Sproutling in the air, one
 * clinging to a beast, or a sprout in the ground; the Warden keeps their feet.
 */
export function updateConveyors(sim: Simulation, dt: number): void {
  const belts = sim.level.conveyors;
  if (!belts || belts.length === 0) return;
  const on = (x: number, z: number) =>
    belts.find((belt) => Math.abs(x - belt.x) <= belt.w / 2 && Math.abs(z - belt.z) <= belt.d / 2);
  for (const [entity] of sim.carryables.entries()) {
    const at = sim.transforms.require(entity);
    const belt = on(at.x, at.z);
    if (belt) moveAgent(sim.nav, at, belt.dx * CONVEYOR_SPEED * dt, belt.dz * CONVEYOR_SPEED * dt);
  }
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state === 'thrown' || worker.state === 'attacking' || worker.state === 'planted')
      continue;
    if (worker.state === 'carrying') continue;
    const at = sim.transforms.require(entity);
    const belt = on(at.x, at.z);
    if (belt) moveAgent(sim.nav, at, belt.dx * CONVEYOR_SPEED * dt, belt.dz * CONVEYOR_SPEED * dt);
  }
}
