import {
  AIR,
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  BLOCKS,
  FACE_COLOURS,
  GLASS,
  isOpaque,
  WATER,
  type Layer,
} from './blocks';
import { hash } from './noise';
import { CHUNK, WATER_TOP, type World } from './world';

/** One layer of a chunk as flat arrays, ready for a BufferGeometry. */
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

export type ChunkMesh = Record<Layer, MeshData | null>;

interface Face {
  normal: readonly [number, number, number];
  /** Corners as offsets within the cell, counter-clockwise seen from outside. */
  corners: readonly (readonly [number, number, number])[];
  /** The two axes that run across the face, for ambient occlusion. */
  across: readonly [number, number];
  /** 0 top, 1 side, 2 bottom: which of the block's colours and tiles the face takes. */
  part: 0 | 1 | 2;
}

/** The six faces of a cell. Each runs bottom left, bottom right, top right, top left. */
const FACES: readonly Face[] = [
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    across: [1, 2],
    part: 1,
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    across: [1, 2],
    part: 1,
  },
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    across: [0, 2],
    part: 0,
  },
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    across: [0, 2],
    part: 2,
  },
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    across: [0, 1],
    part: 1,
  },
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    across: [0, 1],
    part: 1,
  },
];
const CORNER_UV = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
] as const;

/** Light left at a vertex with 0, 1, 2 or 3 of its neighbours blocking the sky. */
const OCCLUSION = [0.46, 0.66, 0.83, 1];
/** An unlit glowing block still shows its shape: tops brightest, bottoms dimmest. */
const GLOW_SHADE = [1, 0.86, 0.72];
/** How far each tile's corners are pulled in, so neighbours in the atlas do not bleed over. */
const INSET = 0.012;

class Builder {
  positions: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  uvs: number[] = [];
  indices: number[] = [];

  finish(): MeshData | null {
    if (this.indices.length === 0) return null;
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      uvs: new Float32Array(this.uvs),
      indices: new Uint32Array(this.indices),
    };
  }
}

/** Whether a face of `id` that looks onto `neighbour` can be seen. */
function showsFace(id: number, neighbour: number): boolean {
  if (neighbour === AIR) return true;
  if (isOpaque(neighbour)) return false;
  // Water against water, or glass against glass, is one body: no wall between them.
  if (neighbour === id) return false;
  return !(id === WATER && neighbour === GLASS);
}

/**
 * Builds the faces of one chunk column: only faces that can be seen, each vertex darkened by the
 * blocks round it (ambient occlusion), tinted a little per block, and split by how it is drawn.
 */
export function buildChunk(world: World, cx: number, cz: number): ChunkMesh {
  const layers: Record<Layer, Builder> = {
    solid: new Builder(),
    glow: new Builder(),
    glass: new Builder(),
    water: new Builder(),
  };
  const x0 = cx * CHUNK;
  const z0 = cz * CHUNK;
  const occluder = (x: number, y: number, z: number): number =>
    isOpaque(world.get(x, y, z)) ? 1 : 0;
  const cell = [0, 0, 0];
  const probe = [0, 0, 0];

  for (let y = 0; y < world.height; y++) {
    for (let z = z0; z < z0 + CHUNK; z++) {
      for (let x = x0; x < x0 + CHUNK; x++) {
        const id = world.get(x, y, z);
        if (id === AIR) continue;
        const spec = BLOCKS[id];
        const layer = spec.layer;
        const out = layers[layer];
        const colours = FACE_COLOURS[id];
        const tint = 1 + (hash(x, y, z, 77) - 0.5) * 2 * spec.variance;
        const water = id === WATER;
        // A water surface open to the air sits a little low in its cell.
        const surface = water && world.get(x, y + 1, z) !== WATER ? WATER_TOP : 1;
        cell[0] = x;
        cell[1] = y;
        cell[2] = z;

        for (const face of FACES) {
          const [nx, ny, nz] = face.normal;
          if (!showsFace(id, world.get(x + nx, y + ny, z + nz))) continue;
          const base = out.positions.length / 3;
          const tile = spec.tiles[face.part];
          const u0 = (tile % ATLAS_COLUMNS) / ATLAS_COLUMNS;
          const v0 = 1 - (Math.floor(tile / ATLAS_COLUMNS) + 1) / ATLAS_ROWS;
          const occlusion = [3, 3, 3, 3];

          face.corners.forEach((corner, k) => {
            const top = corner[1] === 1;
            out.positions.push(x + corner[0], y + (top ? surface : 0), z + corner[2]);
            out.normals.push(nx, ny, nz);
            const [uc, vc] = CORNER_UV[k];
            out.uvs.push(
              u0 + (INSET + uc * (1 - 2 * INSET)) / ATLAS_COLUMNS,
              v0 + (INSET + vc * (1 - 2 * INSET)) / ATLAS_ROWS,
            );

            let light = 1;
            if (layer === 'solid' || layer === 'glow') {
              // The cells that touch this corner, in the layer the face looks out on.
              const [a, b] = face.across;
              probe[0] = cell[0] + nx;
              probe[1] = cell[1] + ny;
              probe[2] = cell[2] + nz;
              const da = corner[a] === 1 ? 1 : -1;
              const db = corner[b] === 1 ? 1 : -1;
              probe[a] += da;
              const side1 = occluder(probe[0], probe[1], probe[2]);
              probe[b] += db;
              const both = occluder(probe[0], probe[1], probe[2]);
              probe[a] -= da;
              const side2 = occluder(probe[0], probe[1], probe[2]);
              const ao = side1 && side2 ? 0 : 3 - (side1 + side2 + both);
              occlusion[k] = ao;
              light =
                layer === 'glow' ? (0.72 + 0.28 * (ao / 3)) * GLOW_SHADE[face.part] : OCCLUSION[ao];
            }
            // Turf sides fade from green at the top to soil at the bottom.
            const colour = spec.fade && face.part === 1 ? colours[top ? 1 : 2] : colours[face.part];
            const shade = light * tint;
            out.colors.push(colour[0] * shade, colour[1] * shade, colour[2] * shade);
          });

          // Split the quad along the diagonal that keeps the occlusion gradient smooth.
          if (occlusion[0] + occlusion[2] >= occlusion[1] + occlusion[3]) {
            out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          } else {
            out.indices.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
          }
        }
      }
    }
  }

  return {
    solid: layers.solid.finish(),
    glow: layers.glow.finish(),
    glass: layers.glass.finish(),
    water: layers.water.finish(),
  };
}

/** One block on its own, centred on the origin and evenly lit: the block in the Warden's hand. */
export function buildBlock(id: number): MeshData {
  const out = new Builder();
  const spec = BLOCKS[id];
  const colours = FACE_COLOURS[id];
  for (const face of FACES) {
    const base = out.positions.length / 3;
    const tile = spec.tiles[face.part];
    const u0 = (tile % ATLAS_COLUMNS) / ATLAS_COLUMNS;
    const v0 = 1 - (Math.floor(tile / ATLAS_COLUMNS) + 1) / ATLAS_ROWS;
    face.corners.forEach((corner, k) => {
      out.positions.push(corner[0] - 0.5, corner[1] - 0.5, corner[2] - 0.5);
      out.normals.push(...face.normal);
      const [uc, vc] = CORNER_UV[k];
      out.uvs.push(
        u0 + (INSET + uc * (1 - 2 * INSET)) / ATLAS_COLUMNS,
        v0 + (INSET + vc * (1 - 2 * INSET)) / ATLAS_ROWS,
      );
      const top = corner[1] === 1;
      const colour = spec.fade && face.part === 1 ? colours[top ? 1 : 2] : colours[face.part];
      const shade = spec.layer === 'glow' ? GLOW_SHADE[face.part] : 1;
      out.colors.push(colour[0] * shade, colour[1] * shade, colour[2] * shade);
    });
    out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return out.finish() as MeshData;
}
