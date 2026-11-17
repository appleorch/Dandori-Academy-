import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { Rng } from '../core/rng';

/**
 * Procedural textures painted on canvases at load time, so the game ships no image
 * files. Every texture tiles seamlessly because its noise lattice wraps.
 */

/** Tileable value noise: a lattice of random values, `period` cells across, smoothly blended. */
class TileNoise {
  private readonly values: Float32Array;

  constructor(
    private readonly period: number,
    seed: number,
  ) {
    const rng = new Rng(seed);
    this.values = new Float32Array(period * period).map(() => rng.next());
  }

  private at(x: number, y: number): number {
    const p = this.period;
    return this.values[(((y % p) + p) % p) * p + (((x % p) + p) % p)];
  }

  /** Noise at (u, v) in 0..1 texture space, returning 0..1. */
  sample(u: number, v: number): number {
    const x = u * this.period;
    const y = v * this.period;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = this.at(x0, y0) + (this.at(x0 + 1, y0) - this.at(x0, y0)) * sx;
    const bottom = this.at(x0, y0 + 1) + (this.at(x0 + 1, y0 + 1) - this.at(x0, y0 + 1)) * sx;
    return top + (bottom - top) * sy;
  }
}

/** Fractal noise: several octaves of tileable noise, each twice as fine and half as strong. */
function fractal(octaves: TileNoise[], u: number, v: number): number {
  let sum = 0;
  let weight = 0.5;
  let total = 0;
  for (const octave of octaves) {
    sum += octave.sample(u, v) * weight;
    total += weight;
    weight *= 0.5;
  }
  return sum / total;
}

function octaves(seed: number, base: number, count: number): TileNoise[] {
  return Array.from({ length: count }, (_, i) => new TileNoise(base * 2 ** i, seed + i * 101));
}

type Rgb = readonly [number, number, number];

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface Painted {
  color: Texture;
  bump: Texture;
}

/** Paints a colour map and a matching height (bump) map from one function. */
function paint(
  size: number,
  pixel: (u: number, v: number) => { rgb: Rgb; height: number },
): Painted {
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = bumpCanvas.width = bumpCanvas.height = size;
  const colorContext = colorCanvas.getContext('2d');
  const bumpContext = bumpCanvas.getContext('2d');
  if (!colorContext || !bumpContext) throw new Error('Canvas 2D is unavailable');
  const colorData = colorContext.createImageData(size, size);
  const bumpData = bumpContext.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { rgb, height } = pixel(x / size, y / size);
      const i = (y * size + x) * 4;
      colorData.data[i] = rgb[0];
      colorData.data[i + 1] = rgb[1];
      colorData.data[i + 2] = rgb[2];
      colorData.data[i + 3] = 255;
      const h = Math.max(0, Math.min(255, height * 255));
      bumpData.data[i] = bumpData.data[i + 1] = bumpData.data[i + 2] = h;
      bumpData.data[i + 3] = 255;
    }
  }
  colorContext.putImageData(colorData, 0, 0);
  bumpContext.putImageData(bumpData, 0, 0);
  const finish = (canvas: HTMLCanvasElement, srgb: boolean): Texture => {
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.anisotropy = 8;
    if (srgb) texture.colorSpace = SRGBColorSpace;
    return texture;
  };
  return { color: finish(colorCanvas, true), bump: finish(bumpCanvas, false) };
}

const GRASS_DARK: Rgb = [58, 104, 44];
const GRASS_MID: Rgb = [92, 146, 58];
const GRASS_LIGHT: Rgb = [140, 182, 76];
const SOIL: Rgb = [122, 98, 64];

/** Three shades of ground cover, darkest first. */
export type Turf = readonly [Rgb, Rgb, Rgb];

/** Lawn: patchy shades of the turf, short blade streaks and the odd bare patch of soil. */
export function grassTextures(turf: Turf = [GRASS_DARK, GRASS_MID, GRASS_LIGHT]): Painted {
  const broad = octaves(11, 4, 4);
  const blades = octaves(23, 64, 2);
  const patches = octaves(37, 3, 3);
  return paint(512, (u, v) => {
    const tone = fractal(broad, u, v);
    const streak = fractal(blades, u, v * 0.35);
    let rgb = mix(turf[0], turf[1], Math.min(1, tone * 1.5));
    rgb = mix(rgb, turf[2], Math.max(0, streak - 0.5) * 1.6);
    const bare = Math.max(0, fractal(patches, u, v) - 0.74) * 4;
    rgb = mix(rgb, SOIL, Math.min(0.85, bare));
    return { rgb, height: 0.35 + streak * 0.5 - bare * 0.3 };
  });
}

/** Sun-warmed stone: grey-brown mottling, darker cracks, lighter flecks. */
export function stoneTextures(): Painted {
  const mottle = octaves(53, 4, 5);
  const cracks = octaves(71, 8, 2);
  return paint(256, (u, v) => {
    const m = fractal(mottle, u, v);
    const crack = Math.abs(fractal(cracks, u, v) - 0.5) < 0.025 ? 1 : 0;
    let rgb = mix([104, 98, 90], [168, 160, 146], m);
    rgb = mix(rgb, [70, 62, 56], crack * 0.7);
    return { rgb, height: m * 0.8 - crack * 0.4 + 0.2 };
  });
}

/** Fired clay for the Kiln. */
export function clayTextures(): Painted {
  const grain = octaves(89, 6, 4);
  return paint(256, (u, v) => {
    const g = fractal(grain, u, v);
    const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 18 + g * 4);
    return {
      rgb: mix([150, 78, 44], [196, 112, 64], g * 0.7 + band * 0.3),
      height: band * 0.6 + g * 0.4,
    };
  });
}

/** Packed earth for the clearing around the Kiln. */
export function soilTextures(): Painted {
  const grain = octaves(97, 8, 4);
  return paint(256, (u, v) => {
    const g = fractal(grain, u, v);
    return { rgb: mix([102, 80, 54], [150, 120, 82], g), height: g };
  });
}

/**
 * Old brickwork for ruined walls: staggered courses of weathered brick in pale mortar, with
 * moss creeping into the joints. One repeat is four courses of two bricks.
 */
export function brickTextures(): Painted {
  const tone = octaves(131, 8, 3);
  const moss = octaves(149, 4, 3);
  return paint(256, (u, v) => {
    const course = Math.floor(v * 4);
    const along = u * 2 + (course % 2) * 0.5;
    const brick = Math.floor(along);
    const fu = along - brick;
    const fv = v * 4 - course;
    const joint = fu < 0.05 || fu > 0.95 || fv < 0.08 || fv > 0.92;
    // Each brick its own shade.
    const shade = ((brick * 37 + course * 61) % 17) / 17;
    const t = fractal(tone, u, v);
    let rgb = mix([150, 92, 70], [196, 140, 104], shade * 0.6 + t * 0.4);
    if (joint) rgb = [206, 196, 172];
    const green = Math.max(0, fractal(moss, u, v) - 0.55) * 3;
    rgb = mix(rgb, [88, 128, 62], Math.min(0.85, green * (joint ? 1.4 : 0.7)));
    return { rgb, height: joint ? 0.15 : 0.6 + t * 0.4 };
  });
}

/** Cliff faces: horizontal strata of warm stone, darker in the cracks between layers. */
export function cliffTextures(): Painted {
  const grain = octaves(163, 6, 4);
  const layers = octaves(173, 3, 2);
  return paint(256, (u, v) => {
    const g = fractal(grain, u, v);
    const wobble = fractal(layers, u, v) * 0.18;
    const band = (v * 5 + wobble) % 1;
    const crack = band < 0.06 ? 1 : 0;
    let rgb = mix(
      [128, 110, 92],
      [184, 166, 138],
      g * 0.7 + (Math.floor(v * 5 + wobble) % 2) * 0.3,
    );
    rgb = mix(rgb, [70, 58, 48], crack * 0.8);
    return { rgb, height: g * 0.7 + 0.3 - crack * 0.5 };
  });
}

/** Woven wicker for the baskets Emberlings carry: an over-under weave of reed. */
export function weaveTextures(): Painted {
  const grain = octaves(191, 16, 2);
  return paint(128, (u, v) => {
    const row = Math.floor(v * 8);
    const col = Math.floor(u * 8);
    const over = (row + col) % 2 === 0;
    const fu = u * 8 - col;
    const fv = v * 8 - row;
    // Each strand bulges in the middle and dips at its ends.
    const swell = over ? Math.sin(fu * Math.PI) : Math.sin(fv * Math.PI);
    const g = fractal(grain, u, v);
    const rgb = mix([120, 82, 40], [214, 170, 100], swell * 0.7 + g * 0.3);
    return { rgb, height: swell };
  });
}

interface Textures {
  grass: Painted;
  stone: Painted;
  clay: Painted;
  soil: Painted;
  brick: Painted;
  cliff: Painted;
  weave: Painted;
}

let cached: Textures | null = null;

/** All textures, painted once and shared by every scene. */
export function gameTextures(): Textures {
  cached ??= {
    grass: grassTextures(),
    stone: stoneTextures(),
    clay: clayTextures(),
    soil: soilTextures(),
    brick: brickTextures(),
    cliff: cliffTextures(),
    weave: weaveTextures(),
  };
  return cached;
}

const turfs = new Map<string, Painted>();

/** Ground cover painted in a setting's own colours, once per setting. */
export function turfTextures(turf: Turf): Painted {
  const key = turf.flat().join(',');
  let painted = turfs.get(key);
  if (!painted) {
    painted = grassTextures(turf);
    turfs.set(key, painted);
  }
  return painted;
}
