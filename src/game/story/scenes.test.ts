import { beforeAll, describe, expect, it } from 'vitest';
import { dayField, newCampaign, settleDay } from '../campaign/campaign';
import { CAMPAIGN_SECTIONS } from '../campaign/sections';
import { emptySave, parseSave } from '../save/saveManager';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { openingScene, partScene, SPEAKER_NAMES } from './scenes';

beforeAll(async () => {
  await initPhysics();
});

describe('story scenes', () => {
  it('opens every section with a scene of its own, each line spoken by someone named', () => {
    const ids = new Set<string>();
    for (const section of CAMPAIGN_SECTIONS) {
      const scene = openingScene(section.id);
      expect(scene, section.id).not.toBeNull();
      if (!scene) continue;
      ids.add(scene.id);
      expect(scene.lines.length).toBeGreaterThan(1);
      for (const line of scene.lines) {
        expect(SPEAKER_NAMES[line.who]).toBeTruthy();
        expect(line.text.length).toBeGreaterThan(10);
      }
    }
    expect(ids.size).toBe(CAMPAIGN_SECTIONS.length);
    // Quill is met in the Foundry; Sprocket confesses in the Observatory.
    expect(openingScene('foundry')?.lines.some((line) => line.who === 'quill')).toBe(true);
    expect(openingScene('observatory')?.lines.some((l) => l.text.includes('wrong way'))).toBe(true);
  });

  it('marks each part’s return at the Kiln, with a line that changes as more come home', () => {
    const first = partScene(1, 'The Click Spring');
    expect(first.lines[0].text).toBe('The Click Spring, home.');
    expect(first.lines.every((line) => line.camera === 'kiln')).toBe(true);
    expect(partScene(2, 'x').lines[1].text).not.toBe(first.lines[1].text);
  });

  it('remembers which scenes and beasts have been seen, and reads saves from before', () => {
    const old = JSON.parse(JSON.stringify(emptySave()));
    delete old.scenesSeen;
    delete old.beastsBeaten;
    const parsed = parseSave(old);
    expect(parsed?.scenesSeen).toEqual([]);
    expect(parsed?.beastsBeaten).toEqual([]);
  });
});

describe('the Warden’s log in the story', () => {
  it('writes an entry at every sunset and keeps it in the save', () => {
    const state = newCampaign();
    const field = dayField(state);
    const sim = new Simulation(field.level, { story: true });
    sim.ended = 'endedEarly';
    const { state: next } = settleDay(state, field, sim);
    sim.dispose();
    expect(next.log).toHaveLength(1);
    expect(next.log[0].text).toMatch(/^Day 1\. First day in The Wild Quad\./);
  });
});
