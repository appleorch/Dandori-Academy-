import { describe, expect, it } from 'vitest';
import {
  bestRank,
  emptySave,
  loadSave,
  recordDay,
  writeSave,
  type SaveData,
  type SaveStorage,
} from './saveManager';

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
  workersLost: 1,
  treasureIds: ['shard-1', 'shard-2'],
  treasuresTotal: 5,
  enemiesDefeated: 1,
  enemiesTotal: 2,
  captainHits: 0,
  timeLeft: 0,
  dayLength: 120,
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

  it('loads saves written before bestScores, achievements and totals existed', () => {
    const legacy: Partial<SaveData> = recordDay(emptySave(), day);
    delete legacy.bestScores;
    delete legacy.achievements;
    delete legacy.totals;
    const loaded = loadSave(memoryStorage(JSON.stringify(legacy)));
    expect(loaded.bestRanks['lesson-1']).toBe('Gold');
    expect(loaded.bestScores).toEqual({});
    expect(loaded.achievements).toEqual({});
    expect(loaded.totals).toEqual(emptySave().totals);
  });

  it('rejects a save with an impossible stage', () => {
    const bad = { ...emptySave(), stage: 0 };
    expect(loadSave(memoryStorage(JSON.stringify(bad)))).toEqual(emptySave());
  });

  it('adds every day to the running totals', () => {
    const two = recordDay(recordDay(emptySave(), day), day);
    expect(two.totals).toEqual({ days: 2, treasures: 4, enemies: 2, workersLost: 2 });
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
    expect(bestRank(worse, 'lesson-1')).toBe('Gold');
    expect(worse.workerCounts.ember).toBe(18);
    expect(worse.treasuresCollected).toEqual([
      'lesson-1:shard-1',
      'lesson-1:shard-2',
      'lesson-1:shard-3',
    ]);
    const better = recordDay(worse, { ...day, rank: 'Platinum', score: 3100 });
    expect(bestRank(better, 'lesson-1')).toBe('Platinum');
    expect(better.score).toBe(3100);
  });

  it('totals the best score of every lesson', () => {
    const one = recordDay(emptySave(), day);
    const two = recordDay(one, { ...day, levelId: 'lesson-2', stage: 2, score: 1000 });
    expect(two.bestScores).toEqual({ 'lesson-1': 2500, 'lesson-2': 1000 });
    expect(two.score).toBe(3500);
  });

  it('unlocks the next lesson at Silver or better, never below', () => {
    expect(bestRank(emptySave(), 'lesson-1')).toBeNull();
    expect(recordDay(emptySave(), { ...day, rank: 'Bronze' }).stage).toBe(1);
    const silver = recordDay(emptySave(), { ...day, rank: 'Silver' });
    expect(silver.stage).toBe(2);
    expect(recordDay(silver, { ...day, rank: 'Bronze' }).stage).toBe(2);
    expect(recordDay(silver, { ...day, levelId: 'lesson-2', stage: 2 }).stage).toBe(3);
  });
});
