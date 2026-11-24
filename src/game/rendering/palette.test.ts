import { describe, expect, it } from 'vitest';
import { PALETTES } from '../core/settings';
import { SPROUT_KINDS } from '../workers/sprouts';
import { mix, PALETTE_SETS } from './palette';

/*
 * Checks that the colours that carry meaning stay apart for the players each palette is for.
 * Colour vision deficiency is simulated with the Machado, Oliveira and Fernandes (2009)
 * matrices at full severity, in linear RGB; distance is CIE76 delta E in Lab. A delta E of
 * about 2 is just noticeable; 20 and more reads as clearly different colours.
 */

type Vision = 'normal' | 'deuteranopia' | 'protanopia' | 'tritanopia';
const MATRICES: Record<Vision, readonly (readonly number[])[]> = {
  normal: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function lab(hex: string, vision: Vision): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  const rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(linear);
  const m = MATRICES[vision];
  const [r, g, b] = m.map((row) =>
    Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])),
  );
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE(a: string, b: string, vision: Vision): number {
  const [l1, a1, b1] = lab(a, vision);
  const [l2, a2, b2] = lab(b, vision);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

function closestPair(colours: readonly string[], vision: Vision): number {
  let closest = Infinity;
  for (let i = 0; i < colours.length; i++) {
    for (let j = i + 1; j < colours.length; j++) {
      closest = Math.min(closest, deltaE(colours[i], colours[j], vision));
    }
  }
  return closest;
}

const bodies = (name: keyof typeof PALETTE_SETS): string[] =>
  SPROUT_KINDS.map((kind) => PALETTE_SETS[name].kinds[kind].body);

describe('palettes', () => {
  it('mixes colours', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#e8432d', '#e8432d', 0.3)).toBe('#e8432d');
  });

  it('defines every colour as #rrggbb in every palette', () => {
    for (const name of PALETTES) {
      const palette = PALETTE_SETS[name];
      const colours = [
        ...SPROUT_KINDS.flatMap((kind) => Object.values(palette.kinds[kind])),
        ...Object.values(palette.hazards),
        ...Object.values(palette.ranks),
      ];
      for (const colour of colours) expect(colour).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('keeps the four kinds far apart for the players each palette is for', () => {
    expect(closestPair(bodies('deuteranopia'), 'deuteranopia')).toBeGreaterThan(50);
    expect(closestPair(bodies('deuteranopia'), 'protanopia')).toBeGreaterThan(40);
    expect(closestPair(bodies('tritanopia'), 'tritanopia')).toBeGreaterThan(45);
    // Each colour-blind palette does better for its players than the standard one.
    expect(closestPair(bodies('deuteranopia'), 'deuteranopia')).toBeGreaterThan(
      closestPair(bodies('default'), 'deuteranopia') + 15,
    );
    expect(closestPair(bodies('tritanopia'), 'tritanopia')).toBeGreaterThan(
      closestPair(bodies('default'), 'tritanopia') + 15,
    );
    // And still reads well with ordinary colour vision.
    for (const name of PALETTES) expect(closestPair(bodies(name), 'normal')).toBeGreaterThan(45);
  });

  it('keeps attack warnings clear of each other and of grass', () => {
    const grass = '#5a8a3a';
    for (const [name, vision] of [
      ['deuteranopia', 'deuteranopia'],
      ['tritanopia', 'tritanopia'],
    ] as const) {
      const { danger, drip, arc, stomp } = PALETTE_SETS[name].hazards;
      for (const ring of [danger, drip, arc, stomp]) {
        expect(deltaE(ring, grass, vision)).toBeGreaterThan(30);
      }
      expect(deltaE(danger, arc, vision)).toBeGreaterThan(30);
    }
    // The standard red ring all but vanishes on grass for red-green colour blindness; the
    // palette for it does not.
    expect(deltaE(PALETTE_SETS.default.hazards.danger, grass, 'deuteranopia')).toBeLessThan(
      deltaE(PALETTE_SETS.deuteranopia.hazards.danger, grass, 'deuteranopia'),
    );
  });

  it('spreads the medal colours further apart for colour-blind players', () => {
    const ranks = (name: keyof typeof PALETTE_SETS): string[] =>
      Object.values(PALETTE_SETS[name].ranks);
    expect(closestPair(ranks('deuteranopia'), 'deuteranopia')).toBeGreaterThan(
      closestPair(ranks('default'), 'deuteranopia') * 1.5,
    );
    expect(closestPair(ranks('tritanopia'), 'tritanopia')).toBeGreaterThan(
      closestPair(ranks('default'), 'tritanopia') * 1.5,
    );
  });
});
