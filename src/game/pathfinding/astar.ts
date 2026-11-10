import { NEIGHBORS, type NavGrid } from '../navigation/NavGrid';
import { MinHeap } from './minHeap';

const SQRT2 = Math.SQRT2;

/**
 * A* over the nav grid with 8-way movement and no corner cutting.
 * Returns cell indices from start to goal inclusive, or null when unreachable.
 */
export function findPath(nav: NavGrid, start: number, goal: number): number[] | null {
  if (nav.blocked[start] === 1 || nav.blocked[goal] === 1) return null;
  if (start === goal) return [start];

  const { cols } = nav;
  const goalX = goal % cols;
  const goalZ = Math.floor(goal / cols);
  const cost = new Float32Array(nav.size).fill(Infinity);
  const cameFrom = new Int32Array(nav.size).fill(-1);
  const closed = new Uint8Array(nav.size);
  const open = new MinHeap();
  cost[start] = 0;
  open.push(start, 0);

  while (open.size > 0) {
    const current = open.pop();
    if (current === goal) {
      const path = [goal];
      for (let at = cameFrom[goal]; at !== -1; at = cameFrom[at]) path.push(at);
      return path.reverse();
    }
    if (closed[current] === 1) continue;
    closed[current] = 1;
    const cx = current % cols;
    const cz = Math.floor(current / cols);
    for (const [dx, dz] of NEIGHBORS) {
      if (!nav.canStep(cx, cz, dx, dz)) continue;
      const next = (cz + dz) * cols + cx + dx;
      const nextCost = cost[current] + (dx !== 0 && dz !== 0 ? SQRT2 : 1);
      if (nextCost >= cost[next]) continue;
      cost[next] = nextCost;
      cameFrom[next] = current;
      const hx = Math.abs(cx + dx - goalX);
      const hz = Math.abs(cz + dz - goalZ);
      open.push(next, nextCost + Math.max(hx, hz) + (SQRT2 - 1) * Math.min(hx, hz));
    }
  }
  return null;
}
