import type { PaletteName } from '../core/settings';
import { SPROUT_KINDS, type SproutKind } from '../workers/sprouts';
import type { Rank } from '../dandori/scoring';

/**
 * Colours that carry meaning: the four kinds of Sproutling, the rings that warn of an attack
 * landing, and the medal ranks. Each palette keeps them apart for a group of players: the two
 * colour-blind palettes were chosen by simulating deuteranopia and tritanopia (palette.test.ts
 * checks every pair stays far apart). Plain data with no three.js, so menus can use it too.
 *
 * Colour is never the only cue: each kind also has its own head shape and HUD glyph.
 */

export interface KindColours {
  /** Body in the squad, at work (darker) and idle (paler). */
  body: string;
  work: string;
  idle: string;
  /** The glowing head ornament, lit and cold. */
  crown: string;
  crownCold: string;
  /** Text on the dark HUD, readable at small sizes. */
  text: string;
}

export interface HazardColours {
  /** Anything that hurts where it lands: globs, pebbles, slams, a charger's lane. */
  danger: string;
  stomp: string;
  flame: string;
  arc: string;
  drip: string;
}

export interface Palette {
  kinds: Record<SproutKind, KindColours>;
  hazards: HazardColours;
  ranks: Record<Rank, string>;
}

/** Mixes two #rrggbb colours: 0 gives `a`, 1 gives `b`. */
export function mix(a: string, b: string, t: number): string {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const x = (ca >> shift) & 255;
    const y = (cb >> shift) & 255;
    out |= Math.round(x + (y - x) * t) << shift;
  }
  return `#${out.toString(16).padStart(6, '0')}`;
}

/** A kind's full set from its body colour: darker at work, paler idle, brighter crown and text. */
function kind(body: string, crown = mix(body, '#ffffff', 0.45)): KindColours {
  return {
    body,
    work: mix(body, '#000000', 0.22),
    idle: mix(body, '#ffffff', 0.55),
    crown,
    crownCold: mix(mix(body, '#808890', 0.6), '#000000', 0.15),
    text: mix(body, '#ffffff', 0.5),
  };
}

export const PALETTE_SETS: Record<PaletteName, Palette> = {
  default: {
    kinds: {
      ember: {
        body: '#e8432d',
        work: '#b8301f',
        idle: '#d9a79c',
        crown: '#ffb02e',
        crownCold: '#8fa3ad',
        text: '#ffb08a',
      },
      dew: {
        body: '#3a8ae8',
        work: '#2a68b8',
        idle: '#a8c4e0',
        crown: '#9ae0ff',
        crownCold: '#7a98a8',
        text: '#9ac8ff',
      },
      stone: {
        body: '#8a8a92',
        work: '#6a6a72',
        idle: '#c4c4c8',
        crown: '#d8d4c8',
        crownCold: '#9a9890',
        text: '#d8d8de',
      },
      spark: {
        body: '#f2c62a',
        work: '#c89a1a',
        idle: '#ecdca0',
        crown: '#fff27a',
        crownCold: '#a8a070',
        text: '#ffe68a',
      },
    },
    hazards: {
      danger: '#ff5a3c',
      stomp: '#ffb02a',
      flame: '#ff7a1a',
      arc: '#ffe84a',
      drip: '#5ab8ff',
    },
    ranks: {
      Diamond: '#f2fbff',
      Platinum: '#c9f1ff',
      Gold: '#ffd257',
      Silver: '#d5dbe0',
      Bronze: '#d99562',
      Copper: '#c4734a',
    },
  },
  // Red-green colour blindness: a deep red, a strong blue, a cool grey and a lemon yellow sit
  // far apart in lightness as well as hue. Warnings move to magenta, yellow and white.
  deuteranopia: {
    kinds: {
      ember: kind('#b3130a', '#ff7a3a'),
      dew: kind('#1f6ef0', '#8ac4ff'),
      stone: kind('#717181', '#d8d8e4'),
      spark: kind('#f9f008', '#fffa9a'),
    },
    hazards: {
      danger: '#ff2fd0',
      stomp: '#ffd400',
      flame: '#ff8c00',
      arc: '#ffffff',
      drip: '#3fa9ff',
    },
    ranks: {
      Diamond: '#ffffff',
      Platinum: '#8fd3ff',
      Gold: '#ffe100',
      Silver: '#b8b8c8',
      Bronze: '#c08a2a',
      Copper: '#8a5a00',
    },
  },
  // Blue-yellow colour blindness: red, sky blue, a dark grey and a pale gold; warnings in red,
  // pink, orange, white and teal.
  tritanopia: {
    kinds: {
      ember: kind('#b82619', '#ff6a50'),
      dew: kind('#1dbaf2', '#a0ecff'),
      stone: kind('#4d4d4d', '#b8b8b8'),
      spark: kind('#f4dc57', '#fff3b0'),
    },
    hazards: {
      danger: '#ff1a3c',
      stomp: '#ff9ad5',
      flame: '#ff6a00',
      arc: '#ffffff',
      drip: '#00e5d0',
    },
    ranks: {
      Diamond: '#ffffff',
      Platinum: '#7fe8ff',
      Gold: '#ffb0c8',
      Silver: '#b8b8b8',
      Bronze: '#e05a3a',
      Copper: '#a02a2a',
    },
  },
};

/** Sets the palette's colours as CSS custom properties, which the stylesheet reads. */
export function applyPalette(name: PaletteName, root: HTMLElement): void {
  const palette = PALETTE_SETS[name];
  for (const k of SPROUT_KINDS) {
    root.style.setProperty(`--kind-${k}`, palette.kinds[k].body);
    root.style.setProperty(`--kind-${k}-work`, palette.kinds[k].work);
    root.style.setProperty(`--kind-${k}-text`, palette.kinds[k].text);
  }
  for (const [rank, colour] of Object.entries(palette.ranks)) {
    root.style.setProperty(`--rank-${rank.toLowerCase()}`, colour);
  }
  root.style.setProperty('--danger', palette.hazards.danger);
}
