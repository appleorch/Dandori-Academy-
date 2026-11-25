import type { LevelDefinition, LevelSpec } from '../world/levelTypes';

/**
 * Fog of war for the story: what of a section the Warden has seen. The field is cut into cells
 * of FOG_CELL units; every cell within SIGHT of the Warden is marked seen as the day goes, and
 * the marks are kept per section in the save as a compact bitset (base64). The base camp map and
 * the in-day minimap show only seen ground.
 */

export const FOG_CELL = 4;
export const SIGHT = 18;

type Sized = Pick<LevelDefinition | LevelSpec, 'width' | 'depth'>;

export function fogSize(level: Sized): { cols: number; rows: number } {
  return { cols: Math.ceil(level.width / FOG_CELL), rows: Math.ceil(level.depth / FOG_CELL) };
}

/** A blank map: nothing seen. */
export function emptyFog(level: Sized): Uint8Array {
  const { cols, rows } = fogSize(level);
  return new Uint8Array(cols * rows);
}

function cellOf(level: Sized, x: number, z: number): { col: number; row: number } {
  return {
    col: Math.floor((x + level.width / 2) / FOG_CELL),
    row: Math.floor((z + level.depth / 2) / FOG_CELL),
  };
}

/** Marks every cell within SIGHT of a point as seen. Returns true if anything new was seen. */
export function reveal(seen: Uint8Array, level: Sized, x: number, z: number): boolean {
  const { cols, rows } = fogSize(level);
  const reach = Math.ceil(SIGHT / FOG_CELL);
  const centre = cellOf(level, x, z);
  let changed = false;
  for (let row = centre.row - reach; row <= centre.row + reach; row++) {
    if (row < 0 || row >= rows) continue;
    for (let col = centre.col - reach; col <= centre.col + reach; col++) {
      if (col < 0 || col >= cols) continue;
      const cx = (col + 0.5) * FOG_CELL - level.width / 2;
      const cz = (row + 0.5) * FOG_CELL - level.depth / 2;
      if (Math.hypot(cx - x, cz - z) > SIGHT) continue;
      if (!seen[row * cols + col]) {
        seen[row * cols + col] = 1;
        changed = true;
      }
    }
  }
  return changed;
}

export function isSeen(seen: Uint8Array, level: Sized, x: number, z: number): boolean {
  const { cols, rows } = fogSize(level);
  const { col, row } = cellOf(level, x, z);
  if (col < 0 || row < 0 || col >= cols || row >= rows) return false;
  return seen[row * cols + col] === 1;
}

/** The share of a section seen, 0 to 1. */
export function explored(seen: Uint8Array): number {
  let count = 0;
  for (const cell of seen) count += cell;
  return seen.length === 0 ? 0 : count / seen.length;
}

/** Packs a fog map into a short string: eight cells to a byte, base64. */
export function encodeFog(seen: Uint8Array): string {
  const bytes = new Uint8Array(Math.ceil(seen.length / 8));
  seen.forEach((cell, i) => {
    if (cell) bytes[i >> 3] |= 1 << (i & 7);
  });
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

/** Unpacks a fog map; anything unreadable, or the wrong size, comes back blank. */
export function decodeFog(packed: string | undefined, level: Sized): Uint8Array {
  const seen = emptyFog(level);
  if (!packed) return seen;
  let text: string;
  try {
    text = atob(packed);
  } catch {
    return seen;
  }
  if (text.length !== Math.ceil(seen.length / 8)) return seen;
  for (let i = 0; i < seen.length; i++) {
    seen[i] = (text.charCodeAt(i >> 3) >> (i & 7)) & 1;
  }
  return seen;
}

/** Everything seen on either map. */
export function mergeFog(a: Uint8Array, b: Uint8Array): Uint8Array {
  const merged = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) merged[i] = a[i] | (b[i] ?? 0);
  return merged;
}
