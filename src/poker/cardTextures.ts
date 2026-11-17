import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from 'three';
import { isRed, RANK_LABELS, rankOf, suitOf, SUIT_SYMBOLS, type Card } from './cards';

const WIDTH = 200;
const HEIGHT = 280;

function canvasTexture(draw: (ink: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ink = canvas.getContext('2d');
  if (!ink) throw new Error('Canvas 2D is unavailable');
  draw(ink);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function rounded(ink: CanvasRenderingContext2D, inset: number, radius: number): void {
  ink.beginPath();
  ink.roundRect(inset, inset, WIDTH - inset * 2, HEIGHT - inset * 2, radius);
}

const faces = new Map<Card, Texture>();
let back: Texture | null = null;

/** The face of a card: big corner index and a large suit in the middle, readable across a table. */
export function faceTexture(card: Card): Texture {
  const cached = faces.get(card);
  if (cached) return cached;
  const texture = canvasTexture((ink) => {
    ink.fillStyle = '#fbf6ea';
    rounded(ink, 0, 18);
    ink.fill();
    ink.strokeStyle = '#b8ad98';
    ink.lineWidth = 4;
    rounded(ink, 3, 16);
    ink.stroke();
    const rank = RANK_LABELS[rankOf(card)];
    const suit = SUIT_SYMBOLS[suitOf(card)];
    ink.fillStyle = isRed(card) ? '#b01208' : '#16141a';
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    ink.font = `700 ${rank.length > 1 ? 78 : 92}px Georgia, serif`;
    ink.fillText(rank, 58, 62);
    ink.font = '74px Georgia, serif';
    ink.fillText(suit, 152, 64);
    ink.font = '150px Georgia, serif';
    ink.fillText(suit, WIDTH / 2, 190);
  });
  faces.set(card, texture);
  return texture;
}

/** The back: a lattice in ember red with a small flame at the centre. */
export function backTexture(): Texture {
  back ??= canvasTexture((ink) => {
    ink.fillStyle = '#fbf6ea';
    rounded(ink, 0, 18);
    ink.fill();
    ink.fillStyle = '#9a2c1c';
    rounded(ink, 12, 12);
    ink.fill();
    ink.save();
    rounded(ink, 12, 12);
    ink.clip();
    ink.strokeStyle = 'rgba(255, 190, 110, 0.55)';
    ink.lineWidth = 3;
    for (let i = -HEIGHT; i < WIDTH + HEIGHT; i += 26) {
      ink.beginPath();
      ink.moveTo(i, 0);
      ink.lineTo(i + HEIGHT, HEIGHT);
      ink.moveTo(i + HEIGHT, 0);
      ink.lineTo(i, HEIGHT);
      ink.stroke();
    }
    ink.restore();
    ink.fillStyle = '#ffb347';
    ink.beginPath();
    ink.moveTo(WIDTH / 2, HEIGHT / 2 - 44);
    ink.bezierCurveTo(
      WIDTH / 2 + 46,
      HEIGHT / 2,
      WIDTH / 2 + 26,
      HEIGHT / 2 + 44,
      WIDTH / 2,
      HEIGHT / 2 + 44,
    );
    ink.bezierCurveTo(
      WIDTH / 2 - 26,
      HEIGHT / 2 + 44,
      WIDTH / 2 - 46,
      HEIGHT / 2,
      WIDTH / 2,
      HEIGHT / 2 - 44,
    );
    ink.fill();
  });
  return back;
}
