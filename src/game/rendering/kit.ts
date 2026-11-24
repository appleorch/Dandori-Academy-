import { Rng } from '../core/rng';
import type { LevelDefinition, PropKind, PropSpawn, Wall, WallLook } from '../world/levelTypes';

/**
 * The miniature-world kit: walls drawn as giant everyday objects, and props placed round a field
 * for art. Everything is built from pieces (a primitive shape, a colour, a place, a size and a
 * turn). Pieces of the same shape and colour are drawn together as one instanced mesh
 * (KitMeshes.tsx), so a long hedge or a field full of props costs a handful of draw calls.
 * See docs-design/ART_DIRECTION.md.
 */

export type Shape =
  'box' | 'cylinder' | 'sphere' | 'ico' | 'cone' | 'pot' | 'cup' | 'torus' | 'capsule';

/** How a piece's surface is drawn. */
/** `sway` bends in the wind, more the higher a part stands: giant grass and flower stems. */
export type Finish = 'matte' | 'metal' | 'glass' | 'glow' | 'sway';

export interface Piece {
  shape: Shape;
  color: string;
  finish?: Finish;
  x: number;
  y: number;
  z: number;
  /** Size along each axis; the unit shapes are 1 across and 1 tall. */
  sx: number;
  sy: number;
  sz: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

/** The looks the kit draws; the rest (rock, ruin, cliff, parapet) are drawn elsewhere. */
export const KIT_LOOKS: readonly WallLook[] = [
  'hedge',
  'brick',
  'flowerpot',
  'fence',
  'book',
  'tile',
  'root',
  'glass',
  'gear',
];

const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng.next() * list.length)];

/**
 * A wall's pieces. Each builder works along x for the wall's length and z for its thickness,
 * centred on 0; the result is then turned and placed onto the wall's box.
 */
export function wallPieces(wall: Wall, look: WallLook): Piece[] {
  const alongX = wall.w >= wall.d;
  const length = alongX ? wall.w : wall.d;
  const thick = alongX ? wall.d : wall.w;
  const rng = new Rng(Math.round(wall.x * 73 + wall.z * 151 + length * 7) >>> 0 || 1);
  const local = BUILDERS[look]?.(length, thick, rng) ?? [];
  return local.map((piece) => {
    const x = alongX ? piece.x : -piece.z;
    const z = alongX ? piece.z : piece.x;
    return {
      ...piece,
      x: wall.x + x,
      z: wall.z + z,
      ry: (piece.ry ?? 0) + (alongX ? 0 : Math.PI / 2),
    };
  });
}

type Builder = (length: number, thick: number, rng: Rng) => Piece[];

/** Steps of about `step` along a length, centred: the middle of each. */
function along(length: number, step: number): number[] {
  const count = Math.max(1, Math.round(length / step));
  const size = length / count;
  return Array.from({ length: count }, (_, i) => -length / 2 + size * (i + 0.5));
}

const BUILDERS: Partial<Record<WallLook, Builder>> = {
  /** A clipped hedge: a dark core with leafy clumps over its top and sides. */
  hedge(length, thick, rng) {
    const height = 2.7;
    const pieces: Piece[] = [
      {
        shape: 'box',
        color: '#2f5422',
        x: 0,
        y: height * 0.45,
        z: 0,
        sx: length,
        sy: height * 0.9,
        sz: thick * 0.85,
      },
    ];
    const greens = ['#4f8a34', '#5d9a3c', '#3f7a2c', '#6aa646'];
    for (const x of along(length, 0.9)) {
      for (const [y, z, size] of [
        [height * 0.95, 0, thick * 0.75],
        [height * 0.6, thick * 0.42, thick * 0.55],
        [height * 0.6, -thick * 0.42, thick * 0.55],
        [height * 0.25, thick * 0.45, thick * 0.5],
        [height * 0.25, -thick * 0.45, thick * 0.5],
      ] as const) {
        const s = size * rng.range(0.85, 1.25);
        pieces.push({
          shape: 'ico',
          color: pick(rng, greens),
          x: x + rng.range(-0.2, 0.2),
          y: y + rng.range(-0.1, 0.12),
          z,
          sx: Math.max(0.9, s),
          sy: Math.max(0.8, s * 0.85),
          sz: Math.max(0.8, s),
          ry: rng.range(0, Math.PI),
        });
      }
    }
    return pieces;
  },

  /** Old garden brick in running bond, mortar showing between, with a stone coping. */
  brick(length, thick) {
    const height = 2.4;
    const row = 0.32;
    const brick = 0.92;
    const pieces: Piece[] = [
      {
        shape: 'box',
        color: '#b8a888',
        x: 0,
        y: height / 2,
        z: 0,
        sx: length,
        sy: height,
        sz: thick * 0.94,
      },
    ];
    const reds = ['#a8553a', '#b8643f', '#94482f', '#b05a3c'];
    const rows = Math.floor(height / row);
    for (let r = 0; r < rows; r++) {
      const shift = r % 2 === 0 ? 0 : brick / 2;
      for (let x = -length / 2 + shift; x < length / 2; x += brick) {
        const start = Math.max(-length / 2, x);
        const end = Math.min(length / 2, x + brick - 0.06);
        if (end - start < 0.15) continue;
        pieces.push({
          shape: 'box',
          color: reds[Math.abs(r * 7 + Math.round((x + length) * 3)) % reds.length],
          x: (start + end) / 2,
          y: row * r + row / 2,
          z: 0,
          sx: end - start,
          sy: row - 0.05,
          sz: thick + 0.06,
        });
      }
    }
    // A course of bricks laid across the top, so the wall reads as brick from above too.
    for (const x of along(length, 0.48)) {
      pieces.push({
        shape: 'box',
        color: reds[Math.abs(Math.round((x + length) * 5)) % reds.length],
        x,
        y: rows * row + 0.11,
        z: 0,
        sx: 0.42,
        sy: 0.22,
        sz: thick + 0.12,
      });
    }
    return pieces;
  },

  /** Terracotta pots: one big pot on a square footing, a row of them on a long one. */
  flowerpot(length, thick, rng) {
    const pieces: Piece[] = [];
    const squat = length / thick < 1.6;
    const size = squat ? Math.max(length, thick) * 1.08 : thick * 1.3;
    const spots = squat ? [0] : along(length, size * 0.92);
    const clays = ['#c0663e', '#b85c38', '#c8714a'];
    for (const x of spots) {
      const height = size * (squat ? 0.95 : rng.range(0.8, 1));
      const clay = pick(rng, clays);
      pieces.push({ shape: 'pot', color: clay, x, y: 0, z: 0, sx: size, sy: height, sz: size });
      pieces.push({
        shape: 'cylinder',
        color: '#4a3424',
        x,
        y: height * 0.9,
        z: 0,
        sx: size * 0.82,
        sy: 0.08,
        sz: size * 0.82,
      });
      // Something growing in it: a few leaves and a stalk.
      const leaves = squat ? 7 : 3;
      for (let i = 0; i < leaves; i++) {
        const angle = (i / leaves) * Math.PI * 2 + rng.range(0, 0.6);
        const reach = size * rng.range(0.12, 0.32);
        pieces.push({
          shape: 'ico',
          color: pick(rng, ['#5d9a3c', '#4f8a34', '#7ab850']),
          x: x + Math.cos(angle) * reach,
          y: height + size * rng.range(0.1, 0.35),
          z: Math.sin(angle) * reach,
          sx: size * 0.28,
          sy: size * 0.16,
          sz: size * 0.28,
          ry: angle,
        });
      }
    }
    return pieces;
  },

  /** A picket fence: posts, two rails and close pointed pickets. */
  fence(length, thick, rng) {
    const height = 2.6;
    const paint = pick(rng, ['#ece6d4', '#e4dcc8']);
    const pieces: Piece[] = [];
    for (const x of along(length, 2.4)) {
      pieces.push({
        shape: 'box',
        color: '#d8cfb8',
        x: x - 1.2 + 0.001,
        y: height / 2,
        z: 0,
        sx: 0.32,
        sy: height,
        sz: Math.min(thick, 0.5),
      });
    }
    for (const y of [height * 0.3, height * 0.75]) {
      pieces.push({
        shape: 'box',
        color: '#d8cfb8',
        x: 0,
        y,
        z: -0.12,
        sx: length,
        sy: 0.18,
        sz: 0.12,
      });
    }
    for (const x of along(length, 0.42)) {
      const h = height * rng.range(0.92, 1);
      pieces.push({ shape: 'box', color: paint, x, y: h / 2, z: 0, sx: 0.32, sy: h, sz: 0.1 });
      pieces.push({
        shape: 'cone',
        color: paint,
        x,
        y: h + 0.14,
        z: 0,
        sx: 0.32,
        sy: 0.28,
        sz: 0.12,
        ry: Math.PI / 4,
      });
    }
    // Rules see a thick wall; a low hedge of grass at its foot fills the rest of the footprint.
    if (thick > 0.6) {
      pieces.push({
        shape: 'box',
        color: '#4f7f36',
        x: 0,
        y: 0.25,
        z: 0,
        sx: length,
        sy: 0.5,
        sz: thick * 0.9,
      });
    }
    return pieces;
  },

  /** Giant books standing on end, a shelf's worth along the wall. */
  book(length, thick, rng) {
    const pieces: Piece[] = [];
    const leathers = ['#7a2e2a', '#2e4a6a', '#3e5a32', '#8a6a2a', '#5a3a5a', '#6a3a22'];
    let x = -length / 2;
    while (x < length / 2 - 0.2) {
      const width = Math.min(length / 2 - x, rng.range(0.5, 1.1));
      const height = rng.range(2.4, 3.4);
      const cover = pick(rng, leathers);
      const cx = x + width / 2;
      pieces.push({
        shape: 'box',
        color: cover,
        x: cx,
        y: height / 2,
        z: 0,
        sx: width - 0.04,
        sy: height,
        sz: thick * 1.08,
      });
      // Pages showing at the top edge, and a gilt band on the spine.
      pieces.push({
        shape: 'box',
        color: '#efe6cc',
        x: cx,
        y: height - 0.04,
        z: 0,
        sx: width - 0.14,
        sy: 0.1,
        sz: thick * 0.98,
      });
      for (const side of [-1, 1]) {
        pieces.push({
          shape: 'box',
          color: '#c9a24a',
          finish: 'metal',
          x: cx,
          y: height * 0.82,
          z: side * (thick * 0.54 + 0.01),
          sx: width - 0.1,
          sy: 0.12,
          sz: 0.02,
        });
      }
      x += width;
    }
    return pieces;
  },

  /** Roof tiles and slates stacked and leaning, as at the back of a potting shed. */
  tile(length, thick, rng) {
    const pieces: Piece[] = [];
    for (const x of along(length, 0.55)) {
      const height = rng.range(2.1, 2.8);
      pieces.push({
        shape: 'box',
        color: pick(rng, ['#5a6470', '#6e7884', '#4c5560', '#a85a3a']),
        x,
        y: height / 2,
        z: rng.range(-0.1, 0.1),
        sx: 0.16,
        sy: height,
        sz: thick * 1.02,
        rz: rng.range(-0.22, 0.22),
      });
    }
    return pieces;
  },

  /** A great twisted root, half out of the ground, with offshoots. */
  root(length, thick, rng) {
    const pieces: Piece[] = [];
    const barks = ['#6a4a30', '#5a3e28', '#7a5838'];
    for (const x of along(length, 0.8)) {
      const size = thick * rng.range(0.95, 1.25);
      pieces.push({
        shape: 'capsule',
        color: pick(rng, barks),
        x,
        y: size * 0.4 + rng.range(0, 0.3),
        z: rng.range(-0.15, 0.15),
        sx: size,
        sy: 1.3,
        sz: size,
        rz: Math.PI / 2 + rng.range(-0.25, 0.25),
        ry: rng.range(-0.2, 0.2),
      });
      if (rng.next() < 0.3) {
        const side = rng.next() < 0.5 ? -1 : 1;
        pieces.push({
          shape: 'cone',
          color: pick(rng, barks),
          x: x + rng.range(-0.3, 0.3),
          y: 0.25,
          z: side * thick * 0.75,
          sx: 0.4,
          sy: 1.6,
          sz: 0.4,
          rx: side * 1.2,
        });
      }
    }
    return pieces;
  },

  /** Panes of greenhouse glass in brass frames. */
  glass(length, thick) {
    const height = 3;
    const pieces: Piece[] = [
      {
        shape: 'box',
        color: '#cfeee8',
        finish: 'glass',
        x: 0,
        y: height / 2,
        z: 0,
        sx: length,
        sy: height,
        sz: Math.min(thick, 0.3),
      },
      {
        shape: 'box',
        color: '#b08a48',
        finish: 'metal',
        x: 0,
        y: height,
        z: 0,
        sx: length,
        sy: 0.16,
        sz: Math.min(thick, 0.3) + 0.1,
      },
      {
        shape: 'box',
        color: '#8a6a38',
        finish: 'metal',
        x: 0,
        y: 0.1,
        z: 0,
        sx: length,
        sy: 0.2,
        sz: thick,
      },
    ];
    for (const x of along(length, 2.2)) {
      pieces.push({
        shape: 'box',
        color: '#b08a48',
        finish: 'metal',
        x: x - 1.1,
        y: height / 2,
        z: 0,
        sx: 0.14,
        sy: height,
        sz: Math.min(thick, 0.3) + 0.1,
      });
    }
    return pieces;
  },

  /** Clockwork gears standing on edge along the wall, half sunk into the ground. */
  gear(length, thick, rng) {
    const pieces: Piece[] = [];
    const size = 3.2;
    for (const x of along(length, size * 0.85)) {
      const metal = pick(rng, ['#b08a48', '#8a7a5a', '#6a6a6a']);
      const d = size * rng.range(0.85, 1.05);
      pieces.push({
        shape: 'cylinder',
        color: metal,
        finish: 'metal',
        x,
        y: d * 0.42,
        z: 0,
        sx: d,
        sy: thick * 0.8,
        sz: d,
        rx: Math.PI / 2,
      });
      pieces.push({
        shape: 'cylinder',
        color: '#3a3428',
        finish: 'metal',
        x,
        y: d * 0.42,
        z: 0,
        sx: d * 0.25,
        sy: thick * 0.95,
        sz: d * 0.25,
        rx: Math.PI / 2,
      });
      const teeth = 12;
      for (let i = 0; i < teeth; i++) {
        const angle = (i / teeth) * Math.PI * 2;
        const ty = d * 0.42 + Math.sin(angle) * d * 0.52;
        if (ty < 0) continue;
        pieces.push({
          shape: 'box',
          color: metal,
          finish: 'metal',
          x: x + Math.cos(angle) * d * 0.52,
          y: ty,
          z: 0,
          sx: 0.32,
          sy: 0.32,
          sz: thick * 0.8,
          rz: angle,
        });
      }
    }
    return pieces;
  },
};

/** A prop's pieces, placed and turned. */
export function propPieces(prop: PropSpawn): Piece[] {
  const scale = prop.scale ?? 1;
  const turn = prop.turn ?? 0;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return (PROPS[prop.kind]?.() ?? []).map((piece) => {
    const x = piece.x * scale;
    const z = piece.z * scale;
    return {
      ...piece,
      x: prop.x + x * cos + z * sin,
      y: piece.y * scale,
      z: prop.z - x * sin + z * cos,
      sx: piece.sx * scale,
      sy: piece.sy * scale,
      sz: piece.sz * scale,
      ry: (piece.ry ?? 0) + turn,
    };
  });
}

/** Each prop at scale 1, sized as in the art direction's scale table, centred on its origin. */
const PROPS: Partial<Record<PropKind, () => Piece[]>> = {
  flowerpot: () => [
    { shape: 'pot', color: '#c0663e', x: 0, y: 0, z: 0, sx: 6, sy: 5.4, sz: 6 },
    { shape: 'cylinder', color: '#4a3424', x: 0, y: 4.9, z: 0, sx: 5, sy: 0.1, sz: 5 },
    {
      shape: 'cylinder',
      color: '#4f8a34',
      x: 0.3,
      y: 7,
      z: 0.2,
      sx: 0.35,
      sy: 4.4,
      sz: 0.35,
      rz: 0.1,
    },
    {
      shape: 'cylinder',
      color: '#4f8a34',
      x: -0.8,
      y: 6.4,
      z: -0.4,
      sx: 0.3,
      sy: 3.4,
      sz: 0.3,
      rz: -0.25,
    },
    { shape: 'ico', color: '#5d9a3c', x: 0.6, y: 9.2, z: 0.2, sx: 2.4, sy: 1.2, sz: 2.4 },
    { shape: 'ico', color: '#6aa646', x: -1.4, y: 7.9, z: -0.6, sx: 2, sy: 1, sz: 2 },
    { shape: 'sphere', color: '#f2c8d8', x: 0.6, y: 10, z: 0.2, sx: 1.2, sy: 0.9, sz: 1.2 },
  ],
  'watering-can': () => [
    {
      shape: 'cylinder',
      color: '#5e8f6a',
      finish: 'metal',
      x: 0,
      y: 2.6,
      z: 0,
      sx: 6,
      sy: 5.2,
      sz: 6,
    },
    {
      shape: 'cylinder',
      color: '#4e7a5a',
      finish: 'metal',
      x: 0,
      y: 5.25,
      z: 0,
      sx: 6.2,
      sy: 0.3,
      sz: 6.2,
    },
    {
      shape: 'cylinder',
      color: '#5e8f6a',
      finish: 'metal',
      x: 5.2,
      y: 4.2,
      z: 0,
      sx: 0.8,
      sy: 7,
      sz: 0.8,
      rz: -1.0,
    },
    {
      shape: 'cylinder',
      color: '#4e7a5a',
      finish: 'metal',
      x: 8.2,
      y: 6.2,
      z: 0,
      sx: 1.8,
      sy: 0.6,
      sz: 1.8,
      rz: -1.0,
    },
    {
      shape: 'torus',
      color: '#4e7a5a',
      finish: 'metal',
      x: -3.4,
      y: 4,
      z: 0,
      sx: 3.6,
      sy: 3.6,
      sz: 3.6,
    },
  ],
  trowel: () => [
    {
      shape: 'cone',
      color: '#9aa2a8',
      finish: 'metal',
      x: 3,
      y: 0.15,
      z: 0,
      sx: 4,
      sy: 7,
      sz: 0.3,
      rz: -Math.PI / 2,
    },
    {
      shape: 'cylinder',
      color: '#8a8f94',
      finish: 'metal',
      x: -1,
      y: 0.3,
      z: 0,
      sx: 0.35,
      sy: 2,
      sz: 0.35,
      rz: Math.PI / 2,
    },
    {
      shape: 'capsule',
      color: '#a8673a',
      x: -4.2,
      y: 0.55,
      z: 0,
      sx: 1.1,
      sy: 4.4,
      sz: 1.1,
      rz: Math.PI / 2,
    },
  ],
  glove: () => [
    {
      shape: 'capsule',
      color: '#d8a24a',
      x: 0,
      y: 0.6,
      z: 0,
      sx: 4.4,
      sy: 3.2,
      sz: 1.4,
      rx: Math.PI / 2,
    },
    ...[-1.5, -0.5, 0.5, 1.5].map((x, i) => ({
      shape: 'capsule' as const,
      color: '#d8a24a',
      x: x * 1.05,
      y: 0.5,
      z: -3.2 - (i === 1 || i === 2 ? 0.4 : 0),
      sx: 1,
      sy: 2.4,
      sz: 1,
      rx: Math.PI / 2,
    })),
    {
      shape: 'capsule',
      color: '#d8a24a',
      x: 2.6,
      y: 0.5,
      z: -0.6,
      sx: 1.1,
      sy: 2.2,
      sz: 1.1,
      rx: Math.PI / 2,
      ry: -0.7,
    },
    {
      shape: 'cylinder',
      color: '#8a5a2a',
      x: 0,
      y: 0.6,
      z: 2.4,
      sx: 4.6,
      sy: 1.2,
      sz: 1.5,
      rx: Math.PI / 2,
    },
  ],
  'croquet-hoop': () => [
    {
      shape: 'cylinder',
      color: '#ece6d4',
      finish: 'metal',
      x: -2,
      y: 1.8,
      z: 0,
      sx: 0.3,
      sy: 3.6,
      sz: 0.3,
    },
    {
      shape: 'cylinder',
      color: '#ece6d4',
      finish: 'metal',
      x: 2,
      y: 1.8,
      z: 0,
      sx: 0.3,
      sy: 3.6,
      sz: 0.3,
    },
    {
      shape: 'cylinder',
      color: '#ece6d4',
      finish: 'metal',
      x: 0,
      y: 3.6,
      z: 0,
      sx: 0.3,
      sy: 4.3,
      sz: 0.3,
      rz: Math.PI / 2,
    },
  ],
  button: () => [
    { shape: 'cylinder', color: '#d8504a', x: 0, y: 0.25, z: 0, sx: 4, sy: 0.5, sz: 4 },
    ...[
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ].map(([x, z]) => ({
      shape: 'cylinder' as const,
      color: '#7a2a26',
      x,
      y: 0.5,
      z,
      sx: 0.45,
      sy: 0.04,
      sz: 0.45,
    })),
  ],
  teacup: () => [
    { shape: 'cylinder', color: '#f4efe6', x: 0, y: 0.2, z: 0, sx: 8.5, sy: 0.4, sz: 8.5 },
    { shape: 'cup', color: '#f4efe6', x: 0, y: 0.4, z: 0, sx: 6, sy: 4, sz: 6 },
    { shape: 'cylinder', color: '#8a5a32', x: 0, y: 3.6, z: 0, sx: 5.2, sy: 0.08, sz: 5.2 },
    { shape: 'torus', color: '#f4efe6', x: 3.4, y: 2.6, z: 0, sx: 2, sy: 2, sz: 2.4 },
    {
      shape: 'torus',
      color: '#5a8ac8',
      x: 0,
      y: 3.2,
      z: 0,
      sx: 6.1,
      sy: 6.1,
      sz: 0.4,
      rx: Math.PI / 2,
    },
  ],
  'acorn-cap': () => [
    { shape: 'sphere', color: '#8a6234', x: 0, y: 0.6, z: 0, sx: 4.4, sy: 2.4, sz: 4.4 },
    { shape: 'cylinder', color: '#6a4a26', x: 0, y: 1.9, z: 0, sx: 0.5, sy: 1.2, sz: 0.5, rz: 0.4 },
  ],
  conker: () => [
    {
      shape: 'sphere',
      color: '#6a3418',
      finish: 'metal',
      x: 0,
      y: 1.8,
      z: 0,
      sx: 3.8,
      sy: 3.5,
      sz: 3.8,
    },
    { shape: 'sphere', color: '#c8a878', x: 0, y: 3.3, z: 0.6, sx: 1.8, sy: 0.6, sz: 1.6 },
  ],
  spool: () => [
    { shape: 'cylinder', color: '#c8a070', x: 0, y: 0.3, z: 0, sx: 4.4, sy: 0.6, sz: 4.4 },
    { shape: 'cylinder', color: '#c84a4a', x: 0, y: 2.4, z: 0, sx: 3.6, sy: 3.6, sz: 3.6 },
    { shape: 'cylinder', color: '#c8a070', x: 0, y: 4.5, z: 0, sx: 4.4, sy: 0.6, sz: 4.4 },
  ],
  'pocket-watch': () => [
    {
      shape: 'cylinder',
      color: '#d4a84a',
      finish: 'metal',
      x: 0,
      y: 0.35,
      z: 0,
      sx: 7,
      sy: 0.7,
      sz: 7,
    },
    { shape: 'cylinder', color: '#f6f0e0', x: 0, y: 0.72, z: 0, sx: 6, sy: 0.06, sz: 6 },
    { shape: 'box', color: '#2a1d14', x: 0.9, y: 0.78, z: 0, sx: 1.9, sy: 0.05, sz: 0.18 },
    { shape: 'box', color: '#2a1d14', x: 0, y: 0.79, z: -1.2, sx: 0.14, sy: 0.05, sz: 2.5 },
    {
      shape: 'cylinder',
      color: '#d4a84a',
      finish: 'metal',
      x: 0,
      y: 0.35,
      z: -3.9,
      sx: 0.9,
      sy: 0.9,
      sz: 0.9,
      rx: Math.PI / 2,
    },
    {
      shape: 'torus',
      color: '#d4a84a',
      finish: 'metal',
      x: 0,
      y: 0.35,
      z: -4.8,
      sx: 1.4,
      sy: 1.4,
      sz: 1.4,
      rx: Math.PI / 2,
    },
  ],
  thimble: () => [
    {
      shape: 'cup',
      color: '#c8ccd2',
      finish: 'metal',
      x: 0,
      y: 3.4,
      z: 0,
      sx: 3,
      sy: 3.4,
      sz: 3,
      rx: Math.PI,
    },
  ],
  coin: () => [
    {
      shape: 'cylinder',
      color: '#c8843a',
      finish: 'metal',
      x: 0,
      y: 0.2,
      z: 0,
      sx: 4.2,
      sy: 0.4,
      sz: 4.2,
    },
  ],
  candle: () => [
    { shape: 'cylinder', color: '#f2e6c8', x: 0, y: 3, z: 0, sx: 2, sy: 6, sz: 2 },
    { shape: 'cylinder', color: '#2a1d14', x: 0, y: 6.3, z: 0, sx: 0.1, sy: 0.6, sz: 0.1 },
    {
      shape: 'sphere',
      color: '#ffd27a',
      finish: 'glow',
      x: 0,
      y: 6.9,
      z: 0,
      sx: 0.6,
      sy: 1.1,
      sz: 0.6,
    },
  ],
  'book-stack': () => [
    { shape: 'box', color: '#2e4a6a', x: 0, y: 0.6, z: 0, sx: 8, sy: 1.2, sz: 5.6 },
    { shape: 'box', color: '#7a2e2a', x: 0.3, y: 1.7, z: 0.2, sx: 7.2, sy: 1, sz: 5, ry: 0.15 },
    {
      shape: 'box',
      color: '#3e5a32',
      x: -0.2,
      y: 2.6,
      z: -0.1,
      sx: 6.6,
      sy: 0.8,
      sz: 4.6,
      ry: -0.1,
    },
  ],
  'plant-label': () => [
    { shape: 'box', color: '#f4f0e4', x: 0, y: 2.5, z: 0, sx: 0.6, sy: 5, sz: 0.12 },
    { shape: 'box', color: '#f4f0e4', x: 0, y: 5.4, z: 0, sx: 2.2, sy: 1.4, sz: 0.12 },
    { shape: 'box', color: '#3a6a3a', x: 0, y: 5.4, z: 0.07, sx: 1.6, sy: 0.2, sz: 0.02 },
  ],
  'lily-pad': () => [
    { shape: 'cylinder', color: '#4f8a3a', x: 0, y: 0.05, z: 0, sx: 7, sy: 0.1, sz: 7 },
  ],
  gear: () => {
    const pieces: Piece[] = [
      {
        shape: 'cylinder',
        color: '#b08a48',
        finish: 'metal',
        x: 0,
        y: 0.3,
        z: 0,
        sx: 6,
        sy: 0.6,
        sz: 6,
      },
      {
        shape: 'cylinder',
        color: '#3a3428',
        finish: 'metal',
        x: 0,
        y: 0.45,
        z: 0,
        sx: 1.2,
        sy: 0.7,
        sz: 1.2,
      },
    ];
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      pieces.push({
        shape: 'box',
        color: '#b08a48',
        finish: 'metal',
        x: Math.cos(angle) * 3.1,
        y: 0.3,
        z: Math.sin(angle) * 3.1,
        sx: 0.7,
        sy: 0.6,
        sz: 0.6,
        ry: -angle,
      });
    }
    return pieces;
  },
};

/** Settings whose field is edged with giant grass and flowers rather than a ring of trees. */
export const GRASS_BORDER_THEMES: readonly LevelDefinition['theme'][] = ['meadow', 'marsh', 'dusk'];

/** Each setting's giant border: blade colours, flower petals and centres. */
const BORDER_LOOK: Partial<
  Record<LevelDefinition['theme'], { blades: string[]; petals: string[]; centre: string }>
> = {
  meadow: {
    blades: ['#4f8a34', '#5d9a3c', '#6aa646', '#3f7a2c'],
    petals: ['#fbf6ea', '#f6d24a', '#f2a8c0'],
    centre: '#e8b028',
  },
  marsh: {
    blades: ['#5a7a3a', '#7a8a3a', '#9a9a4a', '#4a6a3a'],
    petals: ['#d8c8f0', '#f6e6a0'],
    centre: '#8a5a2a',
  },
  dusk: {
    blades: ['#3f6a4a', '#4a5a6a', '#5a7a5a', '#36504a'],
    petals: ['#e8d8ff', '#ffe6a8'],
    centre: '#ffd27a',
  },
};

/**
 * The field's edge at insect scale: blades of grass taller than the walls, and flowers on stems
 * among them, in two or three ragged rows just outside the field. `density` thins them for lower
 * graphics. Spots near a prop are left clear, as the tree ring does.
 */
export function borderPieces(level: LevelDefinition, density = 1): Piece[] {
  const look = BORDER_LOOK[level.theme];
  if (!look || !GRASS_BORDER_THEMES.includes(level.theme)) return [];
  const rng = new Rng(level.seed * 389 + 5);
  const pieces: Piece[] = [];
  const hw = level.width / 2;
  const hd = level.depth / 2;
  const props = level.props ?? [];
  const clear = (x: number, z: number) =>
    props.every((prop) => Math.hypot(x - prop.x, z - prop.z) > 9 * (prop.scale ?? 1));
  const spacing = 1.5 / Math.max(0.25, density);
  const blade = (x: number, z: number, row: number) => {
    if (!clear(x, z)) return;
    const height = rng.range(5, 13) * (1 - row * 0.12);
    const lean = rng.range(-0.18, 0.18);
    pieces.push({
      shape: 'cone',
      color: pick(rng, look.blades),
      finish: 'sway',
      x,
      y: height / 2,
      z,
      sx: rng.range(0.7, 1.2),
      sy: height,
      sz: 0.22,
      ry: rng.range(0, Math.PI),
      rx: lean,
      rz: rng.range(-0.18, 0.18),
    });
  };
  const flower = (x: number, z: number) => {
    if (!clear(x, z)) return;
    const height = rng.range(7, 12);
    const petals = pick(rng, look.petals);
    pieces.push(
      {
        shape: 'cylinder',
        color: '#4f7f36',
        finish: 'sway',
        x,
        y: height / 2,
        z,
        sx: 0.32,
        sy: height,
        sz: 0.32,
      },
      {
        shape: 'cylinder',
        color: petals,
        finish: 'sway',
        x,
        y: height + 0.05,
        z,
        sx: 3.2,
        sy: 0.18,
        sz: 3.2,
        rx: rng.range(-0.3, 0.3),
      },
      {
        shape: 'sphere',
        color: look.centre,
        finish: 'sway',
        x,
        y: height + 0.25,
        z,
        sx: 1.1,
        sy: 0.5,
        sz: 1.1,
      },
    );
  };
  for (let row = 0; row < 3; row++) {
    const out = 2.5 + row * 2.2;
    for (let x = -hw - out; x <= hw + out; x += spacing) {
      blade(x + rng.range(-0.5, 0.5), -hd - out - rng.range(0, 1.5), row);
      blade(x + rng.range(-0.5, 0.5), hd + out + rng.range(0, 1.5), row);
    }
    for (let z = -hd; z <= hd; z += spacing) {
      blade(-hw - out - rng.range(0, 1.5), z + rng.range(-0.5, 0.5), row);
      blade(hw + out + rng.range(0, 1.5), z + rng.range(-0.5, 0.5), row);
    }
  }
  const flowerSpacing = 9 / Math.max(0.25, density);
  for (let x = -hw; x <= hw; x += flowerSpacing) {
    flower(x + rng.range(-2, 2), -hd - rng.range(3, 6));
    flower(x + rng.range(-2, 2), hd + rng.range(3, 6));
  }
  for (let z = -hd + 4; z <= hd - 4; z += flowerSpacing) {
    flower(-hw - rng.range(3, 6), z + rng.range(-2, 2));
    flower(hw + rng.range(3, 6), z + rng.range(-2, 2));
  }
  return pieces;
}

/**
 * Lily pads on the marsh's water, now and then with a flower, kept a little in from the banks.
 * Art only: they float over anything sunk beneath them.
 */
export function waterPieces(level: LevelDefinition, density = 1): Piece[] {
  if (level.theme !== 'marsh') return [];
  const rng = new Rng(level.seed * 613 + 3);
  const pieces: Piece[] = [];
  for (const box of level.water ?? []) {
    const count = Math.round(((box.w * box.d) / 22) * density);
    for (let i = 0; i < count; i++) {
      const inset = 0.9;
      if (box.w <= inset * 2 || box.d <= inset * 2) break;
      const x = box.x + rng.range(-box.w / 2 + inset, box.w / 2 - inset);
      const z = box.z + rng.range(-box.d / 2 + inset, box.d / 2 - inset);
      const size = rng.range(1.1, 2.3);
      pieces.push({
        shape: 'cylinder',
        color: pick(rng, ['#4f8a3a', '#5e9a44', '#3f7a32']),
        x,
        y: 0.08,
        z,
        sx: size,
        sy: 0.05,
        sz: size,
      });
      if (rng.next() < 0.18) {
        pieces.push({
          shape: 'sphere',
          color: pick(rng, ['#f2b8d0', '#fbf2e6']),
          x,
          y: 0.28,
          z,
          sx: 0.55,
          sy: 0.4,
          sz: 0.55,
        });
      }
    }
  }
  return pieces;
}
