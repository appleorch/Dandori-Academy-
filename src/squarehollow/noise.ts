/** Seeded hashing and smooth value noise, enough to grow a world from one number. */

/** A whole-number hash of up to three lattice coordinates and a seed, as a number in [0, 1). */
export function hash(x: number, y: number, z: number, seed: number): number {
  let h = seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h ^= Math.imul(z | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A small, fast seeded random number generator. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Smooth noise on a plane, from -1 to 1. One lattice cell per unit. */
export function noise2(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const tz = fade(z - z0);
  const a = hash(x0, 0, z0, seed);
  const b = hash(x0 + 1, 0, z0, seed);
  const c = hash(x0, 0, z0 + 1, seed);
  const d = hash(x0 + 1, 0, z0 + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz) * 2 - 1;
}

/** Smooth noise in space, from -1 to 1. */
export function noise3(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const tz = fade(z - z0);
  const corner = (dx: number, dy: number, dz: number): number =>
    hash(x0 + dx, y0 + dy, z0 + dz, seed);
  const near = lerp(
    lerp(corner(0, 0, 0), corner(1, 0, 0), tx),
    lerp(corner(0, 1, 0), corner(1, 1, 0), tx),
    ty,
  );
  const far = lerp(
    lerp(corner(0, 0, 1), corner(1, 0, 1), tx),
    lerp(corner(0, 1, 1), corner(1, 1, 1), tx),
    ty,
  );
  return lerp(near, far, tz) * 2 - 1;
}

/** Several octaves of plane noise, each twice as fine and half as strong. Roughly -1 to 1. */
export function fbm2(x: number, z: number, seed: number, octaves: number): number {
  let sum = 0;
  let amplitude = 1;
  let scale = 1;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * scale, z * scale, seed + i * 101) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    scale *= 2;
  }
  return sum / total;
}
