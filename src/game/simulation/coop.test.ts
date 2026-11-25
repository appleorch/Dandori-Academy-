import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT, type InputState } from '../commands/input';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';
import { LEVELS } from '../world/level';

beforeAll(async () => {
  await initPhysics();
});

const level = LEVELS[0];
const walk = (sim: Simulation, moveX: number, moveZ: number): InputState => ({
  ...NO_INPUT,
  moveX,
  moveZ,
  cursorX: sim.captainTransform.x,
  cursorZ: sim.captainTransform.z,
});

describe('local co-op', () => {
  it('gives each player a Warden and half the squad, and moves them independently', () => {
    const sim = new Simulation(level, { coop: true });
    const parties = [...sim.workers.entries()].map(([, w]) => w.party);
    expect(parties.filter((p) => p === 1).length).toBe(Math.floor(parties.length / 2));
    const startA = { x: sim.captainTransform.x, z: sim.captainTransform.z };
    const startB = sim.partnerWarden;
    if (!startB) throw new Error('no partner');
    for (let i = 0; i < 60; i++) {
      const a = walk(sim, 1, 0);
      sim.step(a, { ...NO_INPUT, moveZ: 1, cursorX: startB.x, cursorZ: startB.z });
    }
    const b = sim.partnerWarden;
    expect(sim.captainTransform.x).toBeGreaterThan(startA.x + 2);
    expect(Math.abs(sim.captainTransform.z - startA.z)).toBeLessThan(0.5);
    expect(b && b.z).toBeGreaterThan(startB.z + 2);
    expect(b && Math.abs(b.x - startB.x)).toBeLessThan(0.5);
    // Nobody is switched to, and the squads never merge on their own.
    expect(sim.switchWarden()).toBe(false);
    expect(sim.activeWarden).toBe(0);
    sim.dispose();
  });

  it('lets the second player throw their own squad, and plays out the same both times', () => {
    const run = () => {
      const sim = new Simulation(level, { coop: true });
      for (let i = 0; i < 240; i++) {
        const partner = sim.partnerWarden;
        if (!partner) throw new Error('no partner');
        sim.step(walk(sim, 0, 0), {
          ...NO_INPUT,
          cursorX: partner.x + 5,
          cursorZ: partner.z,
          throwHeld: i < 120,
        });
      }
      const thrownByB = [...sim.workers.entries()].filter(
        ([, w]) => w.party === 1 && w.state !== 'follow',
      ).length;
      const snapshot = JSON.stringify(
        [...sim.workers.entries()].map(([e]) => {
          const at = sim.transforms.require(e);
          return [Math.round(at.x * 1000), Math.round(at.z * 1000)];
        }),
      );
      sim.dispose();
      return { thrownByB, snapshot };
    };
    const first = run();
    expect(first.thrownByB).toBeGreaterThan(0);
    expect(run().snapshot).toBe(first.snapshot);
  });

  it('changes nothing for one player', () => {
    const sim = new Simulation(level);
    expect(sim.partnerWarden).toBeNull();
    expect(sim.otherWarden).toBeNull();
    sim.dispose();
  });
});
