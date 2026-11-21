import { describe, expect, it } from 'vitest';
import {
  bestRank,
  bestScore,
  hardUnlocked,
  emptySave,
  loadSave,
  markPosted,
  queueForBoard,
  recordDay,
  runKey,
  writeSave,
  type SaveData,
  type SaveStorage,
} from './saveManager';
import type { RunEntry } from '../leaderboard/runCode';

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
  difficulty: 'normal',
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
  bossesDefeated: [],
  bloomsCollected: 0,
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
    expect(two.totals).toEqual({
      ...emptySave().totals,
      days: 2,
      treasures: 4,
      enemies: 2,
      workersLost: 2,
    });
    const busy = recordDay(two, { ...day, feats: { grown: 6, rescued: 2, glowcaps: 1, caves: 1 } });
    expect(busy.totals).toMatchObject({ days: 3, grown: 6, rescued: 2, glowcaps: 1, caveTrips: 1 });
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

  it('keeps Hard bests apart, counts them in the total and opens Hard at Gold', () => {
    expect(hardUnlocked(emptySave(), 'lesson-1')).toBe(false);
    const silver = recordDay(emptySave(), { ...day, rank: 'Silver' });
    expect(hardUnlocked(silver, 'lesson-1')).toBe(false);
    const gold = recordDay(silver, day);
    expect(hardUnlocked(gold, 'lesson-1')).toBe(true);
    const hard = recordDay(gold, { ...day, difficulty: 'hard', rank: 'Bronze', score: 700 });
    expect(bestRank(hard, 'lesson-1')).toBe('Gold');
    expect(bestRank(hard, 'lesson-1', 'hard')).toBe('Bronze');
    expect(bestScore(hard, 'lesson-1', 'hard')).toBe(700);
    expect(hard.score).toBe(2500 + 700);
    expect(hard.stage).toBe(gold.stage);
    const legacy: Partial<SaveData> = { ...gold };
    delete legacy.bestRanksHard;
    delete legacy.bestScoresHard;
    expect(loadSave(memoryStorage(JSON.stringify(legacy))).bestRanksHard).toEqual({});
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

describe('the board outbox', () => {
  const run = (score: number, at: string): RunEntry => ({
    v: 1,
    game: 'test',
    level: 'lesson-1',
    difficulty: 'normal',
    print: '0000000000000000',
    score,
    treasure: 0,
    timeBonus: 0,
    workerBonus: 0,
    lossPenalty: 0,
    glowcaps: 0,
    rank: 'Copper',
    shards: 0,
    shardsTotal: 5,
    time: 10,
    timeLeft: 110,
    alive: 10,
    lost: 0,
    at,
  });
  const play = (save: SaveData, entry: RunEntry): SaveData =>
    queueForBoard(save, recordDay(save, { ...day, score: entry.score, run: entry }), entry);

  it('queues a new personal best, and only a new one', () => {
    const first = play(emptySave(), run(100, '2026-11-19T01:00:00Z'));
    expect(first.outbox.map((entry) => entry.score)).toEqual([100]);
    const worse = play(first, run(90, '2026-11-19T02:00:00Z'));
    expect(worse.outbox.map((entry) => entry.score)).toEqual([100]);
    const better = play(worse, run(120, '2026-11-19T03:00:00Z'));
    // The better run replaces the waiting one: the board keeps one run per lesson anyway.
    expect(better.outbox.map((entry) => entry.score)).toEqual([120]);
  });

  it('clears a run from the outbox once it is posted, and remembers it', () => {
    const queued = play(emptySave(), run(100, '2026-11-19T01:00:00Z'));
    const posted = markPosted(queued, queued.outbox[0]);
    expect(posted.outbox).toEqual([]);
    expect(posted.posted).toEqual([runKey(queued.outbox[0])]);
  });

  it('keeps the outbox through a save and a load', () => {
    const queued = play(emptySave(), run(100, '2026-11-19T01:00:00Z'));
    const storage = memoryStorage();
    writeSave(storage, queued);
    const loaded = loadSave(storage);
    expect(loaded.outbox).toEqual(queued.outbox);
    expect(loaded.posted).toEqual([]);
  });
});
