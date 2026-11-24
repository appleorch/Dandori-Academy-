import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  LinearFilter,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { ATLAS_COLUMNS, ATLAS_ROWS, BLOCKS, TILE } from './blocks';
import { mulberry32 } from './noise';

/** Pixels on a side of one tile. */
export const TILE_SIZE = 64;

type Painter = (ink: CanvasRenderingContext2D, random: () => number) => void;

const S = TILE_SIZE;
const grey = (value: number, alpha = 1): string => {
  const v = Math.max(0, Math.min(255, Math.round(value)));
  return `rgba(${v}, ${v}, ${v}, ${alpha})`;
};

/** Soft mottling: blotches a little lighter and darker than the base. */
function mottle(ink: CanvasRenderingContext2D, random: () => number, base: number, spread: number) {
  ink.fillStyle = grey(base);
  ink.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const r = 2 + random() * 6;
    ink.fillStyle = grey(base + (random() - 0.5) * spread, 0.35);
    ink.beginPath();
    ink.arc(random() * S, random() * S, r, 0, Math.PI * 2);
    ink.fill();
  }
}

/** A rounded edge: dark at the rim, a little light just inside the top and left. */
function bevel(ink: CanvasRenderingContext2D, depth = 1) {
  ink.fillStyle = grey(0, 0.22 * depth);
  ink.fillRect(0, S - 3, S, 3);
  ink.fillRect(S - 3, 0, 3, S);
  ink.fillStyle = grey(0, 0.12 * depth);
  ink.fillRect(0, 0, S, 2);
  ink.fillRect(0, 0, 2, S);
  ink.fillStyle = grey(255, 0.16 * depth);
  ink.fillRect(2, 2, S - 5, 2);
  ink.fillRect(2, 2, 2, S - 5);
}

const PAINTERS: Record<number, Painter> = {
  [TILE.plain]: (ink, random) => {
    mottle(ink, random, 232, 30);
    bevel(ink);
  },
  [TILE.rough]: (ink, random) => {
    mottle(ink, random, 226, 44);
    // A few cracks and pits.
    ink.strokeStyle = grey(150, 0.5);
    ink.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      let x = random() * S;
      let y = random() * S;
      ink.beginPath();
      ink.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (random() - 0.5) * 22;
        y += (random() - 0.5) * 22;
        ink.lineTo(x, y);
      }
      ink.stroke();
    }
    for (let i = 0; i < 14; i++) {
      ink.fillStyle = grey(random() < 0.5 ? 170 : 255, 0.5);
      ink.fillRect(random() * S, random() * S, 2, 2);
    }
    bevel(ink, 1.2);
  },
  [TILE.planks]: (ink, random) => {
    mottle(ink, random, 230, 18);
    for (let board = 0; board < 4; board++) {
      const y = board * 16;
      // Grain running along the board.
      for (let k = 0; k < 5; k++) {
        ink.fillStyle = grey(190 + random() * 30, 0.45);
        ink.fillRect(0, y + 3 + random() * 10, S, 1);
      }
      ink.fillStyle = grey(120, 0.7);
      ink.fillRect(0, y + 15, S, 1.5);
      // Each board ends somewhere different.
      const end = random() * S;
      ink.fillRect(end, y, 1.5, 15);
      ink.fillStyle = grey(110, 0.8);
      ink.fillRect(end - 5, y + 6, 2, 2);
      ink.fillRect(end + 4, y + 6, 2, 2);
    }
    bevel(ink, 0.8);
  },
  [TILE.brick]: (ink, random) => {
    ink.fillStyle = grey(150);
    ink.fillRect(0, 0, S, S);
    for (let row = 0; row < 4; row++) {
      const shift = row % 2 ? 16 : 0;
      for (let col = -1; col < 3; col++) {
        const x = col * 32 + shift;
        ink.fillStyle = grey(222 + (random() - 0.5) * 30);
        ink.fillRect(x + 1.5, row * 16 + 1.5, 29, 13);
        ink.fillStyle = grey(255, 0.18);
        ink.fillRect(x + 1.5, row * 16 + 1.5, 29, 2);
      }
    }
    bevel(ink, 0.6);
  },
  [TILE.leaves]: (ink, random) => {
    ink.fillStyle = grey(196);
    ink.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {
      const x = random() * S;
      const y = random() * S;
      ink.fillStyle = grey(200 + random() * 55, 0.8);
      ink.beginPath();
      ink.ellipse(x, y, 3 + random() * 4, 2 + random() * 2, random() * Math.PI, 0, Math.PI * 2);
      ink.fill();
    }
    for (let i = 0; i < 18; i++) {
      ink.fillStyle = grey(120, 0.5);
      ink.fillRect(random() * S, random() * S, 2, 2);
    }
    bevel(ink, 0.5);
  },
  [TILE.bark]: (ink, random) => {
    ink.fillStyle = grey(220);
    ink.fillRect(0, 0, S, S);
    for (let i = 0; i < 16; i++) {
      const x = random() * S;
      ink.fillStyle = grey(150 + random() * 40, 0.6);
      ink.fillRect(x, 0, 1.5 + random() * 2, S);
    }
    for (let i = 0; i < 6; i++) {
      ink.fillStyle = grey(255, 0.25);
      ink.fillRect(random() * S, random() * S, 3, 10 + random() * 14);
    }
    bevel(ink, 0.7);
  },
  [TILE.rings]: (ink, random) => {
    ink.fillStyle = grey(236);
    ink.fillRect(0, 0, S, S);
    ink.strokeStyle = grey(176, 0.55);
    ink.lineWidth = 1.6;
    for (let r = 5; r < 30; r += 5 + random() * 2) {
      ink.beginPath();
      ink.arc(S / 2 + (random() - 0.5) * 2, S / 2 + (random() - 0.5) * 2, r, 0, Math.PI * 2);
      ink.stroke();
    }
    // The bark round the edge.
    ink.strokeStyle = grey(120, 0.8);
    ink.lineWidth = 6;
    ink.strokeRect(3, 3, S - 6, S - 6);
    bevel(ink, 0.8);
  },
  [TILE.glass]: (ink) => {
    ink.clearRect(0, 0, S, S);
    ink.fillStyle = grey(255, 0.16);
    ink.fillRect(0, 0, S, S);
    // A frame, and a glint across the pane.
    ink.fillStyle = grey(235, 0.95);
    ink.fillRect(0, 0, S, 5);
    ink.fillRect(0, S - 5, S, 5);
    ink.fillRect(0, 0, 5, S);
    ink.fillRect(S - 5, 0, 5, S);
    ink.strokeStyle = grey(255, 0.5);
    ink.lineWidth = 3;
    ink.beginPath();
    ink.moveTo(14, 40);
    ink.lineTo(40, 14);
    ink.moveTo(22, 46);
    ink.lineTo(46, 22);
    ink.stroke();
  },
};

let atlasCanvas: HTMLCanvasElement | null = null;

/** The atlas as a canvas, painted once: the same seed paints the same tiles every time. */
export function atlasImage(): HTMLCanvasElement {
  if (atlasCanvas) return atlasCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = S * ATLAS_COLUMNS;
  canvas.height = S * ATLAS_ROWS;
  const ink = canvas.getContext('2d');
  if (ink) {
    for (const [tile, paint] of Object.entries(PAINTERS)) {
      const index = Number(tile);
      ink.save();
      ink.translate((index % ATLAS_COLUMNS) * S, Math.floor(index / ATLAS_COLUMNS) * S);
      ink.beginPath();
      ink.rect(0, 0, S, S);
      ink.clip();
      paint(ink, mulberry32(1000 + index));
      ink.restore();
    }
  }
  atlasCanvas = canvas;
  return canvas;
}

/** The atlas as a texture for the block materials. */
export function atlasTexture(): Texture {
  const texture = new CanvasTexture(atlasImage());
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return texture;
}

/** Shades a `#rrggbb` colour towards black. */
function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.round(((value >> 16) & 255) * amount);
  const g = Math.round(((value >> 8) & 255) * amount);
  const b = Math.round((value & 255) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

const icons = new Map<number, string>();

/**
 * A little drawing of a block for the hotbar and the picker: three faces of a cube seen from
 * above, each painted with its tile and coloured like the block. Returned as a data URL.
 */
export function blockIcon(id: number): string {
  const cached = icons.get(id);
  if (cached) return cached;
  const spec = BLOCKS[id];
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ink = canvas.getContext('2d');
  if (!ink) return '';
  const atlas = atlasImage();
  const k = 2;
  // Each face is the unit square under a transform: top, then the left and right sides.
  const faces: { transform: number[]; tile: number; colour: () => string | CanvasGradient }[] = [
    {
      transform: [20 * k, -10 * k, 20 * k, 10 * k, 4 * k, 14 * k],
      tile: spec.tiles[0],
      colour: () => spec.top,
    },
    {
      transform: [20 * k, 10 * k, 0, 22 * k, 4 * k, 14 * k],
      tile: spec.tiles[1],
      colour: () => sideColour(0.8),
    },
    {
      transform: [20 * k, -10 * k, 0, 22 * k, 24 * k, 24 * k],
      tile: spec.tiles[1],
      colour: () => sideColour(0.64),
    },
  ];
  function sideColour(amount: number): string | CanvasGradient {
    if (!spec.fade || !ink) return shade(spec.side, amount);
    const gradient = ink.createLinearGradient(0, 0, 0, 1);
    gradient.addColorStop(0, shade(spec.side, amount));
    gradient.addColorStop(1, shade(spec.bottom, amount));
    return gradient;
  }
  for (const face of faces) {
    const [a, b, c, d, e, f] = face.transform;
    ink.save();
    ink.setTransform(a, b, c, d, e, f);
    ink.beginPath();
    ink.rect(0, 0, 1, 1);
    ink.clip();
    const sx = (face.tile % ATLAS_COLUMNS) * S;
    const sy = Math.floor(face.tile / ATLAS_COLUMNS) * S;
    if (spec.layer === 'glass') {
      ink.fillStyle = shade(spec.top, 0.6);
      ink.fillRect(0, 0, 1, 1);
    }
    ink.drawImage(atlas, sx, sy, S, S, 0, 0, 1, 1);
    ink.globalCompositeOperation = 'multiply';
    ink.fillStyle = face.colour();
    ink.fillRect(0, 0, 1, 1);
    ink.restore();
  }
  const url = canvas.toDataURL();
  icons.set(id, url);
  return url;
}
