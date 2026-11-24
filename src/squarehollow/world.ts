import {
  AIR,
  BLOCKS,
  DEEPROCK,
  DOORFRAME,
  GRASS,
  isSolid,
  LEAVES,
  LOG,
  SAND,
  SNOW,
  SOIL,
  STONE,
  SUNSHARD,
  WATER,
} from './blocks';
import { fbm2, hash, noise3 } from './noise';

/** Columns per chunk side. The world is meshed, and remeshed after a change, a chunk at a time. */
export const CHUNK = 16;
export const HEIGHT = 64;
/** The top cell of the sea. Every lake and the sea round the island fill to here. */
export const SEA_LEVEL = 20;
/** A water surface sits this far up its top cell. */
export const WATER_TOP = 0.88;
/** Columns on each side of the island, a whole number of chunks. */
export const WORLD_SIZE = 160;

export interface Hit {
  x: number;
  y: number;
  z: number;
  /** Which face was hit, pointing back towards the eye: the cell in front of it is where a block goes. */
  nx: number;
  ny: number;
  nz: number;
  distance: number;
  id: number;
}

/** A cell that changed, for remeshing. */
export interface Cell {
  x: number;
  y: number;
  z: number;
}

const smoothstep = (low: number, high: number, value: number): number => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

/**
 * An island of blocks in an endless sea, grown from a seed: rolling meadows, lakes and beaches,
 * stone ridges capped with snow, woods, and caves with Sunshards in their walls.
 *
 * The world is generated the same way from the same seed every time; what the Warden digs and
 * builds is kept as a list of edits laid on top.
 */
export class World {
  readonly width: number;
  readonly depth: number;
  readonly height = HEIGHT;
  readonly blocks: Uint8Array;
  /** The generated ground height of each column: the y of its top block. */
  readonly heights: Int16Array;
  /** Where the Warden's feet are put on arrival, facing +z, out of the door. */
  readonly spawn: Cell;
  /** The lower cell of the dark door's opening. Its frame stands round it, across the x axis. */
  readonly door: Cell;
  /** Every cell changed since generation: cell index to block id. */
  readonly edits = new Map<number, number>();

  constructor(
    readonly seed: number,
    size = WORLD_SIZE,
  ) {
    if (size % CHUNK !== 0) throw new Error(`World size ${size} is not a whole number of chunks`);
    this.width = size;
    this.depth = size;
    this.blocks = new Uint8Array(size * size * HEIGHT);
    this.heights = new Int16Array(size * size);
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) this.heights[z * size + x] = this.surface(x, z);
    }
    this.spawn = this.findSpawn();
    this.door = { x: this.spawn.x, y: this.spawn.y, z: this.spawn.z - 2 };
    this.generate();
  }

  index(x: number, y: number, z: number): number {
    return x + this.width * (z + this.depth * y);
  }

  inside(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.width && y < HEIGHT && z < this.depth;
  }

  /** The block in a cell. Outside the island is open sea: water to sea level, air above. */
  get(x: number, y: number, z: number): number {
    if (y < 0) return DEEPROCK;
    if (y >= HEIGHT) return AIR;
    if (x < 0 || z < 0 || x >= this.width || z >= this.depth) {
      return y <= SEA_LEVEL ? WATER : AIR;
    }
    return this.blocks[this.index(x, y, z)];
  }

  /** Whether a body is stopped by the cell. The island's edge is an invisible wall. */
  solidAt(x: number, y: number, z: number): boolean {
    if (y < 0) return true;
    if (y >= HEIGHT) return false;
    if (x < 0 || z < 0 || x >= this.width || z >= this.depth) return true;
    return isSolid(this.blocks[this.index(x, y, z)]);
  }

  /** Sets a cell and remembers the change. Does nothing outside the world. */
  set(x: number, y: number, z: number, id: number): void {
    if (!this.inside(x, y, z)) return;
    const i = this.index(x, y, z);
    this.blocks[i] = id;
    this.edits.set(i, id);
  }

  /** The highest cell a body could stand on in a column, or -1 if it is all air. */
  topAt(x: number, z: number): number {
    for (let y = HEIGHT - 1; y >= 0; y--) if (this.solidAt(x, y, z)) return y;
    return -1;
  }

  /**
   * The first block a ray meets, stepping cell by cell (Amanatides and Woo). Water and air are
   * looked through; the cell the ray starts in is never hit.
   */
  raycast(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    reach: number,
  ): Hit | null {
    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;
    const deltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const deltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const deltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let maxX = dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * deltaX : Infinity;
    let maxY = dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * deltaY : Infinity;
    let maxZ = dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * deltaZ : Infinity;
    for (let guard = 0; guard < 256; guard++) {
      let t: number;
      let nx = 0;
      let ny = 0;
      let nz = 0;
      if (maxX < maxY && maxX < maxZ) {
        x += stepX;
        t = maxX;
        maxX += deltaX;
        nx = -stepX;
      } else if (maxY < maxZ) {
        y += stepY;
        t = maxY;
        maxY += deltaY;
        ny = -stepY;
      } else {
        z += stepZ;
        t = maxZ;
        maxZ += deltaZ;
        nz = -stepZ;
      }
      if (t > reach) return null;
      if (!this.inside(x, y, z)) continue;
      const id = this.blocks[this.index(x, y, z)];
      if (id !== AIR && id !== WATER) return { x, y, z, nx, ny, nz, distance: t, id };
    }
    return null;
  }

  /**
   * Digs a block out. Returns the cells that changed (water may pour into the hole), or null if
   * the block cannot be dug.
   */
  dig(x: number, y: number, z: number): Cell[] | null {
    if (!this.inside(x, y, z)) return null;
    const id = this.blocks[this.index(x, y, z)];
    if (id === AIR || id === WATER || !BLOCKS[id].breakable) return null;
    this.set(x, y, z, AIR);
    const changed: Cell[] = [{ x, y, z }];
    this.pour(x, y, z, changed);
    return changed;
  }

  /** Puts a block in an empty (or flooded) cell. Returns the changed cells, or null if it is taken. */
  place(x: number, y: number, z: number, id: number): Cell[] | null {
    if (!this.inside(x, y, z)) return null;
    const there = this.blocks[this.index(x, y, z)];
    if (there !== AIR && there !== WATER) return null;
    this.set(x, y, z, id);
    return [{ x, y, z }];
  }

  /**
   * Water runs into a new hole at or below sea level from above or beside it, and on into any
   * empty cells it reaches, down and sideways. A cave system can only take so much at once.
   */
  private pour(x: number, y: number, z: number, changed: Cell[]): void {
    const queue: Cell[] = [{ x, y, z }];
    let budget = 600;
    while (queue.length > 0 && budget > 0) {
      const cell = queue.pop() as Cell;
      if (cell.y > SEA_LEVEL || !this.inside(cell.x, cell.y, cell.z)) continue;
      if (this.blocks[this.index(cell.x, cell.y, cell.z)] !== AIR) continue;
      const wet =
        this.get(cell.x, cell.y + 1, cell.z) === WATER ||
        this.get(cell.x + 1, cell.y, cell.z) === WATER ||
        this.get(cell.x - 1, cell.y, cell.z) === WATER ||
        this.get(cell.x, cell.y, cell.z + 1) === WATER ||
        this.get(cell.x, cell.y, cell.z - 1) === WATER;
      if (!wet) continue;
      this.set(cell.x, cell.y, cell.z, WATER);
      if (!changed.some((c) => c.x === cell.x && c.y === cell.y && c.z === cell.z)) {
        changed.push(cell);
      }
      budget--;
      queue.push(
        { x: cell.x, y: cell.y - 1, z: cell.z },
        { x: cell.x + 1, y: cell.y, z: cell.z },
        { x: cell.x - 1, y: cell.y, z: cell.z },
        { x: cell.x, y: cell.y, z: cell.z + 1 },
        { x: cell.x, y: cell.y, z: cell.z - 1 },
      );
    }
  }

  /** The changes since generation, as [cell index, block id] pairs. */
  editList(): [number, number][] {
    return [...this.edits];
  }

  /** Lays saved changes back on top of the generated world. Bad entries are skipped. */
  applyEdits(list: readonly (readonly [number, number])[]): void {
    for (const entry of list) {
      const [i, id] = entry;
      if (!Number.isInteger(i) || i < 0 || i >= this.blocks.length) continue;
      if (!Number.isInteger(id) || id < 0 || id >= BLOCKS.length) continue;
      this.blocks[i] = id;
      this.edits.set(i, id);
    }
  }

  /** The generated ground height of a column, from noise: hills, ridges, and a coast. */
  private surface(x: number, z: number): number {
    const seed = this.seed;
    const nx = (x + 0.5) / this.width - 0.5;
    const nz = (z + 0.5) / this.depth - 0.5;
    // Half square, half round, with a wandering coastline.
    const out =
      Math.max(Math.abs(nx), Math.abs(nz)) +
      Math.hypot(nx, nz) +
      fbm2(x / 30, z / 30, seed + 5, 2) * 0.12;
    const rolling = fbm2(x / 52, z / 52, seed, 4);
    const ridge = Math.max(0, fbm2(x / 60 + 37, z / 60 - 11, seed + 1, 3) - 0.1);
    let h = 25 + rolling * 11 + ridge * ridge * 95;
    const coast = smoothstep(0.72, 0.98, out);
    h = h * (1 - coast) + 11 * coast;
    return Math.max(3, Math.min(HEIGHT - 10, Math.round(h)));
  }

  private heightAt(x: number, z: number): number {
    const cx = Math.max(0, Math.min(this.width - 1, x));
    const cz = Math.max(0, Math.min(this.depth - 1, z));
    return this.heights[cz * this.width + cx];
  }

  /** A flat patch of meadow near the middle, with room for the door behind it. */
  private findSpawn(): Cell {
    const mid = this.width / 2;
    const candidates: [number, number, number][] = [];
    for (let z = 6; z < this.depth - 6; z++) {
      for (let x = 6; x < this.width - 6; x++) {
        candidates.push([Math.hypot(x - mid, z - mid), x, z]);
      }
    }
    candidates.sort((a, b) => a[0] - b[0]);
    for (const [, x, z] of candidates) {
      const h = this.heightAt(x, z);
      if (h < SEA_LEVEL + 2 || h > SEA_LEVEL + 12) continue;
      let flat = true;
      for (let dz = -4; dz <= 3 && flat; dz++) {
        for (let dx = -2; dx <= 2 && flat; dx++) flat = this.heightAt(x + dx, z + dz) === h;
      }
      if (flat) return { x, y: h + 1, z };
    }
    // No flat ground anywhere: level some in the middle.
    const h = Math.max(SEA_LEVEL + 2, this.heightAt(mid, mid));
    for (let dz = -4; dz <= 3; dz++) {
      for (let dx = -2; dx <= 2; dx++) this.heights[(mid + dz) * this.width + mid + dx] = h;
    }
    return { x: mid, y: h + 1, z: mid };
  }

  private nearSpawn(x: number, z: number, reach: number): boolean {
    return Math.abs(x - this.spawn.x) <= reach && Math.abs(z - this.spawn.z) <= reach;
  }

  private generate(): void {
    const { width: W, depth: D, seed } = this;
    const put = (x: number, y: number, z: number, id: number): void => {
      this.blocks[this.index(x, y, z)] = id;
    };
    const at = (x: number, y: number, z: number): number => this.blocks[this.index(x, y, z)];

    // Ground: deep rock, stone, a few cells of soil, then turf, sand, bare stone or snow on top.
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        const h = this.heightAt(x, z);
        const steep =
          Math.max(
            Math.abs(this.heightAt(x + 1, z) - h),
            Math.abs(this.heightAt(x - 1, z) - h),
            Math.abs(this.heightAt(x, z + 1) - h),
            Math.abs(this.heightAt(x, z - 1) - h),
          ) >= 3;
        const beach = h <= SEA_LEVEL + 1;
        const high = h >= 40 || steep;
        const peak = h >= 45;
        for (let y = 0; y <= h; y++) {
          let id = STONE;
          if (y === 0) id = DEEPROCK;
          else if (y === h) id = beach ? SAND : peak ? SNOW : high ? STONE : GRASS;
          else if (y >= h - 3) id = beach ? SAND : high ? STONE : SOIL;
          put(x, y, z, id);
        }
        for (let y = h + 1; y <= SEA_LEVEL; y++) put(x, y, z, WATER);
      }
    }

    // Caves: worm tunnels where two noise fields cross zero together, and a few caverns deep down.
    // They open on hillsides, but never into the sea or a lake, and never under the door.
    for (let z = 0; z < D; z++) {
      for (let x = 0; x < W; x++) {
        const h = this.heightAt(x, z);
        let top = h > SEA_LEVEL + 4 ? h : h - 4;
        if (this.nearSpawn(x, z, 5)) top = Math.min(top, h - 6);
        const lowest = Math.min(
          this.heightAt(x + 1, z),
          this.heightAt(x - 1, z),
          this.heightAt(x, z + 1),
          this.heightAt(x, z - 1),
        );
        for (let y = 1; y <= top; y++) {
          if (y <= SEA_LEVEL + 1 && lowest <= y + 1) continue;
          const a = noise3(x / 16, y / 10, z / 16, seed + 7);
          const b = noise3(x / 16, y / 10, z / 16, seed + 13);
          const tunnel = a * a + b * b < 0.012;
          const cavern = y < 17 && noise3(x / 24, y / 12, z / 24, seed + 21) > 0.6;
          if ((tunnel || cavern) && at(x, y, z) !== WATER) put(x, y, z, AIR);
        }
      }
    }

    // Sunshards grow in cave walls, and very rarely deep in the rock.
    for (let z = 1; z < D - 1; z++) {
      for (let x = 1; x < W - 1; x++) {
        const h = this.heightAt(x, z);
        for (let y = 1; y < h - 3; y++) {
          if (at(x, y, z) !== STONE) continue;
          const open =
            at(x + 1, y, z) === AIR ||
            at(x - 1, y, z) === AIR ||
            at(x, y + 1, z) === AIR ||
            at(x, y - 1, z) === AIR ||
            at(x, y, z + 1) === AIR ||
            at(x, y, z - 1) === AIR;
          const roll = hash(x, y, z, seed + 31);
          if (roll < (open ? 0.035 : 0.0012)) put(x, y, z, SUNSHARD);
        }
      }
    }

    // Trees, thick in the woods and scattered on open meadow, never on top of each other.
    const taken = new Uint8Array(W * D);
    for (let z = 3; z < D - 3; z++) {
      for (let x = 3; x < W - 3; x++) {
        const h = this.heightAt(x, z);
        if (h + 9 >= HEIGHT || at(x, h, z) !== GRASS || this.nearSpawn(x, z, 5)) continue;
        if (taken[z * W + x]) continue;
        const woods = Math.max(0, fbm2(x / 36, z / 36, seed + 3, 2));
        if (hash(x, 0, z, seed + 41) >= 0.006 + woods * 0.12) continue;
        const trunk = 4 + Math.floor(hash(x, 1, z, seed + 43) * 3);
        put(x, h, z, SOIL);
        for (let y = h + 1; y <= h + trunk; y++) put(x, y, z, LOG);
        for (let y = h + trunk - 2; y <= h + trunk + 1; y++) {
          const r = y >= h + trunk ? 1 : 2;
          for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
              const corner = Math.abs(dx) === r && Math.abs(dz) === r;
              if (corner && (r === 1 || hash(x + dx, y, z + dz, seed + 47) < 0.6)) continue;
              if (at(x + dx, y, z + dz) === AIR) put(x + dx, y, z + dz, LEAVES);
            }
          }
        }
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) taken[(z + dz) * W + x + dx] = 1;
        }
      }
    }

    // The dark door: a frame of old wood round a doorway onto nothing, with the way out in front.
    const { door } = this;
    for (let dz = -2; dz <= 4; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let y = door.y; y < door.y + 5; y++) put(door.x + dx, y, door.z + dz, AIR);
      }
    }
    for (let y = door.y; y <= door.y + 2; y++) {
      put(door.x - 1, y, door.z, DOORFRAME);
      put(door.x + 1, y, door.z, DOORFRAME);
    }
    put(door.x, door.y + 2, door.z, DOORFRAME);
  }
}
