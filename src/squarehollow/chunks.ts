import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type Material,
  type Texture,
} from 'three';
import type { Layer } from './blocks';
import { buildChunk, type MeshData } from './mesher';
import { CHUNK, type World } from './world';

export type Materials = Record<Layer, Material>;

/** One material per way of drawing a block, all sharing the atlas. */
export function blockMaterials(atlas: Texture): Materials {
  return {
    solid: new MeshLambertMaterial({ map: atlas, vertexColors: true }),
    glow: new MeshBasicMaterial({ map: atlas, vertexColors: true, toneMapped: false }),
    glass: new MeshLambertMaterial({
      map: atlas,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    }),
    water: new MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
      side: DoubleSide,
    }),
  };
}

const LAYERS: readonly Layer[] = ['solid', 'glow', 'glass', 'water'];
/** See-through layers draw after the solid world, water last. */
const ORDER: Record<Layer, number> = { solid: 0, glow: 0, glass: 1, water: 2 };

function geometry(data: MeshData): BufferGeometry {
  const made = new BufferGeometry();
  made.setAttribute('position', new BufferAttribute(data.positions, 3));
  made.setAttribute('normal', new BufferAttribute(data.normals, 3));
  made.setAttribute('color', new BufferAttribute(data.colors, 3));
  made.setAttribute('uv', new BufferAttribute(data.uvs, 2));
  made.setIndex(new BufferAttribute(data.indices, 1));
  made.computeBoundingSphere();
  return made;
}

/**
 * The world's meshes, a chunk at a time. Chunks near the Warden are built first and the rest
 * a few per frame; a chunk whose blocks change is rebuilt on the next frame.
 */
export class ChunkMeshes {
  readonly group = new Group();
  private readonly meshes = new Map<number, Mesh[]>();
  private readonly dirty = new Set<number>();
  private readonly waiting: number[];
  private readonly across: number;

  constructor(
    private readonly world: World,
    private readonly materials: Materials,
    near: { x: number; z: number },
  ) {
    this.across = world.width / CHUNK;
    const keys: number[] = [];
    for (let cz = 0; cz < world.depth / CHUNK; cz++) {
      for (let cx = 0; cx < this.across; cx++) keys.push(cz * this.across + cx);
    }
    const distance = (key: number): number => {
      const cx = (key % this.across) * CHUNK + CHUNK / 2;
      const cz = Math.floor(key / this.across) * CHUNK + CHUNK / 2;
      return Math.hypot(cx - near.x, cz - near.z);
    };
    // Farthest first, so the nearest come off the end of the list first.
    this.waiting = keys.sort((a, b) => distance(b) - distance(a));
  }

  /** True once every chunk has been built at least once. */
  get complete(): boolean {
    return this.waiting.length === 0;
  }

  /** Builds `count` of the chunks still waiting, nearest first. */
  buildWaiting(count: number): void {
    for (let i = 0; i < count && this.waiting.length > 0; i++) {
      this.rebuild(this.waiting.pop() as number);
    }
  }

  /** A cell changed: its chunk, and any neighbour whose faces it touches, need rebuilding. */
  touch(x: number, z: number): void {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const add = (ax: number, az: number): void => {
      if (ax < 0 || az < 0 || ax >= this.across || az >= this.world.depth / CHUNK) return;
      this.dirty.add(az * this.across + ax);
    };
    add(cx, cz);
    const lx = x - cx * CHUNK;
    const lz = z - cz * CHUNK;
    if (lx === 0) add(cx - 1, cz);
    if (lx === CHUNK - 1) add(cx + 1, cz);
    if (lz === 0) add(cx, cz - 1);
    if (lz === CHUNK - 1) add(cx, cz + 1);
  }

  /** Rebuilds every chunk touched since the last frame. */
  flush(): void {
    for (const key of this.dirty) this.rebuild(key);
    this.dirty.clear();
  }

  private rebuild(key: number): void {
    const old = this.meshes.get(key);
    if (old) {
      for (const mesh of old) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
      }
    }
    const data = buildChunk(this.world, key % this.across, Math.floor(key / this.across));
    const made: Mesh[] = [];
    for (const layer of LAYERS) {
      const part = data[layer];
      if (!part) continue;
      const mesh = new Mesh(geometry(part), this.materials[layer]);
      mesh.renderOrder = ORDER[layer];
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
      made.push(mesh);
    }
    this.meshes.set(key, made);
    // A chunk still waiting for its first build no longer needs it.
    const waiting = this.waiting.indexOf(key);
    if (waiting >= 0) this.waiting.splice(waiting, 1);
  }

  dispose(): void {
    for (const meshes of this.meshes.values()) {
      for (const mesh of meshes) mesh.geometry.dispose();
    }
    this.meshes.clear();
    this.group.clear();
  }
}
