import { describe, expect, it } from 'vitest';
import { emptySave, loadSave, recordDay, writeSave, type SaveStorage } from './saveManager';

function memoryStorage(initial?: string): SaveStorage & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() {
      return this.value;
    },
    setItem(_key: string, value: string) {
      this.value = value;
    },
  };
}

const day = {
  levelId: 'lesson-1',
  stage: 1,
  score: 2500,
  rank: 'Gold',
  workersAlive: 18,
  treasureIds: ['shard-1', 'shard-2'],
} as const;

describe('save manager', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const save = recordDay(emptySave(), day);
    expect(writeSave(storage, save)).toBe(true);
    expect(loadSave(storage)).toEqual(save);
  });

  it('falls back to an empty save for missing, corrupt or foreign data', () => {
    expect(loadSave(memoryStorage())).toEqual(emptySave());
    expect(loadSave(memoryStorage('{not json'))).toEqual(emptySave());
    expect(loadSave(memoryStorage('{"version":"0"}'))).toEqual(emptySave());
  });

  it('keeps the best results across days', () => {
    const first = recordDay(emptySave(), day);
    const worse = recordDay(first, {
      ...day,
      score: 900,
      rank: 'Bronze',
      workersAlive: 4,
      treasureIds: ['shard-2', 'shard-3'],
    });
    expect(worse.score).toBe(2500);
    expect(worse.bestRanks['lesson-1']).toBe('Gold');
    expect(worse.workerCounts.ember).toBe(18);
    expect(worse.treasuresCollected).toEqual([
      'lesson-1:shard-1',
      'lesson-1:shard-2',
      'lesson-1:shard-3',
    ]);
    const better = recordDay(worse, { ...day, rank: 'Platinum', score: 3100 });
    expect(better.bestRanks['lesson-1']).toBe('Platinum');
    expect(better.score).toBe(3100);
  });
});
