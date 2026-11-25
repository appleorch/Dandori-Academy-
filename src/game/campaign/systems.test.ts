import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS, type LevelDefinition } from '../world/level';
import { spawnWorker } from '../world/spawn';
import { dayParty, newCampaign, parseCampaign } from './campaign';
import { abilitiesFor, CLOCK_UPGRADES } from './upgrades';

beforeAll(async () => {
  await initPhysics();
});

const FIELD: LevelDefinition = {
  ...LEVELS[0],
  id: 'systems',
  width: 60,
  depth: 40,
  dayLength: 300,
  startingWorkers: 6,
  squad: { ember: 6 },
  captain: { x: -20, z: 0 },
  kiln: { x: -24, z: 0 },
  obstacles: [],
  treasures: [{ id: 'far', x: 25, z: 15, weight: 1 }],
  pods: [],
  enemies: [{ x: 10, z: 0, kind: 'mossback' }],
  berries: [{ x: -18, z: 4, kind: 'ember' }],
};

const step = (sim: Simulation, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++)
    sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: sim.captainTransform.z });
};
const story = () =>
  new Simulation(FIELD, {
    story: true,
    abilities: abilitiesFor(CLOCK_UPGRADES.length),
    items: { emberbrew: 1, stillwater: 1 },
  });

describe('the second Warden', () => {
  it('is the Clock’s eighth gift, and only in the story', () => {
    expect(CLOCK_UPGRADES[7]).toBe('secondWarden');
    expect(story().otherWarden).not.toBeNull();
    expect(new Simulation(FIELD).otherWarden).toBeNull();
    expect(new Simulation(FIELD, { abilities: abilitiesFor(8) }).otherWarden).toBeNull();
  });

  it('switches, splits the squad, and merges again when the Wardens meet', () => {
    const sim = story();
    for (const [, w] of sim.workers.entries()) w.state = 'follow';
    const start = { ...sim.captainTransform };
    const other = sim.otherWarden;
    if (!other) throw new Error('no second Warden');
    expect(sim.splitSquad()).toBe(3);
    expect(sim.countWorkers().squad).toBe(3);
    expect(sim.switchWarden()).toBe(true);
    expect(sim.activeWarden).toBe(1);
    expect(sim.captainTransform.x).toBeCloseTo(other.x);
    expect(sim.otherWarden?.x).toBeCloseTo(start.x);
    // The squad sent over is now the one in hand.
    expect(sim.countWorkers().squad).toBe(3);
    // Walking back to the other Warden merges everyone.
    sim.physics.placeCaptain(start);
    sim.captainTransform.x = start.x;
    sim.captainTransform.z = start.z;
    step(sim, 0.1);
    for (const [, w] of sim.workers.entries()) w.state = 'follow';
    expect(sim.countWorkers().squad).toBe(6);
  });
});

describe('sprays', () => {
  it('Emberbrew speeds the squad; Stillwater freezes nearby beasts; both are used up', () => {
    const sim = story();
    expect(sim.sprayEmberbrew()).toBe(true);
    expect(sim.brewTimer).toBeGreaterThan(19);
    expect(sim.sprayEmberbrew()).toBe(false);
    const [, beast] = [...sim.enemies.entries()][0];
    sim.physics.placeCaptain({ x: 4, z: 0 });
    sim.captainTransform.x = 4;
    expect(sim.sprayStillwater()).toBe(true);
    expect(beast.state).toBe('recover');
    expect(beast.timer).toBeGreaterThanOrEqual(8);
    expect(sim.items).toEqual({ emberbrew: 0, stillwater: 0 });
  });

  it('brews a berry carried home into a spray, and keeps sprays out of other modes', () => {
    const sim = story();
    const berry = [...sim.carryables.entries()].find(([, c]) => c.kind === 'berry');
    expect(berry).toBeTruthy();
    expect(new Simulation(FIELD).carryables.size).toBe(1);
    expect(new Simulation(FIELD, { items: { emberbrew: 3, stillwater: 3 } }).items).toEqual({
      emberbrew: 0,
      stillwater: 0,
    });
    // Carried home by a crew.
    for (let i = 0; i < 2; i++) spawnWorker(sim, -18, 4.5, 'idle');
    step(sim, 20);
    expect(sim.stats.berries.ember).toBe(1);
    expect(sim.items.emberbrew).toBe(2);
  });
});

describe('the Kiln’s plan', () => {
  it('sends out only as many of each kind as planned', () => {
    const stock = { ember: 20, dew: 10, stone: 5, spark: 0 };
    expect(dayParty(stock, { ember: 4, dew: 10, stone: 0, spark: 0 })).toEqual({
      ember: 4,
      dew: 10,
    });
    expect(dayParty(stock, null)).toEqual({ ember: 20, dew: 10, stone: 5 });
  });

  it('keeps sprays, the plan and the history in the save', () => {
    const state = {
      ...newCampaign(),
      items: { emberbrew: 2, stillwater: 1 },
      plan: { ember: 5, dew: 0, stone: 0, spark: 0 },
      history: [10, 12, 9],
    };
    const back = parseCampaign(JSON.parse(JSON.stringify(state)));
    expect(back?.items).toEqual(state.items);
    expect(back?.plan).toEqual(state.plan);
    expect(back?.history).toEqual(state.history);
  });
});
