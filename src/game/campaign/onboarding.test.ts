import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { NO_INPUT } from '../commands/input';
import { Simulation } from '../simulation/Simulation';
import {
  dayField,
  guidedDay,
  LAWN_FENCE,
  newCampaign,
  parseCampaign,
  settleDay,
  type CampaignState,
} from './campaign';
import { adviceFor, weakness } from './advice';
import { advanceGuide, GUIDE_STEPS, guideText, newGuide } from '../story/guide';
import { KEYBOARD_CONTROLS } from '../story/coach';
import { canBeHit } from '../enemies/beasts';

beforeAll(async () => {
  await initPhysics();
});

const STORY = { story: true } as const;
const still = (sim: Simulation) => ({
  ...NO_INPUT,
  cursorX: sim.captainTransform.x,
  cursorZ: sim.captainTransform.z,
});

/** Runs a day for `seconds` with nobody doing anything, and ends it at sunset. */
function idleDay(state: CampaignState, seconds = 2) {
  const field = dayField(state);
  const sim = new Simulation(field.level, STORY);
  for (let i = 0; i < seconds * 60; i++) sim.step(still(sim));
  return { field, sim };
}

describe('the guided morning', () => {
  it('fences the Kiln’s lawn on a new story’s first day, and not once it is done or skipped', () => {
    const state = newCampaign();
    expect(guidedDay(state)).toBe(true);
    const fences = (dayField(state).level.gates ?? []).filter((g) => g.style === 'fence');
    expect(fences).toHaveLength(LAWN_FENCE.length);
    expect(guidedDay({ ...state, tutorial: 'skipped' })).toBe(false);
    expect(guidedDay({ ...state, tutorial: 'done' })).toBe(false);
    // A story saved before the guided morning existed is past it.
    const old: Partial<CampaignState> = { ...state };
    delete old.tutorial;
    expect(parseCampaign(JSON.parse(JSON.stringify(old)))?.tutorial).toBe('done');
  });

  it('keeps the fence out of reach, opens it with the first part, and settles the tutorial', () => {
    const state = newCampaign();
    const { field, sim } = idleDay(state);
    expect(sim.fenceUp).toBe(true);
    for (const [, enemy] of sim.enemies.entries()) {
      if (enemy.kind === 'gate' && (enemy.shape as { style?: string }).style === 'fence')
        expect(canBeHit(enemy)).toBe(false);
    }
    sim.stats.treasuresCollected.push('part-mainspring');
    sim.step(still(sim));
    sim.step(still(sim));
    expect(sim.fenceOpened).toBe(true);
    expect([...sim.enemies.entries()].some(([, e]) => e.kind === 'gate' && e.hp > 9000)).toBe(
      false,
    );
    const settled = settleDay(state, field, sim);
    expect(settled.state.tutorial).toBe('done');
    // The fence is no gate of the section's: nothing about it is remembered.
    expect(settled.state.done.some((key) => key === 'gate:undefined' || key === 'gate:-1')).toBe(
      false,
    );
  });

  it('steps through its prompts as each thing is done, never asking twice', () => {
    const { sim } = idleDay({ ...newCampaign(), tutorial: 'pending' }, 0);
    let guide = newGuide(sim);
    expect(GUIDE_STEPS[guide.step]).toBe('move');
    sim.captainTransform.x += 10;
    guide = advanceGuide(guide, sim, 0.25) ?? guide;
    expect(GUIDE_STEPS[guide.step]).toBe('pluck');
    for (const step of GUIDE_STEPS) expect(guideText(step, KEYBOARD_CONTROLS, false)).not.toBe('');
    // Something carried home already: the throw and carry steps are passed by.
    sim.stats.treasuresCollected.push('relic-1');
    const passed = { ...guide, step: 2, thrown: true };
    expect(GUIDE_STEPS[advanceGuide(passed, sim, 0.25)?.step ?? 0]).toBe('whistle');
  });
});

describe('the story’s difficulty', () => {
  /** The day's Sproutlings all left far out in the field, idle, at sunset. */
  function strand(state: CampaignState) {
    const { field, sim } = idleDay({ ...state, tutorial: 'done' });
    for (const [entity, worker] of sim.workers.entries()) {
      worker.state = 'idle';
      const at = sim.transforms.require(entity);
      at.x = 60;
      at.z = 40;
    }
    return settleDay(state, field, sim);
  }

  it('brings everyone home on the first night, whatever happened', () => {
    const report = strand({ ...newCampaign(), tutorial: 'done' }).report;
    expect(report.leftBehind).toBe(0);
    expect(report.rescued).toBeGreaterThan(0);
  });

  it('loses the stranded on later nights, except near safety when relaxed', () => {
    const later = { ...newCampaign(), tutorial: 'done' as const, day: 1 };
    expect(strand(later).report.leftBehind).toBeGreaterThan(0);
    // Relaxed: idle and far from safety is still lost...
    expect(strand({ ...later, difficulty: 'relaxed' }).report.leftBehind).toBeGreaterThan(0);
    // ...but anyone working, or idle near the Kiln, comes home.
    const { field, sim } = idleDay({ ...later, difficulty: 'relaxed' });
    for (const [entity, worker] of sim.workers.entries()) {
      worker.state = 'idle';
      const at = sim.transforms.require(entity);
      at.x = sim.level.kiln.x + 25;
      at.z = sim.level.kiln.z;
    }
    expect(settleDay({ ...later, difficulty: 'relaxed' }, field, sim).report.leftBehind).toBe(0);
  });

  it('makes beasts tougher and the safe ring smaller on Hard, and is kept with the story', () => {
    const hard = { ...newCampaign('hard'), tutorial: 'done' as const, day: 1 };
    expect(dayField(hard).level.difficulty).toBe('hard');
    expect(dayField({ ...hard, difficulty: 'normal' }).level.difficulty).toBe('normal');
    // Just inside the normal ring, but outside Hard's.
    const { field, sim } = idleDay(hard);
    for (const [entity, worker] of sim.workers.entries()) {
      worker.state = 'idle';
      const at = sim.transforms.require(entity);
      at.x = sim.level.kiln.x + 9;
      at.z = sim.level.kiln.z;
    }
    expect(settleDay(hard, field, sim).report.leftBehind).toBeGreaterThan(0);
    expect(settleDay({ ...hard, difficulty: 'normal' }, field, sim).report.leftBehind).toBe(0);
    expect(parseCampaign(JSON.parse(JSON.stringify(hard)))?.difficulty).toBe('hard');
  });
});

describe('the base camp’s advice', () => {
  it('waits for the third day, then points at the weakest part of your dandori', () => {
    const state = { ...newCampaign(), tutorial: 'done' as const };
    expect(adviceFor({ ...state, day: 2 })).toBeNull();
    expect(weakness([{ idle: 0.5, lost: 0, hauls: 3 }])).toBe('idle');
    expect(weakness([{ idle: 0.1, lost: 8, hauls: 3 }])).toBe('losses');
    expect(weakness([{ idle: 0.1, lost: 0, hauls: 0.2 }])).toBe('slow');
    expect(weakness([{ idle: 0.1, lost: 0, hauls: 3 }])).toBe('none');
    const idle = adviceFor({ ...state, day: 3, form: [{ idle: 0.6, lost: 0, hauls: 3 }] });
    expect(idle).toMatchObject({ weakness: 'idle', lesson: 'many-hands' });
    expect(adviceFor({ ...state, day: 3, form: [{ idle: 0, lost: 9, hauls: 3 }] })?.screen).toBe(
      'challenges',
    );
  });

  it('records each day’s form when the day is settled', () => {
    const { field, sim } = idleDay({ ...newCampaign(), tutorial: 'done' }, 10);
    const settled = settleDay({ ...newCampaign(), tutorial: 'done' }, field, sim);
    expect(settled.state.form).toHaveLength(1);
    expect(settled.state.form[0].idle).toBeGreaterThanOrEqual(0);
  });
});
