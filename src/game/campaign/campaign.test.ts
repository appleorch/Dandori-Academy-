import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { MODES } from '../modes/modes';
import { emptySave, parseSave } from '../save/saveManager';
import {
  dayField,
  dayParty,
  newCampaign,
  parseCampaign,
  SAFE_RADIUS,
  settleDay,
  type CampaignState,
} from './campaign';
import { CAMPAIGN_SECTIONS } from './sections';

beforeAll(async () => {
  await initPhysics();
});

const story = (state: CampaignState) => {
  const field = dayField(state);
  const sim = new Simulation(field.level, {
    endsWhen: MODES.campaign.endsWhen,
    growth: MODES.campaign.growth,
  });
  return { field, sim };
};

describe.each(CAMPAIGN_SECTIONS)('$name', (section) => {
  it('has twelve Great Clock parts, all of them treasures on the field', () => {
    expect(section.parts).toHaveLength(12);
    for (const id of section.parts) {
      expect(section.level.treasures.some((treasure) => treasure.id === id)).toBe(true);
    }
  });

  it('has every spawn on walkable ground with a way home', () => {
    const { sim, field } = story(newCampaign());
    const level = field.level;
    for (const gate of level.gates ?? []) sim.removeWall(gate);
    for (const bridge of level.bridges ?? []) sim.removeWall(bridge);
    const spots = [
      level.captain,
      level.kiln,
      ...level.treasures,
      ...level.pods,
      ...level.enemies,
      ...(level.blooms ?? []),
      ...(level.logs ?? []),
      ...(level.saps ?? []),
      ...(level.bridges ?? []).map((bridge) => bridge.bank),
      ...(level.beacons ?? []),
    ];
    for (const spot of spots) {
      const wet = sim.inWater(spot.x, spot.z);
      const nav = wet ? sim.wadeNav : sim.nav;
      const home = wet ? sim.wadeKilnField : sim.kilnField;
      expect(nav.isWalkable(spot.x, spot.z), `${spot.x},${spot.z}`).toBe(true);
      expect(
        Number.isFinite(home.dist[nav.cellIndexAt(spot.x, spot.z)]),
        `${spot.x},${spot.z}`,
      ).toBe(true);
    }
    sim.dispose();
  });

  it('is very full: dozens of relics, beasts, pods and things to open up', () => {
    const level = section.level;
    expect(level.treasures.length).toBeGreaterThanOrEqual(30);
    expect(level.enemies.filter((enemy) => enemy.kind !== 'mound').length).toBeGreaterThanOrEqual(
      15,
    );
    expect(level.pods.length).toBeGreaterThanOrEqual(10);
    expect((level.gates ?? []).length + (level.bridges ?? []).length).toBeGreaterThanOrEqual(4);
    expect((level.beacons ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('a story day', () => {
  it('starts the first day with the whole section, bar the parts for later, and ten Emberlings', () => {
    const state = newCampaign();
    const { level } = dayField(state);
    const later = Object.keys(CAMPAIGN_SECTIONS[0].needs ?? {}).length;
    expect(level.treasures).toHaveLength(CAMPAIGN_SECTIONS[0].level.treasures.length - later);
    expect(level.squad).toEqual({ ember: 10 });
    expect(level.startingWorkers).toBe(10);
  });

  it('sends out no more than the field holds, and keeps the rest in the Kiln', () => {
    const party = dayParty({ ember: 90, dew: 20, stone: 10, spark: 5 });
    const out = Object.values(party).reduce((sum, n) => sum + (n ?? 0), 0);
    expect(out).toBe(100);
    expect(party.spark).toBe(5);
    expect(dayParty({ ember: 0, dew: 0, stone: 0, spark: 0 })).toEqual({ ember: 1 });
  });

  it('loses at sunset whoever is out in the field, and keeps the squad and those by the Kiln', () => {
    const { field, sim } = story(newCampaign());
    const workers = [...sim.workers.entries()];
    // Two wander off into the far east and are left idle there.
    for (const [entity, worker] of workers.slice(0, 2)) {
      worker.state = 'idle';
      const at = sim.transforms.require(entity);
      at.x = 60;
      at.z = 0;
    }
    // One is left idle right by the Kiln.
    const [byKiln, waiting] = workers[2];
    waiting.state = 'idle';
    const at = sim.transforms.require(byKiln);
    at.x = field.level.kiln.x + SAFE_RADIUS / 2;
    at.z = field.level.kiln.z;
    sim.ended = 'timeUp';
    const { state, report } = settleDay(newCampaign(), field, sim);
    expect(report.leftBehind).toBe(2);
    expect(report.survivors.ember).toBe(8);
    expect(state.stock.ember).toBe(8);
    expect(state.totals.leftBehind).toBe(2);
    expect(state.day).toBe(1);
    sim.dispose();
  });

  it('keeps gates worn down, bridges half built, and beacons lit from one day to the next', () => {
    const { field, sim } = story(newCampaign());
    const gate = [...sim.enemies.entries()].find(([, enemy]) => enemy.kind === 'gate');
    if (!gate) throw new Error('no gate');
    gate[1].hp = 50;
    sim.bridges[0].delivered = 1;
    sim.bridges[1].built = true;
    sim.beacons[0].lit = true;
    sim.ended = 'endedEarly';
    const { state } = settleDay(newCampaign(), field, sim);
    sim.dispose();
    expect(state.wear[`gate:${gate[1].spawn}`]).toBe(50);
    expect(state.wear['bridge:0']).toBe(1);
    expect(state.done).toContain('bridge:1');
    expect(state.done).toContain('beacon:0');

    const next = story(state);
    const sameGate = [...next.sim.enemies.entries()].find(
      ([, enemy]) => enemy.kind === 'gate' && enemy.spawn === gate[1].spawn,
    );
    expect(sameGate?.[1].hp).toBe(50);
    expect(next.sim.bridges[0].delivered).toBe(1);
    expect(next.sim.bridges[1].built).toBe(true);
    expect(next.sim.inWater(next.sim.bridges[1].box.x, next.sim.bridges[1].box.z)).toBe(false);
    expect(next.sim.beacons[0].lit).toBe(true);
    next.sim.dispose();
  });

  it('is kept in the save, and an old save starts the story afresh', () => {
    const state: CampaignState = {
      ...newCampaign(),
      day: 4,
      done: ['treasure:part-mainspring', 'enemy:0'],
      parts: { 'part-mainspring': 2 },
      wear: { 'gate:0': 120 },
    };
    expect(parseCampaign(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(parseCampaign({ section: 'nowhere' })).toBeNull();
    const old = JSON.parse(JSON.stringify(emptySave())) as Record<string, unknown>;
    delete old.campaign;
    expect(parseSave(old)?.campaign).toEqual(newCampaign());
  });
});
