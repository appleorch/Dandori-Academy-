import { describe, expect, it } from 'vitest';
import { wardenLog, type DayFacts } from './wardenLog';

const quiet: DayFacts = {
  day: 3,
  section: 'the Wild Quad',
  parts: [],
  relics: 0,
  beasts: 0,
  gates: 0,
  bridges: 0,
  beacons: 0,
  grown: 0,
  lost: 0,
  leftBehind: 0,
  survivors: 10,
  gifts: [],
  firstDay: false,
  finished: false,
};

describe('the Warden’s log', () => {
  it('writes something sensible for a day when nothing happened', () => {
    const text = wardenLog(quiet);
    expect(text).toMatch(/^Day 3\. A quiet day\./);
    expect(text).toContain('Nobody lost');
  });

  it('names the parts, counts the rest, and owns up to losses', () => {
    const text = wardenLog({
      ...quiet,
      day: 7,
      parts: ['The Great Mainspring', 'The Pendulum Bob'],
      relics: 1,
      beasts: 2,
      bridges: 1,
      lost: 3,
      leftBehind: 1,
      gifts: ['The Long Whistle'],
    });
    expect(text).toContain('The Great Mainspring and The Pendulum Bob, all in one day');
    expect(text).toContain('one other relic');
    expect(text).toContain('2 beasts beaten and one bridge built');
    expect(text).toContain('Lost 3 Sproutlings');
    expect(text).toContain('One was left out at sunset');
    expect(text).toContain('The Long Whistle');
    expect(text).not.toContain('A quiet day');
  });

  it('marks first days and finished sections', () => {
    const text = wardenLog({
      ...quiet,
      firstDay: true,
      finished: true,
      parts: ['The Heart of the Clock'],
    });
    expect(text).toContain('First day in the Wild Quad.');
    expect(text).toContain('Every part of the Wild Quad is home.');
  });
});
