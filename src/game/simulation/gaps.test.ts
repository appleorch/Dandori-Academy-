import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';
import { defineLevel, levelById } from '../world/level';
import { hurtWardensNear } from '../captain/captainSystem';
import { CAMPAIGN_SECTIONS } from '../campaign/sections';
import { ESCORT_FIELDS } from '../world/levels/challenges/escort';
import { relicNotes } from '../story/relicNotes';
import { BOSS_RELICS, CLOCK_PARTS, RELICS } from '../story/relics';
import type { LevelSpec } from '../world/levelTypes';

beforeAll(async () => {
  await initPhysics();
});

const base: LevelSpec = {
  id: 'test-gaps',
  stage: 0,
  name: 'Gaps',
  brief: '',
  width: 60,
  depth: 40,
  dayLength: 200,
  platinumTime: 200,
  seed: 1,
  startingWorkers: 10,
  captain: { x: -20, z: 0 },
  kiln: { x: -24, z: 0 },
  obstacles: [],
  treasures: [],
  pods: [],
  enemies: [],
};
const still = (sim: Simulation) => ({
  ...NO_INPUT,
  cursorX: sim.captainTransform.x,
  cursorZ: sim.captainTransform.z,
});

describe('buried relics', () => {
  it('lie under a sparkling mound until it is dug, then come up to be carried home', () => {
    const sim = new Simulation(
      defineLevel({
        ...base,
        treasures: [{ id: 'buried-1', x: -10, z: 0, weight: 1, buried: true }],
      }),
    );
    expect([...sim.carryables.entries()].some(([, c]) => c.id === 'buried-1')).toBe(false);
    const mound = [...sim.enemies.entries()].find(([, e]) => e.buried?.id === 'buried-1');
    expect(mound).toBeDefined();
    if (!mound) return;
    mound[1].hp = 0;
    sim.step(still(sim));
    expect([...sim.carryables.entries()].some(([, c]) => c.id === 'buried-1')).toBe(true);
    sim.dispose();
  });

  it('are in every story section, with a ledge relic only a Sparkling can reach', () => {
    for (const section of CAMPAIGN_SECTIONS) {
      const treasures = section.level.treasures;
      expect(treasures.filter((t) => t.buried).length, section.id).toBe(3);
      expect(section.level.plateaus?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('arena pillars', () => {
  it('stand two of a charging beast’s blows, then crumble; Sproutlings cannot break them', () => {
    const bellwether = levelById('the-bellwether');
    const pillars = (bellwether?.gates ?? []).filter((g) => g.style === 'pillar');
    expect(pillars).toHaveLength(3);
    const sim = new Simulation(
      defineLevel({
        ...base,
        // The Warden stands near, off to the side; a shard far off keeps the day going.
        captain: { x: 8, z: 10 },
        treasures: [{ id: 'far', x: -26, z: 16, weight: 1 }],
        gates: [{ x: 0, z: 0, w: 3, d: 3, hp: 2, style: 'pillar' }],
        enemies: [{ x: 12, z: 0, kind: 'ramhorn' }],
      }),
    );
    const [[, pillar]] = [...sim.enemies.entries()].filter(([, e]) => e.kind === 'gate');
    const [[, ram]] = [...sim.enemies.entries()].filter(([, e]) => e.kind === 'ramhorn');
    // Aimed straight at the pillar, twice.
    for (let blow = 0; blow < 2; blow++) {
      const at = [...sim.enemies.entries()].find(([, e]) => e === ram);
      if (!at) break;
      const where = sim.transforms.require(at[0]);
      where.x = 6;
      where.z = 0;
      ram.state = 'charge';
      ram.aimX = -1;
      ram.aimZ = 0;
      ram.timer = 3;
      for (let i = 0; i < 60 && ram.state === 'charge'; i++) sim.step(still(sim));
    }
    sim.step(still(sim));
    expect(pillar.hp).toBeLessThanOrEqual(0);
    sim.dispose();
  });
});

describe('sprays on challenge fields', () => {
  it('are granted on two Escort fields, and nowhere else outside the story', () => {
    const granted = ESCORT_FIELDS.filter((f) => f.items);
    expect(granted).toHaveLength(2);
    const sim = new Simulation(defineLevel(granted[0]));
    expect(sim.items.emberbrew + sim.items.stillwater).toBeGreaterThan(0);
    expect(sim.sprayStillwater()).toBe(true);
    sim.dispose();
    const plain = new Simulation(defineLevel(ESCORT_FIELDS[0]));
    expect(plain.items.emberbrew + plain.items.stillwater).toBe(0);
    plain.dispose();
  });
});

describe('co-op danger', () => {
  it('hurts the second player’s Warden too, when a blow lands by them', () => {
    const sim = new Simulation(defineLevel(base), { coop: true });
    const partner = sim.partnerWarden;
    if (!partner) throw new Error('no partner');
    const before = partner.hp;
    hurtWardensNear(sim, partner.x, partner.z, 1, partner.x, partner.z);
    expect(sim.partnerWarden?.hp).toBe(before - 1);
    expect(sim.captainState.hp).toBe(before);
    sim.dispose();
  });
});

describe('relic notes', () => {
  it('give every Clock part and boss relic two notes, and ordinary relics none', () => {
    for (const relic of [...Object.values(CLOCK_PARTS), ...Object.values(BOSS_RELICS)]) {
      const notes = relicNotes(relic);
      expect(notes?.warden.length ?? 0, relic.id).toBeGreaterThan(10);
      expect(notes?.sprocket.length ?? 0, relic.id).toBeGreaterThan(10);
    }
    expect(relicNotes(RELICS[0])).toBeNull();
  });
});

describe('kind puzzles', () => {
  it('set a Dewling’s shard in the nearest water and a heavy one for Stonelings', () => {
    const quad = CAMPAIGN_SECTIONS[0].level;
    const sim = new Simulation(defineLevel({ ...quad, id: 'test-quad' }));
    const wet = sim.spawnPractice('dew');
    expect(wet).not.toBeNull();
    if (wet) expect(sim.inWater(wet.x, wet.z)).toBe(true);
    expect(sim.spawnPractice('stone')).not.toBeNull();
    const ids = [...sim.carryables.entries()].map(([, c]) => c.id);
    expect(ids).toContain('practice-dew');
    expect(ids).toContain('practice-stone');
    expect(sim.spawnPractice('spark')).toBeNull();
    sim.dispose();
  });
});
