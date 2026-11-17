import type { Box } from '../navigation/NavGrid';

/** A rectangle by its corners: [x0, z0, x1, z1]. */
export type Rect = readonly [number, number, number, number];

export function rectBox([x0, z0, x1, z1]: Rect): Box {
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
}

/**
 * Builds a dungeon the other way round from a field: everything is solid rock except the
 * rooms and corridors listed. Returns the rock as a small set of boxes, merged row by
 * row, on a grid of `cell`-sized squares. Room corners should sit on multiples of `cell`.
 */
export function carve(width: number, depth: number, open: readonly Rect[], cell = 2): Box[] {
  const cols = Math.round(width / cell);
  const rows = Math.round(depth / cell);
  const minX = -width / 2;
  const minZ = -depth / 2;
  const solid = (col: number, row: number): boolean => {
    const x = minX + (col + 0.5) * cell;
    const z = minZ + (row + 0.5) * cell;
    return !open.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  };

  // Runs of solid cells along each row, then runs with the same span in consecutive rows are stacked.
  const done: Box[] = [];
  let growing = new Map<string, { from: number; to: number; top: number }>();
  const finish = (run: { from: number; to: number; top: number }, bottom: number): void => {
    done.push({
      x: minX + ((run.from + run.to + 1) / 2) * cell,
      z: minZ + ((run.top + bottom) / 2) * cell,
      w: (run.to - run.from + 1) * cell,
      d: (bottom - run.top) * cell,
    });
  };
  for (let row = 0; row <= rows; row++) {
    const next = new Map<string, { from: number; to: number; top: number }>();
    if (row < rows) {
      let col = 0;
      while (col < cols) {
        if (!solid(col, row)) {
          col++;
          continue;
        }
        const from = col;
        while (col < cols && solid(col, row)) col++;
        const key = `${from}:${col - 1}`;
        next.set(key, growing.get(key) ?? { from, to: col - 1, top: row });
      }
    }
    for (const [key, run] of growing) if (!next.has(key)) finish(run, row);
    growing = next;
  }
  return done;
}
