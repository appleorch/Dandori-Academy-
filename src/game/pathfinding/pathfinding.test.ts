import { describe, expect, it } from 'vitest';
import { NavGrid } from '../navigation/NavGrid';
import { createMover, moveAgent, steerTo } from '../navigation/steering';
import { findPath } from './astar';
import { FlowField } from './flowField';
import { MinHeap } from './minHeap';

/** 20x10 field with a wall across the middle that leaves a gap at the bottom (z > 2). */
function walledGrid(): NavGrid {
  return new NavGrid(20, 10, [{ x: 0, z: -1.5, w: 1, d: 7 }]);
}

describe('MinHeap', () => {
  it('pops in priority order', () => {
    const heap = new MinHeap();
    [5, 1, 4, 2, 3].forEach((p) => heap.push(p * 10, p));
    const out: number[] = [];
    while (heap.size > 0) out.push(heap.pop());
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });
});

describe('NavGrid', () => {
  it('blocks inflated obstacles and everything out of bounds', () => {
    const nav = walledGrid();
    expect(nav.isWalkable(0, -2)).toBe(false);
    expect(nav.isWalkable(0, 4)).toBe(true);
    expect(nav.isWalkable(-11, 0)).toBe(false);
    expect(nav.lineOfSight(-5, -2, 5, -2)).toBe(false);
    expect(nav.lineOfSight(-5, 4, 5, 4)).toBe(true);
  });

  it('finds the nearest walkable point', () => {
    const nav = walledGrid();
    const p = nav.nearestWalkable(0.2, -2);
    expect(nav.isWalkable(p.x, p.z)).toBe(true);
    expect(Math.hypot(p.x - 0.2, p.z + 2)).toBeLessThan(2);
    expect(nav.nearestWalkable(3, 3)).toEqual({ x: 3, z: 3 });
  });
});

describe('findPath', () => {
  it('routes around the wall through walkable, connected cells', () => {
    const nav = walledGrid();
    const start = nav.cellIndexAt(-5, -3);
    const goal = nav.cellIndexAt(5, -3);
    const path = findPath(nav, start, goal);
    expect(path).not.toBeNull();
    const cells = path as number[];
    expect(cells[0]).toBe(start);
    expect(cells[cells.length - 1]).toBe(goal);
    expect(cells.length).toBeGreaterThan(11);
    for (let i = 0; i < cells.length; i++) {
      expect(nav.blocked[cells[i]]).toBe(0);
      if (i > 0) {
        const dx = Math.abs((cells[i] % nav.cols) - (cells[i - 1] % nav.cols));
        const dz = Math.abs(Math.floor(cells[i] / nav.cols) - Math.floor(cells[i - 1] / nav.cols));
        expect(Math.max(dx, dz)).toBe(1);
      }
    }
  });

  it('returns null when the goal is sealed off', () => {
    const nav = new NavGrid(20, 10, [{ x: 0, z: 0, w: 1, d: 10 }]);
    expect(findPath(nav, nav.cellIndexAt(-5, 0), nav.cellIndexAt(5, 0))).toBeNull();
  });
});

describe('FlowField', () => {
  it('leads every reachable cell to the goal', () => {
    const nav = walledGrid();
    const field = new FlowField(nav);
    const goal = nav.cellIndexAt(5, -3);
    field.compute(goal);
    let cell = nav.cellIndexAt(-5, -3);
    for (let i = 0; i < 100 && cell !== goal; i++) {
      const cx = (cell % nav.cols) + Math.round(field.dirX[cell] * Math.SQRT2);
      const cz = Math.floor(cell / nav.cols) + Math.round(field.dirZ[cell] * Math.SQRT2);
      const next = cz * nav.cols + cx;
      expect(field.dist[next]).toBeLessThan(field.dist[cell]);
      cell = next;
    }
    expect(cell).toBe(goal);
  });
});

describe('steering', () => {
  it('walks an agent around the wall to its target', () => {
    const nav = walledGrid();
    const pos = { x: -5, z: -3 };
    const mover = createMover();
    const dir = { x: 0, z: 0 };
    for (let i = 0; i < 600 && Math.hypot(pos.x - 5, pos.z + 3) > 0.2; i++) {
      steerTo(nav, mover, pos, 5, -3, 1 / 60, dir);
      moveAgent(nav, pos, dir.x * 0.1, dir.z * 0.1);
      expect(nav.isWalkable(pos.x, pos.z)).toBe(true);
    }
    expect(Math.hypot(pos.x - 5, pos.z + 3)).toBeLessThanOrEqual(0.2);
  });
});
