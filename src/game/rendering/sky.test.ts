import { describe, expect, it } from 'vitest';
import { dayPhase, STORY_SUNSET_SECONDS } from './SkyLight';

const at = (timeLeft: number, dayLength = 540) => ({ timeLeft, level: { dayLength } });

describe('the time of day', () => {
  it('follows the clock outside the story', () => {
    expect(dayPhase(at(540), false)).toBe(0);
    expect(dayPhase(at(270), false)).toBe(0.5);
    expect(dayPhase(at(0), false)).toBe(1);
  });

  it('in the story, sets the sun over exactly the last ninety seconds', () => {
    expect(dayPhase(at(540), true)).toBe(0);
    expect(dayPhase(at(STORY_SUNSET_SECONDS + 1), true)).toBeLessThan(0.85);
    expect(dayPhase(at(STORY_SUNSET_SECONDS), true)).toBeCloseTo(0.85);
    expect(dayPhase(at(0), true)).toBe(1);
  });

  it('keeps a fixed sky on a day with no clock', () => {
    expect(dayPhase(at(0, 0), false)).toBe(0.35);
  });
});
