import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT, type InputState } from '../commands/input';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';
import { defineLevel } from '../world/level';
import { greedyPlayer } from '../world/testBot';
import { packInputs, unpackInputs } from '../replay/inputLog';
import { dayField, newCampaign } from '../campaign/campaign';
import { CAMPAIGN_SECTIONS } from '../campaign/sections';
import { MODES } from '../modes/modes';
import type { LevelSpec } from '../world/levelTypes';

beforeAll(async () => {
  await initPhysics();
});

const field: LevelSpec = {
  id: 'test-squad',
  stage: 0,
  name: 'Squad',
  brief: '',
  width: 60,
  depth: 40,
  dayLength: 200,
  platinumTime: 200,
  seed: 1,
  startingWorkers: 8,
  squad: { ember: 4, stone: 4 },
  captain: { x: -20, z: 0 },
  kiln: { x: -24, z: 0 },
  obstacles: [],
  treasures: [{ id: 'far', x: 20, z: 10, weight: 1 }],
  pods: [],
  enemies: [],
};
const at = (sim: Simulation, extra: Partial<InputState> = {}): InputState => ({
  ...NO_INPUT,
  cursorX: sim.captainTransform.x + 6,
  cursorZ: sim.captainTransform.z,
  ...extra,
});

describe('squad control', () => {
  it('throws whoever stands nearest in any-kind mode, of both kinds', () => {
    const sim = new Simulation(defineLevel(field));
    for (let i = 0; i < 30; i++) sim.step(at(sim));
    sim.step(at(sim, { selectKind: 'any' }));
    expect(sim.throwAny).toBe(true);
    const thrown = new Set<string>();
    for (let i = 0; i < 240; i++) {
      sim.step(at(sim, { throwHeld: true }));
      for (const [, w] of sim.workers.entries()) if (w.state !== 'follow') thrown.add(w.kind);
    }
    expect(thrown.size).toBe(2);
    // Choosing a kind ends it.
    sim.step(at(sim, { selectKind: 'ember' }));
    expect(sim.throwAny).toBe(false);
    sim.dispose();
  });

  it('keeps any-kind in the input log', () => {
    const inputs = [{ ...NO_INPUT, selectKind: 'any' as const }, NO_INPUT];
    expect(unpackInputs(packInputs(inputs))[0].selectKind).toBe('any');
  });

  it('sorts the squad into groups by kind behind the Warden', () => {
    const sim = new Simulation(defineLevel(field));
    sim.sortSquad();
    for (let i = 0; i < 300; i++) sim.step(at(sim));
    // Each kind's centre is apart from the other's.
    const centre = (kind: string) => {
      const list = [...sim.workers.entries()].filter(([, w]) => w.kind === kind);
      const xs = list.map(([e]) => sim.transforms.require(e));
      return {
        x: xs.reduce((s, p) => s + p.x, 0) / xs.length,
        z: xs.reduce((s, p) => s + p.z, 0) / xs.length,
      };
    };
    const a = centre('ember');
    const b = centre('stone');
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1);
    sim.dispose();
  });

  it('lets the test player share the work between two Wardens in the story', () => {
    const state = {
      ...newCampaign(),
      tutorial: 'done' as const,
      stock: { ember: 30, dew: 0, stone: 0, spark: 0 },
    };
    const level = dayField({
      ...state,
      growth: { ember: Array(30).fill(0), dew: [], stone: [], spark: [] },
    }).level;
    const sim = new Simulation(level, {
      endsWhen: MODES.campaign.endsWhen,
      growth: MODES.campaign.growth,
    });
    // The Clock's eighth gift, given directly: a second Warden beside the Kiln.
    sim.otherWarden = sim.nav.nearestWalkable(level.kiln.x + 4, level.kiln.z + 4);
    const player = greedyPlayer(sim);
    for (let tick = 0; tick < 60 * 120 && !sim.ended; tick++) sim.step(player.input(tick));
    expect(player.switches).toBeGreaterThan(0);
    expect(sim.stats.treasuresCollected.length).toBeGreaterThan(0);
    sim.dispose();
    void CAMPAIGN_SECTIONS;
  });
});
