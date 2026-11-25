import type { Entity } from '../core/ecs';
import type { Point } from '../navigation/NavGrid';
import type { Simulation } from '../simulation/Simulation';
import { joinSquad } from './squad';
import { drinkDewdrop, stageOf } from './sprouts';

/**
 * The story's growing: Dewdrops of nectar that a Sproutling drinks to grow a stage, and sprouts
 * planted in the ground by the Kiln that the Warden plucks by hand. Neither happens outside the
 * story (`Simulation.story`), so measured paces never see them.
 */

/** How close a Sproutling must come to a Dewdrop to drink it. */
const DRINK_RANGE = 0.8;
/** How far from the Warden a sprout can be plucked: far enough to work through a patch in one sweep. */
export const PLUCK_RANGE = 6;
/** Seconds between plucks while the interact key is held: a sweep through a patch. */
export const PLUCK_INTERVAL = 0.18;

/** A Dewdrop falls where a beast went down, a little to one side of its carcass. */
export function dropDewdrop(sim: Simulation, at: Point): void {
  if (!sim.story) return;
  const spot = sim.nav.nearestWalkable(at.x - 1.2, at.z + 0.6);
  sim.dewdrops.push({ x: spot.x, z: spot.z });
  sim.entityVersion++;
}

/** Any Sproutling on its feet that reaches a Dewdrop, and still has growing to do, drinks it. */
export function updateDewdrops(sim: Simulation): void {
  if (sim.dewdrops.length === 0) return;
  for (let i = sim.dewdrops.length - 1; i >= 0; i--) {
    const drop = sim.dewdrops[i];
    for (const [entity, worker] of sim.workers.entries()) {
      if (worker.state === 'thrown' || worker.state === 'planted') continue;
      if (stageOf(worker.growth) === 'bloom') continue;
      const at = sim.transforms.require(entity);
      if (Math.hypot(at.x - drop.x, at.z - drop.z) > DRINK_RANGE) continue;
      worker.growth = drinkDewdrop(worker.growth);
      sim.emit('nectar', at.x, at.z, worker.growth, worker.kind);
      sim.dewdrops.splice(i, 1);
      sim.entityVersion++;
      break;
    }
  }
}

/** Plucks the sprout nearest the Warden, if one is within `range`; it joins the squad. */
export function pluckNearest(sim: Simulation, range = PLUCK_RANGE): boolean {
  const { x, z } = sim.captainTransform;
  let best: Entity | null = null;
  let bestDist = range;
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state !== 'planted') continue;
    const at = sim.transforms.require(entity);
    const dist = Math.hypot(at.x - x, at.z - z);
    if (dist <= bestDist) {
      best = entity;
      bestDist = dist;
    }
  }
  if (best === null) return false;
  const worker = sim.workers.require(best);
  joinSquad(sim, best, worker);
  const at = sim.transforms.require(best);
  sim.emit('pluck', at.x, at.z, 0, worker.kind);
  return true;
}

/** Whether a sprout is in the Warden's reach. */
export function sproutInReach(sim: Simulation): boolean {
  const { x, z } = sim.captainTransform;
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state !== 'planted') continue;
    const at = sim.transforms.require(entity);
    if (Math.hypot(at.x - x, at.z - z) <= PLUCK_RANGE) return true;
  }
  return false;
}
