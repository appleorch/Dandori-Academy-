import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { damageEnemy } from '../enemies/combat';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS, type LevelDefinition } from '../world/level';
import { spawnWorker } from '../world/spawn';
import {
  allPartsHome,
  campaignEnding,
  dayField,
  newCampaign,
  settleDay,
  switchSection,
  totalParts,
} from './campaign';
import { DAY_LIMIT } from './endings';
import { CAMPAIGN_SECTIONS } from './sections';

beforeAll(async () => {
  await initPhysics();
});

const FIELD: LevelDefinition = {
  ...LEVELS[0],
  id: 'endgame',
  width: 60,
  depth: 40,
  dayLength: 300,
  startingWorkers: 0,
  squad: {},
  captain: { x: -25, z: 15 },
  kiln: { x: -27, z: 17 },
  obstacles: [],
  treasures: [{ id: 'far', x: 20, z: 15, weight: 1 }],
  pods: [],
  enemies: [],
};

const step = (sim: Simulation, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++)
    sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: sim.captainTransform.z });
};

describe('conveyor belts', () => {
  it('carry hauls and Sproutlings on foot along them, and nothing off them', () => {
    const sim = new Simulation({
      ...FIELD,
      conveyors: [{ x: 0, z: 0, w: 30, d: 6, dx: 1, dz: 0 }],
      treasures: [
        { id: 'on', x: -10, z: 0, weight: 1 },
        { id: 'off', x: -10, z: 12, weight: 1 },
      ],
    });
    const worker = spawnWorker(sim, -5, 1, 'idle');
    sim.workers.require(worker).scan = 99;
    const where = (id: string) => {
      const found = [...sim.carryables.entries()].find(([, c]) => c.id === id);
      if (!found) throw new Error(id);
      return sim.transforms.require(found[0]);
    };
    step(sim, 1);
    expect(where('on').x).toBeGreaterThan(-8);
    expect(where('off').x).toBeCloseTo(-10, 1);
    expect(sim.transforms.require(worker).x).toBeGreaterThan(-3);
  });
});

describe('the telescope', () => {
  it('hides what it shows until it is looked through, and the story remembers it', () => {
    const observatory = CAMPAIGN_SECTIONS.find((s) => s.id === 'observatory');
    if (!observatory) throw new Error('no observatory');
    const state = switchSection(newCampaign(), 'observatory');
    const field = dayField(state);
    const sim = new Simulation(field.level, { story: true });
    const lying = () => [...sim.carryables.entries()].map(([, c]) => c.id);
    const shown = field.level.telescope?.reveals ?? [];
    expect(shown.length).toBe(3);
    for (const id of shown) expect(lying()).not.toContain(id);
    expect(sim.aimTelescope()).toBe(true);
    for (const id of shown) expect(lying()).toContain(id);
    expect(sim.aimTelescope()).toBe(false);
    sim.ended = 'endedEarly';
    const { state: next } = settleDay(state, field, sim);
    expect(next.done).toContain('telescope');
    expect(dayField(next).level.telescope).toBeUndefined();
    sim.dispose();
  });
});

describe('the Hollow Warden', () => {
  it('is truly hurt by one kind in each phase, and barely by the rest', () => {
    const sim = new Simulation({ ...FIELD, enemies: [{ x: 0, z: 0, kind: 'hollowwarden' }] });
    const [entity, warden] = [...sim.enemies.entries()][0];
    warden.state = 'recover';
    const hit = (kind: 'ember' | 'dew' | 'stone' | 'spark') => {
      const before = warden.hp;
      damageEnemy(sim, entity, warden, 10, kind);
      return before - warden.hp;
    };
    for (const [phase, weak] of (['stone', 'ember', 'dew', 'spark'] as const).entries()) {
      warden.phase = phase;
      const others = (['stone', 'ember', 'dew', 'spark'] as const).filter((k) => k !== weak);
      expect(hit(weak)).toBeCloseTo(10);
      for (const kind of others) expect(hit(kind)).toBeLessThan(2);
    }
  });
});

describe('the finale', () => {
  const everything = () => {
    const parts = Object.fromEntries(CAMPAIGN_SECTIONS[0].parts.map((id) => [id, 1]));
    const others = Object.fromEntries(
      CAMPAIGN_SECTIONS.slice(1).map((section) => [
        section.id,
        {
          done: [],
          wear: {},
          parts: Object.fromEntries(section.parts.map((id) => [id, 5])),
          finished: 5,
          seen: '',
        },
      ]),
    );
    return { ...newCampaign(), parts, others };
  };

  it('plays each ending from a synthetic save', () => {
    const all = everything();
    expect(allPartsHome(all)).toBe(totalParts());
    expect(totalParts()).toBe(42);
    expect(campaignEnding({ ...all, day: 20 }, false)).toBe('golden');
    expect(campaignEnding({ ...all, day: DAY_LIMIT + 4 }, false)).toBe('late');
    expect(campaignEnding({ ...newCampaign(), day: DAY_LIMIT }, false)).toBe('silent');
    expect(campaignEnding({ ...newCampaign(), day: DAY_LIMIT }, true)).toBeNull();
  });
});
