import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { emptySave } from '../save/saveManager';
import { ACHIEVEMENTS, grantAchievement } from '../progression/achievements';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS } from '../world/level';
import { Coach } from './coach';
import { chapterOf, CHAPTERS, EPILOGUE, LESSON_STORY, PROLOGUE } from './story';

beforeAll(async () => {
  await initPhysics();
});

describe('the story', () => {
  it('has a briefing and a journal entry for every lesson', () => {
    for (const level of LEVELS) {
      const story = LESSON_STORY[level.id];
      expect(story, level.id).toBeDefined();
      expect(story.briefing.length).toBeGreaterThan(40);
      expect(story.journal.length).toBeGreaterThan(40);
    }
    expect(Object.keys(LESSON_STORY).length).toBe(LEVELS.length);
  });

  it('puts every lesson in exactly one chapter, in order, with no gaps', () => {
    let next = 1;
    for (const chapter of CHAPTERS) {
      expect(chapter.from).toBe(next);
      expect(chapter.to).toBeGreaterThanOrEqual(chapter.from);
      next = chapter.to + 1;
    }
    expect(next).toBe(LEVELS.length + 1);
    for (const level of LEVELS) {
      const chapter = chapterOf(level.stage);
      expect(level.stage).toBeGreaterThanOrEqual(chapter.from);
      expect(level.stage).toBeLessThanOrEqual(chapter.to);
    }
  });

  it('gives each term its own setting', () => {
    const themes = CHAPTERS.map((chapter) => LEVELS[chapter.from - 1].theme);
    expect(themes).toEqual(['meadow', 'autumn', 'marsh', 'dusk', 'cave', 'terrarium', 'cave']);
  });

  it('opens and closes with a few pages', () => {
    expect(PROLOGUE.length).toBeGreaterThanOrEqual(2);
    expect(EPILOGUE.length).toBeGreaterThanOrEqual(2);
  });
});

describe('the coach', () => {
  it('explains throwing at the start of the first lesson, once', () => {
    const sim = new Simulation(LEVELS[0]);
    const coach = new Coach(false);
    const lines: string[] = [];
    for (let i = 0; i < 60 * 30; i++) {
      sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: 0 });
      if (i % 6 === 0) {
        const line = coach.update(sim, 0.1);
        if (line && lines[lines.length - 1] !== line) lines.push(line);
      }
    }
    expect(lines[0]).toContain('left mouse button');
    expect(lines.filter((line) => line.includes('left mouse button')).length).toBe(1);
    // Nothing is said twice in a row, and advice never floods.
    expect(lines.length).toBeLessThan(5);
    sim.dispose();
  });

  it('words its advice for touch screens', () => {
    const sim = new Simulation(LEVELS[0]);
    const coach = new Coach(true);
    let line: string | null = null;
    for (let i = 0; i < 60 * 4 && !line; i++) {
      sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: 0 });
      line = coach.update(sim, 1 / 60);
    }
    expect(line).toContain('Touch');
    sim.dispose();
  });
});

describe('secret achievements', () => {
  const now = new Date('2026-11-17T12:00:00Z');

  it('are granted by id, once', () => {
    const first = grantAchievement(emptySave(), 'back-room', now);
    expect(first.achievements['back-room']).toBe(now.toISOString());
    expect(grantAchievement(first, 'back-room', new Date())).toBe(first);
  });

  it('cannot be granted if they do not exist', () => {
    const save = emptySave();
    expect(grantAchievement(save, 'made-up', now)).toBe(save);
  });

  it('are never earned by simply finishing a day', () => {
    const secrets = ACHIEVEMENTS.filter((achievement) => achievement.secret);
    expect(secrets.map((achievement) => achievement.id)).toEqual([
      'back-room',
      'card-shark',
      'royal-flush',
    ]);
    for (const achievement of secrets) expect(achievement.earned(emptySave(), null)).toBe(false);
  });
});
