import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { dayField, newCampaign, parseCampaign, settleDay } from '../campaign/campaign';
import { MODES } from '../modes/modes';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS, type LevelDefinition } from '../world/level';
import { dropDewdrop, pluckNearest, updateDewdrops } from './growth';
import { BLOOM_DAYS, BUD_DAYS, drinkDewdrop, STAGE_SPEED, stageOf } from './sprouts';

beforeAll(async () => {
  await initPhysics();
});

const FIELD: LevelDefinition = {
  ...LEVELS[0],
  id: 'growth',
  width: 60,
  depth: 30,
  dayLength: 300,
  startingWorkers: 4,
  squad: { ember: 4 },
  squadGrowth: { ember: [5, 2] },
  captain: { x: -10, z: 0 },
  kiln: { x: -14, z: 0 },
  obstacles: [],
  treasures: [{ id: 'far', x: 26, z: 12, weight: 1 }],
  pods: [],
  enemies: [],
};

const workers = (sim: Simulation) => [...sim.workers.entries()].map(([, worker]) => worker);

describe('growth stages', () => {
  it('buds after two days and blooms after four, faster at each stage', () => {
    expect(stageOf(0)).toBe('leaf');
    expect(stageOf(BUD_DAYS)).toBe('bud');
    expect(stageOf(BLOOM_DAYS)).toBe('bloom');
    expect(STAGE_SPEED.bud).toBeCloseTo(1.15);
    expect(STAGE_SPEED.bloom).toBeCloseTo(1.3);
  });

  it('grows a stage at once for a Dewdrop, and no further than bloom', () => {
    expect(stageOf(drinkDewdrop(0))).toBe('bud');
    expect(stageOf(drinkDewdrop(drinkDewdrop(0)))).toBe('bloom');
    expect(drinkDewdrop(9)).toBe(9);
  });
});

describe('outside the story', () => {
  it('starts the squad on its feet as leaves, with no Dewdrops', () => {
    const sim = new Simulation({ ...FIELD, squadGrowth: undefined, dewdrops: [{ x: 0, z: 0 }] });
    expect(workers(sim).every((w) => w.state === 'follow' && w.growth === 0)).toBe(true);
    dropDewdrop(sim, { x: 0, z: 0 });
    expect(sim.dewdrops).toHaveLength(0);
  });
});

describe('in the story', () => {
  it('plants the squad round the Kiln, out of the whistle, to be plucked by hand', () => {
    const sim = new Simulation(FIELD, { story: true });
    expect(workers(sim).every((w) => w.state === 'planted')).toBe(true);
    expect(workers(sim).map((w) => w.growth)).toEqual([5, 2, 0, 0]);
    for (let i = 0; i < 60; i++)
      sim.step({ ...NO_INPUT, whistleHeld: true, cursorX: FIELD.kiln.x, cursorZ: FIELD.kiln.z });
    expect(workers(sim).every((w) => w.state === 'planted')).toBe(true);
    const [first] = [...sim.workers.entries()];
    const sprout = sim.transforms.require(first[0]);
    sim.captainTransform.x = sprout.x + 1;
    sim.captainTransform.z = sprout.z;
    expect(pluckNearest(sim)).toBe(true);
    expect(workers(sim).filter((w) => w.state === 'follow')).toHaveLength(1);
  });

  it('lets the first Sproutling to reach a Dewdrop drink it and grow', () => {
    const sim = new Simulation(FIELD, { story: true });
    const [entity, worker] = [...sim.workers.entries()][3];
    const at = sim.transforms.require(entity);
    worker.state = 'idle';
    sim.dewdrops.push({ x: at.x, z: at.z });
    updateDewdrops(sim);
    expect(sim.dewdrops).toHaveLength(0);
    expect(stageOf(worker.growth)).toBe('bud');
  });
});

describe('the story remembers growth', () => {
  it('reads a save from before stages with everyone a leaf', () => {
    const old = { ...newCampaign(), stock: { ember: 3, dew: 1, stone: 0, spark: 0 } } as Record<
      string,
      unknown
    >;
    delete old.growth;
    const parsed = parseCampaign(JSON.parse(JSON.stringify(old)));
    expect(parsed?.growth).toEqual({ ember: [0, 0, 0], dew: [0], stone: [], spark: [] });
  });

  it('sends the most grown out first and ages everyone who lives through the day', () => {
    const state = {
      ...newCampaign(),
      stock: { ember: 2, dew: 0, stone: 0, spark: 0 },
      growth: { ember: [3, 0], dew: [], stone: [], spark: [] },
    };
    const field = dayField(state);
    expect(field.level.squadGrowth?.ember).toEqual([3, 0]);
    const sim = new Simulation(field.level, {
      endsWhen: MODES.campaign.endsWhen,
      growth: MODES.campaign.growth,
      story: true,
    });
    sim.ended = 'endedEarly';
    const { state: next } = settleDay(state, field, sim);
    // Both waited in the ground by the Kiln, safe, all day.
    expect(next.stock.ember).toBe(2);
    expect(next.growth.ember).toEqual([4, 1]);
  });
});
