import { NEIGHBORS, type NavGrid } from '../navigation/NavGrid';
import { MinHeap } from './minHeap';

/**
 * Shared shortest-path field toward one goal cell. Many agents heading to the same
 * place (the squad to the captain, hauls to the Kiln) read it instead of pathing individually.
 */
export class FlowField {
  readonly dirX: Float32Array;
  readonly dirZ: Float32Array;
  readonly dist: Float32Array;
  private goal = -1;

  constructor(private readonly nav: NavGrid) {
    this.dirX = new Float32Array(nav.size);
    this.dirZ = new Float32Array(nav.size);
    this.dist = new Float32Array(nav.size);
  }

  /** Recomputes the field for a goal cell. A repeat call with the same goal is free. */
  compute(goal: number): void {
    if (goal === this.goal) return;
    this.goal = goal;
    const { nav, dist, dirX, dirZ } = this;
    const { cols } = nav;
    dist.fill(Infinity);
    dirX.fill(0);
    dirZ.fill(0);
    if (nav.blocked[goal] === 1) return;

    const open = new MinHeap();
    const settled = new Uint8Array(nav.size);
    dist[goal] = 0;
    open.push(goal, 0);
    while (open.size > 0) {
      const current = open.pop();
      if (settled[current] === 1) continue;
      settled[current] = 1;
      const cx = current % cols;
      const cz = Math.floor(current / cols);
      for (const [dx, dz] of NEIGHBORS) {
        if (!nav.canStep(cx, cz, dx, dz)) continue;
        const next = (cz + dz) * cols + cx + dx;
        const step = dx !== 0 && dz !== 0 ? Math.SQRT2 : 1;
        const nextDist = dist[current] + step;
        if (nextDist >= dist[next]) continue;
        dist[next] = nextDist;
        // The neighbour walks back toward `current`, i.e. against the expansion step.
        dirX[next] = -dx / step;
        dirZ[next] = -dz / step;
        open.push(next, nextDist);
      }
    }
  }
}
