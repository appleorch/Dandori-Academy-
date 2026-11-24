import { describe, expect, it } from 'vitest';
import {
  BACKUP_PREFIX,
  loadSaveChecked,
  migrateSave,
  bestRank,
  hardUnlocked,
  modeBest,
  modeRank,
  storyCleared,
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
    const legacy: Partial<SaveData> = {
      ...recordDay(emptySave(), day),
      bestRanks: { 'lesson-1': 'Gold' },
    };
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

  it('keeps every relic ever brought home, and the biggest squad', () => {
    const first = recordDay(emptySave(), day);
    const second = recordDay(first, {
      ...day,
      workersAlive: 4,
      treasureIds: ['shard-2', 'shard-3'],
    });
    expect(second.workerCounts.ember).toBe(18);
    expect(second.treasuresCollected).toEqual([
      'lesson-1:shard-1',
      'lesson-1:shard-2',
      'lesson-1:shard-3',
    ]);
  });
});

describe('the story', () => {
  const clear = { ...day, rank: null, score: 0, treasureIds: ['a', 'b', 'c', 'd', 'e'] } as const;

  it('counts its days, and opens the next lesson only when every Sunshard comes home', () => {
    const short = recordDay(emptySave(), { ...day, rank: null, score: 0 });
    expect(short.stage).toBe(1);
    expect(short.story.day).toBe(1);
    expect(storyCleared(short, 'lesson-1')).toBe(false);
    const cleared = recordDay(short, clear);
    expect(cleared.stage).toBe(2);
    expect(cleared.story.day).toBe(2);
    expect(storyCleared(cleared, 'lesson-1')).toBe(true);
    // Clearing it again changes nothing but the day count.
    const again = recordDay(cleared, clear);
    expect(again.stage).toBe(2);
    expect(again.story.cleared).toEqual(cleared.story.cleared);
  });

  it('opens Hard on a lesson once it is cleared on Normal, and Hard clears open nothing new', () => {
    expect(hardUnlocked(emptySave(), 'lesson-1')).toBe(false);
    const cleared = recordDay(emptySave(), clear);
    expect(hardUnlocked(cleared, 'lesson-1')).toBe(true);
    const hard = recordDay(cleared, {
      ...clear,
      levelId: 'lesson-2',
      stage: 2,
      difficulty: 'hard',
    });
    expect(hard.stage).toBe(2);
    expect(storyCleared(hard, 'lesson-2', 'hard')).toBe(true);
    expect(storyCleared(hard, 'lesson-2')).toBe(false);
  });

  it('carries an old save over: its days, and the lessons it passed or cleared', () => {
    const old: Partial<SaveData> = {
      ...emptySave(),
      stage: 3,
      bestRanks: { 'lesson-1': 'Gold', 'lesson-2': 'Bronze' },
      bestRanksHard: { 'lesson-1': 'Silver' },
      bestSplits: { 'lesson-3': [10, 20] },
      totals: { ...emptySave().totals, days: 7 },
    };
    delete old.story;
    const loaded = loadSave(memoryStorage(JSON.stringify(old)));
    expect(loaded.story.day).toBe(7);
    expect(storyCleared(loaded, 'lesson-1')).toBe(true);
    expect(storyCleared(loaded, 'lesson-1', 'hard')).toBe(true);
    expect(storyCleared(loaded, 'lesson-2')).toBe(false);
    expect(storyCleared(loaded, 'lesson-3')).toBe(true);
    // A Gold from the scored story still opens Hard.
    expect(hardUnlocked({ ...emptySave(), bestRanks: { 'lesson-9': 'Gold' } }, 'lesson-9')).toBe(
      true,
    );
  });
});

describe('challenges and battles', () => {
  const challenge = { ...day, mode: 'hunt', score: 400, rank: 'Silver' } as const;

  it('keep the best medal and the best score per challenge, apart from each other', () => {
    const one = recordDay(emptySave(), challenge);
    const worse = recordDay(one, { ...challenge, score: 300, rank: 'Bronze' });
    expect(modeRank(worse, 'hunt', 'lesson-1')).toBe('Silver');
    expect(modeBest(worse, 'hunt', 'lesson-1')).toBe(400);
    const better = recordDay(worse, { ...challenge, score: 900, rank: 'Platinum' });
    expect(modeRank(better, 'hunt', 'lesson-1')).toBe('Platinum');
    expect(modeBest(better, 'hunt', 'lesson-1')).toBe(900);
    expect(modeRank(better, 'mission', 'lesson-1')).toBeNull();
    expect(bestRank(better, 'lesson-1')).toBe('Platinum');
  });

  it('never move the story along', () => {
    const done = recordDay(emptySave(), { ...challenge, treasureIds: ['a', 'b', 'c', 'd', 'e'] });
    expect(done.stage).toBe(1);
    expect(done.story.day).toBe(0);
    expect(storyCleared(done, 'lesson-1')).toBe(false);
  });

  it('keep a battle record per race', () => {
    const won = recordDay(emptySave(), { ...day, mode: 'marble', rank: null, battle: 'won' });
    const lost = recordDay(won, { ...day, mode: 'marble', rank: null, battle: 'lost' });
    expect(lost.battles.marble).toEqual({ won: 1, lost: 1, drawn: 0 });
    expect(lost.medals).toEqual({});
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

/** A storage that keeps every key, like the browser's. */
function keyedStorage(save?: string): SaveStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  if (save !== undefined) items.set('dandori-academy-save', save);
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

describe('unreadable saves', () => {
  it('starts fresh but keeps the unreadable data under a backup key, untouched', () => {
    const storage = keyedStorage('{not json');
    const loaded = loadSaveChecked(storage, new Date('2026-11-24T10:00:00Z'));
    expect(loaded.save).toEqual(emptySave());
    expect(loaded.backupKey).toBe(`${BACKUP_PREFIX}2026-11-24T10:00:00.000Z`);
    expect(storage.items.get(loaded.backupKey ?? '')).toBe('{not json');
  });

  it('keeps a save from a version this build cannot read, and no backup for a missing save', () => {
    expect(loadSaveChecked(keyedStorage('{"version":"99"}')).backupKey).not.toBeNull();
    expect(loadSaveChecked(keyedStorage()).backupKey).toBeNull();
    expect(loadSaveChecked(keyedStorage(JSON.stringify(emptySave()))).backupKey).toBeNull();
  });
});

describe('save migrations', () => {
  it('runs each step from a save’s version up to the current one', () => {
    const steps = {
      '0': (raw: Record<string, unknown>) => ({ ...raw, version: '0.5', touched: 1 }),
      '0.5': (raw: Record<string, unknown>) => ({ ...raw, version: '1' }),
    };
    const migrated = migrateSave({ version: '0', stage: 3 }, steps);
    expect(migrated).toEqual({ version: '1', stage: 3, touched: 1 });
    expect(migrateSave({ version: 'unknown' }, steps)).toBeNull();
    expect(migrateSave({ version: '1', stage: 2 }, steps)).toEqual({ version: '1', stage: 2 });
  });
});
