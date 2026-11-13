import { describe, expect, it } from 'vitest';
import { LEVELS } from '../world/level';
import { parseSaveFile, saveFileName, serializeSaveFile } from './saveFile';
import { emptySave, type SaveData } from './saveManager';

const progress: SaveData = {
  ...emptySave(),
  stage: 3,
  score: 4200,
  bestRanks: { 'many-hands': 'Gold' },
  bestScores: { 'many-hands': 1500 },
  achievements: { 'first-shard': '2026-11-13T10:00:00.000Z' },
  totals: { days: 4, treasures: 12, enemies: 1, workersLost: 2 },
};
const now = new Date('2026-11-13T12:00:00Z');

describe('save files', () => {
  it('round-trips through the exported text', () => {
    const result = parseSaveFile(serializeSaveFile(progress, now));
    expect(result).toEqual({ ok: true, save: progress });
  });

  it('accepts bare save data', () => {
    expect(parseSaveFile(JSON.stringify(progress))).toEqual({ ok: true, save: progress });
  });

  it('names files by date', () => {
    expect(saveFileName(now)).toBe('dandori-academy-save-2026-11-13.json');
  });

  it('explains what is wrong with bad files', () => {
    const notJson = parseSaveFile('hello');
    const wrongShape = parseSaveFile('{"format":"dandori-academy-save","save":{"stage":"x"}}');
    const otherVersion = parseSaveFile(JSON.stringify({ ...progress, version: '9' }));
    for (const result of [notJson, wrongShape, otherVersion]) expect(result.ok).toBe(false);
    if (!otherVersion.ok) expect(otherVersion.error).toContain('save format 9');
  });

  it('caps the unlocked stage at the lessons that exist', () => {
    const result = parseSaveFile(JSON.stringify({ ...progress, stage: 99 }));
    expect(result.ok && result.save.stage).toBe(LEVELS.length + 1);
  });
});
