import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { NavGrid } from '../navigation/NavGrid';
import { FlowField } from '../pathfinding/flowField';
import { findPath } from '../pathfinding/astar';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { terrace, terraces } from './course';
import { heightAt } from './heightMap';
import { LEVELS, type LevelDefinition } from './level';

beforeAll(async () => {
  await initPhysics();
});

// A terrace in the middle of a 40 x 30 field: a ramp on its south side, a ledge on its west.
const TERRACE = terraces(
  terrace([-6, -8, 10, 6], 3, [
    { side: 's', from: 2, to: 6, kind: 'ramp' },
    { side: 'w', from: -4, to: 2, kind: 'ledge' },
  ]),
);

function grid(): NavGrid {
  const nav = new NavGrid(40, 30, TERRACE.walls);
  nav.setLedges(TERRACE.ledges);
  return nav;
}

describe('flow fields', () => {
  it('never wrap round the edge of the grid', () => {
    // A wall the full depth of the field splits it in two; nothing on the far side can be reached.
    const nav = new NavGrid(20, 10, [{ x: 0, z: 0, w: 2, d: 10 }]);
    const field = new FlowField(nav);
    field.compute(nav.cellIndexAt(-8, 0));
    for (let z = -4.5; z <= 4.5; z++) {
      expect(field.dist[nav.cellIndexAt(9.5, z)]).toBe(Infinity);
      expect(field.dist[nav.cellIndexAt(-9.5, z)]).toBeLessThan(Infinity);
    }
  });
});

describe('terraces', () => {
  it('can be walked up by the ramp and dropped off by the ledge, never climbed', () => {
    const nav = grid();
    const below = nav.cellIndexAt(-12, -1);
    const above = nav.cellIndexAt(2, -1);
    const up = findPath(nav, below, above) ?? [];
    const down = findPath(nav, above, below) ?? [];
    // Up goes round by the ramp on the south side; down drops straight off the west ledge.
    expect(up.length).toBeGreaterThan(down.length + 8);
    expect(up.some((cell) => nav.centerZ(cell) > 7)).toBe(true);
    expect(down.every((cell) => nav.centerZ(cell) < 6)).toBe(true);
  });

  it('give hauls the drop as the way home, in a flow field', () => {
    const nav = grid();
    const field = new FlowField(nav);
    field.compute(nav.cellIndexAt(-14, -1));
    // From the middle of the terrace the field heads west, off the ledge.
    const cell = nav.cellIndexAt(1, -1);
    expect(field.dirX[cell]).toBeLessThan(0);
    // From below the ledge, home is just west.
    expect(field.dist[nav.cellIndexAt(-8, -1)]).toBeLessThan(10);
  });

  it('do not let anything step up a ledge', () => {
    const nav = grid();
    expect(nav.canMove(-6.5, -1, -5.5, -1)).toBe(false);
    expect(nav.canMove(-5.5, -1, -6.5, -1)).toBe(true);
    expect(nav.lineOfSight(-12, -1, 2, -1)).toBe(false);
    expect(nav.lineOfSight(2, -1, -12, -1)).toBe(true);
  });

  it('report the height of the ground: plateau, ramp slope and the floor', () => {
    expect(heightAt(TERRACE, 0, 0)).toBe(3);
    expect(heightAt(TERRACE, 4, 6.01 + 3)).toBeCloseTo(1.5, 1);
    expect(heightAt(TERRACE, -15, 0)).toBe(0);
  });

  it('stop the Warden walking up a ledge', () => {
    const level: LevelDefinition = {
      ...LEVELS[0],
      id: 'terrace-test',
      width: 40,
      depth: 30,
      captain: { x: -12, z: -1 },
      kiln: { x: -17, z: 10 },
      treasures: [{ id: 'far', x: 15, z: 12, weight: 40 }],
      obstacles: TERRACE.walls,
      plateaus: TERRACE.plateaus,
      ramps: TERRACE.ramps,
      ledges: TERRACE.ledges,
    };
    const sim = new Simulation(level);
    for (let i = 0; i < 120; i++) sim.step({ ...NO_INPUT, moveX: 1, cursorX: 0, cursorZ: 0 });
    expect(sim.captainTransform.x).toBeLessThan(-6);
    // Placed on the terrace, it can walk off the ledge.
    sim.physics.placeCaptain({ x: 0, z: -1 });
    sim.captainTransform.x = 0;
    sim.captainTransform.z = -1;
    for (let i = 0; i < 120; i++) sim.step({ ...NO_INPUT, moveX: -1, cursorX: 0, cursorZ: 0 });
    expect(sim.captainTransform.x).toBeLessThan(-8);
    sim.dispose();
  });
});

describe('the Grand Curriculum', () => {
  const courses = LEVELS.filter((level) => level.theme === 'terrarium');

  it('has five examinations, each at least three times the size of an early lesson', () => {
    expect(courses.map((level) => level.stage)).toEqual([23, 24, 25, 26, 27]);
    const early = LEVELS.slice(0, 22).reduce((sum, l) => sum + l.width * l.depth, 0) / 22;
    for (const course of courses) expect(course.width * course.depth).toBeGreaterThan(early * 3);
  });

  it('keeps a simulation step cheap on the biggest course', () => {
    const level = courses[courses.length - 1];
    const sim = new Simulation(level);
    // Walk the Warden about so the squad's path field is rebuilt as it goes. Timed in three
    // batches and judged on the fastest, so other tests sharing the machine do not count.
    const steps = 60 * 7;
    let fastest = Infinity;
    let tick = 0;
    for (let batch = 0; batch < 3; batch++) {
      const start = performance.now();
      for (let i = 0; i < steps; i++, tick++) {
        sim.step({
          ...NO_INPUT,
          moveX: Math.sin(tick / 90),
          moveZ: Math.cos(tick / 70),
          cursorX: 0,
          cursorZ: 0,
        });
      }
      fastest = Math.min(fastest, (performance.now() - start) / steps);
    }
    expect(fastest).toBeLessThan(2);
    sim.dispose();
  });
});
