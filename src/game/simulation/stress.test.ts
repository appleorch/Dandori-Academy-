import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { SIM_DT } from '../core/config';
import { Rng } from '../core/rng';
import { LESSON_1, type LevelDefinition } from '../world/level';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';

/** The handoff document's stress scenario: 100 workers, 20 enemies, 50 carry tasks. */
function stressLevel(): LevelDefinition {
  const rng = new Rng(7);
  const spot = () => ({ x: rng.range(-10, 28), z: rng.range(-18, 18) });
  return {
    ...LESSON_1,
    id: 'stress',
    obstacles: [],
    startingWorkers: 100,
    treasures: Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, weight: 1, ...spot() })),
    enemies: Array.from({ length: 20 }, spot),
  };
}

beforeAll(async () => {
  await initPhysics();
});

describe('stress scenario', () => {
  it('steps well inside the 60 FPS frame budget', () => {
    const sim = new Simulation(stressLevel());
    const steps = 60 * 20;
    const start = performance.now();
    for (let i = 0; i < steps && !sim.ended; i++) {
      const angle = i * 0.01;
      sim.step({
        ...NO_INPUT,
        moveX: 1,
        moveZ: Math.sin(angle),
        cursorX: sim.captainTransform.x + Math.cos(angle * 7) * 8,
        cursorZ: sim.captainTransform.z + Math.sin(angle * 7) * 8,
        throwHeld: true,
      });
    }
    const msPerStep = (performance.now() - start) / sim.tick;
    expect(sim.countWorkers().working).toBeGreaterThan(0);
    // A frame at 60 FPS is 16.7 ms; the simulation may use at most a quarter of it.
    expect(msPerStep).toBeLessThan((SIM_DT * 1000) / 4);
    console.info(`stress: ${msPerStep.toFixed(3)} ms per step over ${sim.tick} steps`);
    sim.dispose();
  });
});
