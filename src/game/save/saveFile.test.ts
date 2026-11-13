import { describe, expect, it } from 'vitest';
import { LEVELS } from '../world/level';
import { readSaveFile, saveFileName, writeSaveFile } from './saveFile';
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
const nonce = (seed: number) => new Uint8Array(16).map((_, i) => (i * 37 + seed) & 0xff);

function errorOf(bytes: Uint8Array): string {
  const result = readSaveFile(bytes);
  if (result.ok) throw new Error('expected the file to be refused');
  return result.error;
}

describe('.dandori save files', () => {
  it('round-trips', () => {
    expect(readSaveFile(writeSaveFile(progress, now, nonce(1)))).toEqual({
      ok: true,
      save: progress,
    });
  });

  it('is unreadable as text and different on every download', () => {
    const file = writeSaveFile(progress, now, nonce(1));
    const asText = new TextDecoder('latin1').decode(file);
    for (const word of ['bestRanks', 'many-hands', 'Gold', '4200', 'achievements']) {
      expect(asText).not.toContain(word);
    }
    expect(asText.startsWith('DNDR')).toBe(true);
    expect(writeSaveFile(progress, now, nonce(2))).not.toEqual(file);
  });

  it('refuses a file with any single byte changed', () => {
    const file = writeSaveFile(progress, now, nonce(1));
    for (let i = 4; i < file.length; i += 7) {
      const edited = file.slice();
      edited[i] ^= 0x01;
      expect(readSaveFile(edited).ok).toBe(false);
    }
    const edited = file.slice();
    edited[40] ^= 0x20;
    expect(errorOf(edited)).toContain('modified or damaged');
  });

  it('refuses truncated, foreign, old-style and newer files with a reason', () => {
    const file = writeSaveFile(progress, now, nonce(1));
    expect(errorOf(file.slice(0, file.length - 1))).toContain('modified or damaged');
    expect(
      errorOf(new TextEncoder().encode('hello there, this is not a save file at all!!')),
    ).toContain('not a Dandori Academy save file');
    expect(errorOf(new TextEncoder().encode(JSON.stringify(progress)))).toContain('old-style');
    const newer = file.slice();
    newer[4] = 2;
    expect(errorOf(newer)).toContain('newer version');
  });

  it('names files by date', () => {
    expect(saveFileName(now)).toBe('dandori-academy-2026-11-13.dandori');
  });

  it('caps the unlocked stage at the lessons that exist', () => {
    const result = readSaveFile(writeSaveFile({ ...progress, stage: 99 }, now, nonce(3)));
    expect(result.ok && result.save.stage).toBe(LEVELS.length + 1);
  });
});
