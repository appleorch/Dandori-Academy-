import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { cornerLedge, sparkLedge, type Corner } from './course';
import { defineLevel } from './level';
import type { SproutKind } from '../workers/sprouts';

beforeAll(async () => {
  await initPhysics();
});

/** A field with a high ledge: a terrace with no ramp, only a drop back down, its relic in the middle. */
function ledgeField(kind: SproutKind) {
  const ledge = sparkLedge(0, 0);
  return defineLevel({
    id: 'test-ledge',
    stage: 0,
    name: 'Ledge',
    brief: '',
    width: 80,
    depth: 50,
    dayLength: 200,
    platinumTime: 200,
    seed: 1,
    startingWorkers: 6,
    squad: { [kind]: 6 },
    captain: { x: -16, z: 0 },
    kiln: { x: -30, z: 0 },
    obstacles: [...ledge.walls],
    plateaus: ledge.plateaus,
    ramps: ledge.ramps,
    ledges: ledge.ledges,
    treasures: [{ id: 'relic', x: 15, z: 0, weight: 1 }],
    pods: [],
    enemies: [],
  });
}

function attempt(kind: SproutKind) {
  const sim = new Simulation(ledgeField(kind));
  // Walk to the foot of the ledge and throw at the relic for a while, then wait.
  for (let i = 0; i < 60 * 40 && !sim.ended; i++) {
    const near = sim.captainTransform.x > -2;
    sim.step({
      ...NO_INPUT,
      moveX: near ? 0 : 1,
      cursorX: 15,
      cursorZ: 0,
      throwHeld: near && i % 30 < 15,
    });
  }
  const home = sim.stats.treasuresCollected.includes('relic');
  sim.dispose();
  return home;
}

/** The same in a field's corner, as the story's sections have it. */
function cornerAttempt(kind: SproutKind, corner: Corner) {
  const ledge = cornerLedge(80, 60, corner);
  const level = defineLevel({
    id: 'test-corner',
    stage: 0,
    name: 'Corner',
    brief: '',
    width: 80,
    depth: 60,
    dayLength: 200,
    platinumTime: 200,
    seed: 1,
    startingWorkers: 6,
    squad: { [kind]: 6 },
    captain: { x: 0, z: 0 },
    kiln: { x: -4, z: 0 },
    obstacles: [...ledge.walls],
    plateaus: ledge.plateaus,
    ramps: ledge.ramps,
    ledges: ledge.ledges,
    treasures: [{ id: 'relic', x: ledge.top.x, z: ledge.top.z, weight: 1 }],
    pods: [],
    enemies: [],
  });
  const sim = new Simulation(level);
  const east = corner.endsWith('E');
  // The Warden walks to the foot of the low terrace, level with the top, and throws at it.
  const stand = { x: east ? 40 - 21 : -40 + 21, z: ledge.top.z };
  for (let i = 0; i < 60 * 45 && !sim.ended; i++) {
    const dx = stand.x - sim.captainTransform.x;
    const dz = stand.z - sim.captainTransform.z;
    const far = Math.hypot(dx, dz) > 0.6;
    sim.step({
      ...NO_INPUT,
      moveX: far ? dx / Math.hypot(dx, dz) : 0,
      moveZ: far ? dz / Math.hypot(dx, dz) : 0,
      cursorX: ledge.top.x,
      cursorZ: ledge.top.z,
      throwHeld: !far && i % 30 < 15,
    });
  }
  const home = sim.stats.treasuresCollected.includes('relic');
  sim.dispose();
  return home;
}

describe('a high ledge', () => {
  it('in any corner, is only reached by a Sparkling', () => {
    for (const corner of ['NE', 'NW', 'SE', 'SW'] as const) {
      expect(cornerAttempt('spark', corner), corner).toBe(true);
      expect(cornerAttempt('ember', corner), corner).toBe(false);
    }
  });

  it('can only be reached by throwing a Sparkling, and its relic comes down the drop', () => {
    expect(attempt('spark')).toBe(true);
    expect(attempt('ember')).toBe(false);
    expect(attempt('stone')).toBe(false);
  });
});
