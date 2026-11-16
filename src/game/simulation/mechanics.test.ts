import { beforeAll, describe, expect, it } from 'vitest';
import { carrySpeed } from '../carry/carrySystem';
import { NO_INPUT, type InputState } from '../commands/input';
import { CARRY, DEWGLASS_BONUS_PER_WEIGHT, LODESTONE, SAP, TWIN } from '../core/config';
import type { SimEventType } from './events';
import { LEVELS, type LevelDefinition } from '../world/level';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';

const FIELD: LevelDefinition = {
  ...LEVELS[0],
  id: 'mechanics',
  width: 60,
  depth: 30,
  dayLength: 300,
  startingWorkers: 12,
  captain: { x: -10, z: 0 },
  kiln: { x: -20, z: 0 },
  obstacles: [],
  treasures: [{ id: 'far', x: 26, z: 12, weight: 40 }],
  pods: [],
  enemies: [],
};

function run(sim: Simulation, steps: number, input: Partial<InputState> = {}) {
  const seen = new Map<SimEventType, number>();
  for (let i = 0; i < steps && !sim.ended; i++) {
    sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: 0, ...input });
    for (const event of sim.events) seen.set(event.type, (seen.get(event.type) ?? 0) + 1);
  }
  return seen;
}

beforeAll(async () => {
  await initPhysics();
});

describe('mounds', () => {
  it('are dug up by Emberlings and reveal what is buried', () => {
    const sim = new Simulation({
      ...FIELD,
      enemies: [
        { x: -4, z: -1.5, kind: 'mound', drop: 2 },
        { x: -4, z: 1.5, kind: 'mound', reveals: 'sap' },
      ],
    });
    const before = sim.stats.treasuresTotal;
    const seen = run(sim, 60 * 25, { cursorX: -4, cursorZ: 0, throwHeld: true });
    expect(before).toBe(2);
    expect(seen.get('dug')).toBe(2);
    expect([...sim.carryables.entries()].some(([, c]) => c.kind === 'sap') || seen.has('sap')).toBe(
      true,
    );
    expect(sim.stats.enemiesDefeated).toBe(0);
    sim.dispose();
  });
});

describe('bridges', () => {
  const RIVER: LevelDefinition = {
    ...FIELD,
    water: [
      { x: 6, z: -7, w: 4, d: 16 },
      { x: 6, z: 11, w: 4, d: 8 },
    ],
    bridges: [{ x: 6, z: 4, w: 4, d: 6, bank: { x: 2, z: 4 }, needs: 2 }],
    treasures: [{ id: 'across', x: 16, z: 4, weight: 1 }],
    logs: [
      { x: -6, z: 4 },
      { x: -6, z: -4 },
    ],
  };

  it('keep hauls across the river waiting until enough Span-logs reach the bank', () => {
    const sim = new Simulation(RIVER);
    const cell = sim.nav.cellIndexAt(16, 4);
    expect(Number.isFinite(sim.kilnField.dist[cell])).toBe(false);
    const seen = run(sim, 60 * 25, { cursorX: -6, cursorZ: 0, throwHeld: true });
    expect(seen.get('logPlaced')).toBe(2);
    expect(seen.get('bridgeBuilt')).toBe(1);
    expect(sim.bridges[0].built).toBe(true);
    expect(Number.isFinite(sim.kilnField.dist[cell])).toBe(true);
    sim.dispose();
  });
});

describe('special hauls', () => {
  it('Sap speeds every haul up for a while', () => {
    const sim = new Simulation(FIELD);
    const haul = { ...[...sim.carryables.entries()][0][1], carriers: Array(40).fill(1) };
    const normal = carrySpeed(sim, haul);
    sim.sapTimer = SAP.seconds;
    expect(carrySpeed(sim, haul)).toBeCloseTo(normal * SAP.speedUp);
    sim.dispose();
  });

  it('a Lodestone crawls with its minimum crew and runs with a full one', () => {
    const sim = new Simulation({
      ...FIELD,
      treasures: [{ id: 'stone', x: 0, z: 0, weight: 2, variant: 'lodestone' }],
    });
    const [[, stone]] = [...sim.carryables.entries()];
    expect(stone.maxCarriers).toBe(2 * LODESTONE.crew);
    expect(carrySpeed(sim, { ...stone, carriers: [1, 2] })).toBe(LODESTONE.baseSpeed);
    expect(carrySpeed(sim, { ...stone, carriers: [1, 2, 3, 4, 5, 6] })).toBe(
      LODESTONE.baseSpeed + LODESTONE.bonusSpeed,
    );
    expect(LODESTONE.baseSpeed).toBeLessThan(CARRY.baseSpeed);
    sim.dispose();
  });

  it('Dewglass cracks once if its moving crew is broken up', () => {
    const sim = new Simulation({
      ...FIELD,
      treasures: [{ id: 'glass', x: 0, z: 0, weight: 2, variant: 'dewglass' }],
    });
    const [[, glass]] = [...sim.carryables.entries()];
    const intact = glass.value;
    run(sim, 60 * 2, { cursorX: 0, cursorZ: 0, throwHeld: true });
    expect(glass.moving).toBe(true);
    const [[entity]] = [...sim.carryables.entries()];
    const at = sim.transforms.require(entity);
    const seen = run(sim, 30, { cursorX: at.x, cursorZ: at.z, whistleHeld: true });
    expect(seen.get('crack')).toBe(1);
    expect(glass.cracked).toBe(true);
    expect(glass.value).toBe(intact - 2 * DEWGLASS_BONUS_PER_WEIGHT);
    sim.dispose();
  });

  it('twins delivered close together earn a bonus', () => {
    const sim = new Simulation({
      ...FIELD,
      treasures: [
        { id: 'a', x: -14, z: -2, weight: 1, twin: 'sun' },
        { id: 'b', x: -14, z: 2, weight: 1, twin: 'sun' },
      ],
    });
    const seen = run(sim, 60 * 10, { cursorX: -14, cursorZ: 0, throwHeld: true });
    expect(seen.get('twin')).toBe(1);
    expect(sim.stats.treasureValue).toBe(200 + 200 * TWIN.bonus);
    sim.dispose();
  });
});
