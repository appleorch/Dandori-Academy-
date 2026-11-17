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

/**
 * A one-way edge: a strip of ground that can be stepped down off in the direction
 * (dx, dz) and never climbed back up. Each of dx and dz is -1, 0 or 1.
 */
export interface Ledge extends Box {
  dx: number;
  dz: number;
}

/** The four drop directions a ledge can face. */
const DROPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

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
  /** Per cell: 0, or 1 + the index of its drop direction in DROPS for a ledge cell. */
  readonly ledge: Uint8Array;

  constructor(
    width: number,
    depth: number,
    obstacles: readonly Box[],
    private readonly agentRadius = 0.45,
  ) {
    this.cols = Math.ceil(width);
    this.rows = Math.ceil(depth);
    this.minX = -width / 2;
    this.minZ = -depth / 2;
    this.blocked = new Uint8Array(this.cols * this.rows);
    this.ledge = new Uint8Array(this.cols * this.rows);
    this.setObstacles(obstacles);
  }

  /** Rebuilds which cells are blocked, for when a wall appears or disappears. */
  setObstacles(obstacles: readonly Box[]): void {
    this.blocked.fill(0);
    for (let cz = 0; cz < this.rows; cz++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const x = this.minX + cx + 0.5;
        const z = this.minZ + cz + 0.5;
        for (const box of obstacles) {
          if (
            Math.abs(x - box.x) < box.w / 2 + this.agentRadius &&
            Math.abs(z - box.z) < box.d / 2 + this.agentRadius
          ) {
            this.blocked[cz * this.cols + cx] = 1;
            break;
          }
        }
      }
    }
  }

  /** Marks the cells of each ledge with its drop direction. */
  setLedges(ledges: readonly Ledge[]): void {
    this.ledge.fill(0);
    for (const ledge of ledges) {
      const code = DROPS.findIndex(([dx, dz]) => dx === ledge.dx && dz === ledge.dz) + 1;
      for (let cz = 0; cz < this.rows; cz++) {
        for (let cx = 0; cx < this.cols; cx++) {
          const x = this.minX + cx + 0.5;
          const z = this.minZ + cz + 0.5;
          if (Math.abs(x - ledge.x) < ledge.w / 2 && Math.abs(z - ledge.z) < ledge.d / 2) {
            this.ledge[cz * this.cols + cx] = code;
          }
        }
      }
    }
  }

  /** True when stepping into cell (cx, cz) in direction (dx, dz) would climb a ledge. */
  private climbs(cx: number, cz: number, dx: number, dz: number): boolean {
    if (cx < 0 || cz < 0 || cx >= this.cols || cz >= this.rows) return false;
    const code = this.ledge[cz * this.cols + cx];
    if (code === 0) return false;
    const [lx, lz] = DROPS[code - 1];
    return dx * lx + dz * lz < 0;
  }

  /** True when a straight move between two nearby points would climb up a ledge. */
  climbsBetween(x0: number, z0: number, x1: number, z1: number): boolean {
    const from = this.cellIndexAt(x0, z0);
    const to = this.cellIndexAt(x1, z1);
    if (from === to || this.ledge[to] === 0) return false;
    return this.climbs(to % this.cols, Math.floor(to / this.cols), x1 - x0, z1 - z0);
  }

  /** Whether a straight move between two nearby points is allowed: open ground, and no ledge climbed. */
  canMove(x0: number, z0: number, x1: number, z1: number): boolean {
    return this.isWalkable(x1, z1) && !this.climbsBetween(x0, z0, x1, z1);
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
    if (this.climbs(cx + dx, cz + dz, dx, dz)) return false;
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
    let previous = this.cellIndexAt(x0, z0);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + dx * t;
      const z = z0 + dz * t;
      if (!this.isWalkable(x, z)) return false;
      const cell = this.cellIndexAt(x, z);
      if (cell !== previous && this.ledge[cell] !== 0) {
        if (this.climbs(cell % this.cols, Math.floor(cell / this.cols), dx, dz)) return false;
      }
      previous = cell;
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
