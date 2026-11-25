import type { Ledge } from '../navigation/NavGrid';
import type { Rect } from './carve';
import type { Plateau, Ramp, Wall, WallLook } from './levelTypes';

/**
 * Builders for the large Curriculum courses: raised terraces with cliff edges, the ramps
 * that climb them, the ledges that drop off them, and ruined walls. Each returns plain
 * level data, so a course is still just a LevelSpec.
 */

export type Side = 'n' | 's' | 'e' | 'w';

/** A gap in a terrace edge: a ramp up to it, or a one-way drop off it. */
export interface Opening {
  side: Side;
  /** Where along the side the gap runs, in world coordinates (x for n/s, z for e/w). */
  from: number;
  to: number;
  kind: 'ramp' | 'ledge';
  /** How far a ramp runs out from the edge. */
  length?: number;
}

export interface Terrace {
  plateau: Plateau;
  walls: Wall[];
  ramps: Ramp[];
  ledges: Ledge[];
}

/** Outward direction of each side: north is -z. */
const OUT: Record<Side, readonly [number, number]> = {
  n: [0, -1],
  s: [0, 1],
  w: [-1, 0],
  e: [1, 0],
};

const EDGE = 1;
const PARAPET = 0.6;
const RAMP_LENGTH = 6;

/** Splits [from, to] around the gaps, returning the solid stretches. */
function solidRuns(
  from: number,
  to: number,
  gaps: readonly (readonly [number, number])[],
): [number, number][] {
  const runs: [number, number][] = [];
  let at = from;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > at) runs.push([at, a]);
    at = Math.max(at, b);
  }
  if (at < to) runs.push([at, to]);
  return runs;
}

function wall(x0: number, z0: number, x1: number, z1: number, look: WallLook): Wall {
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, look };
}

/**
 * A raised terrace on rect [x0, z0, x1, z1], walled by cliffs except at its openings.
 * `base` is the height of the ground it stands on, for a tier built on another terrace.
 */
export function terrace(
  rect: Rect,
  height: number,
  openings: readonly Opening[],
  base = 0,
): Terrace {
  const [x0, z0, x1, z1] = rect;
  const result: Terrace = {
    plateau: { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, height },
    walls: [],
    ramps: [],
    ledges: [],
  };
  const gapsOn = (side: Side): [number, number][] =>
    openings.filter((o) => o.side === side).map((o) => [o.from, o.to]);
  // North and south edges run the full width; east and west fit between them.
  for (const run of solidRuns(x0, x1, gapsOn('n')))
    result.walls.push(wall(run[0], z0, run[1], z0 + EDGE, 'cliff'));
  for (const run of solidRuns(x0, x1, gapsOn('s')))
    result.walls.push(wall(run[0], z1 - EDGE, run[1], z1, 'cliff'));
  for (const run of solidRuns(z0 + EDGE, z1 - EDGE, gapsOn('w')))
    result.walls.push(wall(x0, run[0], x0 + EDGE, run[1], 'cliff'));
  for (const run of solidRuns(z0 + EDGE, z1 - EDGE, gapsOn('e')))
    result.walls.push(wall(x1 - EDGE, run[0], x1, run[1], 'cliff'));

  for (const opening of openings) {
    const [ox, oz] = OUT[opening.side];
    const { from, to } = opening;
    // The strip of edge the opening replaces.
    const edge: [number, number, number, number] =
      opening.side === 'n'
        ? [from, z0, to, z0 + EDGE]
        : opening.side === 's'
          ? [from, z1 - EDGE, to, z1]
          : opening.side === 'w'
            ? [x0, from, x0 + EDGE, to]
            : [x1 - EDGE, from, x1, to];
    if (opening.kind === 'ledge') {
      const [a, b, c, d] = edge;
      result.ledges.push({ x: (a + c) / 2, z: (b + d) / 2, w: c - a, d: d - b, dx: ox, dz: oz });
      continue;
    }
    const length = opening.length ?? RAMP_LENGTH;
    // The ramp lies outside the edge and rises inward, toward the terrace.
    let ramp: [number, number, number, number];
    if (opening.side === 'n') ramp = [from, z0 - length, to, z0];
    else if (opening.side === 's') ramp = [from, z1, to, z1 + length];
    else if (opening.side === 'w') ramp = [x0 - length, from, x0, to];
    else ramp = [x1, from, x1 + length, to];
    const [a, b, c, d] = ramp;
    result.ramps.push({
      x: (a + c) / 2,
      z: (b + d) / 2,
      w: c - a,
      d: d - b,
      height,
      base,
      dx: -ox,
      dz: -oz,
    });
    // Low stone parapets keep the ramp a ramp: it is climbed from its foot, not its sides.
    if (ox === 0) {
      result.walls.push(
        wall(a - PARAPET, b, a, d, 'parapet'),
        wall(c, b, c + PARAPET, d, 'parapet'),
      );
    } else {
      result.walls.push(
        wall(a, b - PARAPET, c, b, 'parapet'),
        wall(a, d, c, d + PARAPET, 'parapet'),
      );
    }
  }
  return result;
}

/** Gathers terraces into the level fields they fill. */
export function terraces(...built: Terrace[]): {
  plateaus: Plateau[];
  ramps: Ramp[];
  ledges: Ledge[];
  walls: Wall[];
} {
  return {
    plateaus: built.map((t) => t.plateau),
    ramps: built.flatMap((t) => t.ramps),
    ledges: built.flatMap((t) => t.ledges),
    walls: built.flatMap((t) => t.walls),
  };
}

/** A ruined wall along a line, from one corner of its rect to the other. */
export function ruin(rect: Rect): Wall {
  const [x0, z0, x1, z1] = rect;
  return wall(x0, z0, x1, z1, 'ruin');
}

/**
 * A high ledge only a Sparkling can reach: a broad low terrace with a small high one on it, its
 * middle at (x + 15, z). Neither has a ramp, only a one-way drop back down (both on the west),
 * so the Warden stands at least eleven units from the high top: beyond every kind's throw but a
 * Sparkling's. Whatever lands up there comes down the drops on its own.
 */
export function sparkLedge(x: number, z: number) {
  return terraces(
    terrace([x, z - 15, x + 30, z + 15], 3, [{ side: 'w', from: z - 3, to: z + 3, kind: 'ledge' }]),
    terrace(
      [x + 11, z - 4, x + 19, z + 4],
      6,
      [{ side: 'w', from: z - 2, to: z + 2, kind: 'ledge' }],
      3,
    ),
  );
}

/** Which corner of a field a corner ledge sits in. */
export type Corner = 'NE' | 'NW' | 'SE' | 'SW';

/**
 * A high ledge in a corner of the field, only a Sparkling can reach: a low terrace twenty units
 * square in the corner with a small high one in the very corner on it. The field's edges guard
 * two sides; the low terrace keeps the Warden at least eleven units from the high top on the
 * others. Both have only drops back down, facing into the field. `top` is the high top's middle.
 */
export function cornerLedge(width: number, depth: number, corner: Corner) {
  const S = 20;
  const H = 8;
  const east = corner.endsWith('E');
  const north = corner.startsWith('N');
  const x0 = east ? width / 2 - S : -width / 2;
  const z0 = north ? -depth / 2 : depth / 2 - S;
  const hx0 = east ? width / 2 - H : -width / 2;
  const hz0 = north ? -depth / 2 : depth / 2 - H;
  const side = east ? 'w' : 'e';
  const course = terraces(
    terrace([x0, z0, x0 + S, z0 + S], 3, [
      { side, from: z0 + S / 2 - 3, to: z0 + S / 2 + 3, kind: 'ledge' },
    ]),
    terrace(
      [hx0, hz0, hx0 + H, hz0 + H],
      6,
      [{ side, from: hz0 + 2, to: hz0 + H - 2, kind: 'ledge' }],
      3,
    ),
  );
  return { ...course, top: { x: hx0 + H / 2, z: hz0 + H / 2 } };
}
