import { describe, expect, it } from 'vitest';
import { emptySave, recordDay, type DayRecord, type SaveData } from '../save/saveManager';
import { LEVELS } from '../world/level';
import { ACHIEVEMENTS, findAchievement, unlockAchievements } from './achievements';

const now = new Date('2026-11-13T12:00:00Z');

const day: DayRecord = {
  levelId: 'the-guard',
  stage: 3,
  score: 2000,
  rank: 'Silver',
  workersAlive: 12,
  workersLost: 1,
  treasureIds: ['shard-1', 'shard-2'],
  treasuresTotal: 4,
  enemiesDefeated: 0,
  enemiesTotal: 1,
  captainHits: 1,
  timeLeft: 0,
  dayLength: 120,
};

function play(save: SaveData, record: DayRecord): { save: SaveData; ids: string[] } {
  const result = unlockAchievements(recordDay(save, record), record, now);
  return { save: result.save, ids: result.unlocked.map((a) => a.id) };
}

describe('achievements', () => {
  it('have unique ids and are all reachable by lookup', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(findAchievement(id)?.id).toBe(id);
  });

  it('unlocks only what a partial day earned', () => {
    expect(play(emptySave(), day).ids).toEqual(['first-shard']);
  });

  it('unlocks day feats for a perfect day, and never twice', () => {
    const perfect: DayRecord = {
      ...day,
      rank: 'Platinum',
      workersLost: 0,
      treasureIds: ['a', 'b', 'c', 'd'],
      enemiesDefeated: 1,
      captainHits: 0,
      timeLeft: 70,
    };
    const first = play(emptySave(), perfect);
    expect(first.ids).toEqual([
      'first-shard',
      'clean-sweep',
      'early-finish',
      'nobody-left-behind',
      'first-hunt',
      'pest-control',
      'untouchable',
      'platinum-student',
    ]);
    expect(first.save.achievements['clean-sweep']).toBe(now.toISOString());
    expect(play(first.save, perfect).ids).toEqual([]);
  });

  it('tracks counters and grants them from a save alone', () => {
    const hunter = findAchievement('mossback-hunter');
    const save: SaveData = {
      ...emptySave(),
      totals: { days: 3, treasures: 0, enemies: 24, workersLost: 0 },
    };
    expect(hunter?.progress?.(save)).toEqual([24, 25]);
    const more = { ...save, totals: { ...save.totals, enemies: 30 } };
    expect(hunter?.progress?.(more)).toEqual([25, 25]);
    expect(unlockAchievements(more, null, now).unlocked.map((a) => a.id)).toEqual([
      'first-hunt',
      'mossback-hunter',
    ]);
  });

  it('awards the rank milestones', () => {
    const allPlatinum: SaveData = {
      ...emptySave(),
      bestRanks: Object.fromEntries(LEVELS.map((level) => [level.id, 'Platinum'])),
    };
    const ids = unlockAchievements(allPlatinum, null, now).unlocked.map((a) => a.id);
    expect(ids).toEqual(['platinum-student', 'honor-roll', 'graduate', 'dandori-master']);
  });
});
