import { describe, expect, it } from 'vitest';
import { parseSettings } from '../core/settings';
import { tunedLevel } from './QualityTuner';

const frames = (ms: number) => Array.from({ length: 180 }, (_, i) => ms + (i % 3) - 1);

describe('the first-day graphics tuner', () => {
  it('keeps the level on a device that keeps up', () => {
    expect(tunedLevel('high', frames(16))).toBe('high');
    expect(tunedLevel('medium', frames(30))).toBe('medium');
  });

  it('lowers one level when slow and two when very slow, never below low', () => {
    expect(tunedLevel('high', frames(45))).toBe('medium');
    expect(tunedLevel('high', frames(80))).toBe('low');
    expect(tunedLevel('low', frames(80))).toBe('low');
  });

  it('is never fooled by a few long frames', () => {
    const spiky = frames(16).map((ms, i) => (i % 10 === 0 ? 200 : ms));
    expect(tunedLevel('high', spiky)).toBe('high');
  });

  it('remembers once the level is settled, and treats older settings as not yet tuned', () => {
    expect(parseSettings({ graphics: 'medium', graphicsTuned: true }).graphicsTuned).toBe(true);
    expect(parseSettings({ graphics: 'medium' }).graphicsTuned).toBe(false);
  });
});
