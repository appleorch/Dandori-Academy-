import { describe, expect, it } from 'vitest';
import { FixedClock } from './clock';
import { EcsWorld, NO_ENTITY } from './ecs';
import { Rng } from './rng';

describe('EcsWorld', () => {
  it('creates entities and removes their components on destroy', () => {
    const world = new EcsWorld();
    const names = world.createStore<string>();
    const a = world.create();
    const b = world.create();
    names.set(a, 'a');
    names.set(b, 'b');
    expect(a).not.toBe(NO_ENTITY);
    world.destroy(a);
    expect(world.isAlive(a)).toBe(false);
    expect(names.has(a)).toBe(false);
    expect([...names.entries()]).toEqual([[b, 'b']]);
    expect(() => names.require(a)).toThrow();
  });
});

describe('FixedClock', () => {
  it('converts frame time into whole steps and carries the remainder', () => {
    const clock = new FixedClock(0.1);
    expect(clock.advance(0.25)).toBe(2);
    expect(clock.advance(0.05)).toBe(1);
  });

  it('caps catch-up steps', () => {
    const clock = new FixedClock(0.1, 3);
    expect(clock.advance(10)).toBe(3);
    expect(clock.advance(0.05)).toBe(0);
  });
});

describe('Rng', () => {
  it('is reproducible for a seed and stays in [0, 1)', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) {
      const value = a.next();
      expect(value).toBe(b.next());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
