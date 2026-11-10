import { findPath } from '../pathfinding/astar';
import type { NavGrid, Point } from './NavGrid';

const REPLAN_INTERVAL = 0.5;

/** Per-agent path cache used when the straight line to a target is blocked. */
export interface Mover {
  path: number[];
  pathIndex: number;
  goalCell: number;
  replan: number;
}

export function createMover(): Mover {
  return { path: [], pathIndex: 0, goalCell: -1, replan: 0 };
}

/** Moves a point agent, sliding along obstacles instead of stopping dead. */
export function moveAgent(nav: NavGrid, pos: Point, dx: number, dz: number): void {
  if (nav.isWalkable(pos.x + dx, pos.z + dz)) {
    pos.x += dx;
    pos.z += dz;
  } else if (nav.isWalkable(pos.x + dx, pos.z)) {
    pos.x += dx;
  } else if (nav.isWalkable(pos.x, pos.z + dz)) {
    pos.z += dz;
  }
}

/**
 * Writes the unit direction an agent should travel to reach a target into `out`.
 * Uses the straight line when clear, otherwise follows a cached A* path.
 */
export function steerTo(
  nav: NavGrid,
  mover: Mover,
  pos: Point,
  targetX: number,
  targetZ: number,
  dt: number,
  out: Point,
): void {
  let aimX = targetX;
  let aimZ = targetZ;
  mover.replan -= dt;
  if (nav.lineOfSight(pos.x, pos.z, targetX, targetZ)) {
    mover.path.length = 0;
    mover.goalCell = -1;
  } else {
    const goal = nav.cellIndexAt(targetX, targetZ);
    if (mover.replan <= 0 && (mover.path.length === 0 || goal !== mover.goalCell)) {
      mover.path = findPath(nav, nav.cellIndexAt(pos.x, pos.z), goal) ?? [];
      mover.pathIndex = 0;
      mover.goalCell = goal;
      mover.replan = REPLAN_INTERVAL;
    }
    const { path } = mover;
    if (path.length > 0) {
      // Skip ahead to the furthest waypoint that is directly reachable.
      while (
        mover.pathIndex < path.length - 1 &&
        nav.lineOfSight(
          pos.x,
          pos.z,
          nav.centerX(path[mover.pathIndex + 1]),
          nav.centerZ(path[mover.pathIndex + 1]),
        )
      ) {
        mover.pathIndex++;
      }
      aimX = nav.centerX(path[mover.pathIndex]);
      aimZ = nav.centerZ(path[mover.pathIndex]);
    }
  }
  const dx = aimX - pos.x;
  const dz = aimZ - pos.z;
  const length = Math.hypot(dx, dz);
  out.x = length > 1e-6 ? dx / length : 0;
  out.z = length > 1e-6 ? dz / length : 0;
}
