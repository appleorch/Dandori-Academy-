/** Axis-aligned obstacle footprint: centre plus full width (x) and depth (z). */
export interface Box {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Point {
  x: number;
  z: number;
}

/** The eight neighbour offsets, orthogonals first. */
export const NEIGHBORS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Uniform walkability grid centred on the world origin. Obstacles are inflated by
 * the agent radius, so agents can be treated as points.
 */
export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  readonly minX: number;
  readonly minZ: number;
  readonly blocked: Uint8Array;

  constructor(width: number, depth: number, obstacles: readonly Box[], agentRadius = 0.45) {
    this.cols = Math.ceil(width);
    this.rows = Math.ceil(depth);
    this.minX = -width / 2;
    this.minZ = -depth / 2;
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let cz = 0; cz < this.rows; cz++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const x = this.minX + cx + 0.5;
        const z = this.minZ + cz + 0.5;
        for (const box of obstacles) {
          if (
            Math.abs(x - box.x) < box.w / 2 + agentRadius &&
            Math.abs(z - box.z) < box.d / 2 + agentRadius
          ) {
            this.blocked[cz * this.cols + cx] = 1;
            break;
          }
        }
      }
    }
  }

  get size(): number {
    return this.blocked.length;
  }

  isBlockedCell(cx: number, cz: number): boolean {
    if (cx < 0 || cz < 0 || cx >= this.cols || cz >= this.rows) return true;
    return this.blocked[cz * this.cols + cx] === 1;
  }

  /** A diagonal step is only legal when both adjacent orthogonal cells are free. */
  canStep(cx: number, cz: number, dx: number, dz: number): boolean {
    if (this.isBlockedCell(cx + dx, cz + dz)) return false;
    if (dx !== 0 && dz !== 0) {
      return !this.isBlockedCell(cx + dx, cz) && !this.isBlockedCell(cx, cz + dz);
    }
    return true;
  }

  isWalkable(x: number, z: number): boolean {
    return !this.isBlockedCell(Math.floor(x - this.minX), Math.floor(z - this.minZ));
  }

  /** Index of the cell containing the point, clamped into the grid. */
  cellIndexAt(x: number, z: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(x - this.minX)));
    const cz = Math.min(this.rows - 1, Math.max(0, Math.floor(z - this.minZ)));
    return cz * this.cols + cx;
  }

  centerX(index: number): number {
    return this.minX + (index % this.cols) + 0.5;
  }

  centerZ(index: number): number {
    return this.minZ + Math.floor(index / this.cols) + 0.5;
  }

  lineOfSight(x0: number, z0: number, x1: number, z1: number): boolean {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!this.isWalkable(x0 + dx * t, z0 + dz * t)) return false;
    }
    return true;
  }

  /** The point itself when walkable, otherwise the centre of the closest walkable cell. */
  nearestWalkable(x: number, z: number): Point {
    if (this.isWalkable(x, z)) return { x, z };
    const start = this.cellIndexAt(x, z);
    const sx = start % this.cols;
    const sz = Math.floor(start / this.cols);
    let best = -1;
    let bestDist = Infinity;
    for (let radius = 0; radius <= Math.max(this.cols, this.rows) && best < 0; radius++) {
      for (let cz = sz - radius; cz <= sz + radius; cz++) {
        for (let cx = sx - radius; cx <= sx + radius; cx++) {
          if (Math.max(Math.abs(cx - sx), Math.abs(cz - sz)) !== radius) continue;
          if (this.isBlockedCell(cx, cz)) continue;
          const index = cz * this.cols + cx;
          const dist = Math.hypot(this.centerX(index) - x, this.centerZ(index) - z);
          if (dist < bestDist) {
            bestDist = dist;
            best = index;
          }
        }
      }
    }
    if (best < 0) throw new Error('NavGrid has no walkable cells');
    return { x: this.centerX(best), z: this.centerZ(best) };
  }
}
