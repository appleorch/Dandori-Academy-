import { describe, expect, it } from 'vitest';
import { emptySave, recordDay, type DayRecord, type SaveData } from '../save/saveManager';
import { LEVELS } from '../world/level';
import { ACHIEVEMENTS, findAchievement, unlockAchievements } from './achievements';

const now = new Date('2026-11-13T12:00:00Z');

const day: DayRecord = {
  levelId: 'the-guard',
  difficulty: 'normal',
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
  bossesDefeated: [],
  bloomsCollected: 0,
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
      mode: 'hunt',
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
      totals: { ...emptySave().totals, days: 3, enemies: 24 },
    };
    expect(hunter?.progress?.(save)).toEqual([24, 25]);
    const more = { ...save, totals: { ...save.totals, enemies: 30 } };
    expect(hunter?.progress?.(more)).toEqual([25, 25]);
    expect(unlockAchievements(more, null, now).unlocked.map((a) => a.id)).toEqual([
      'first-hunt',
      'mossback-hunter',
    ]);
  });

  it('awards boss and Glowcap feats from the day they happen', () => {
    const day2: DayRecord = {
      ...day,
      bossesDefeated: ['gravelmaw', 'bellwether'],
      bloomsCollected: 1,
    };
    const ids = play(emptySave(), day2).ids;
    expect(ids).toEqual(expect.arrayContaining(['glowcap', 'gatecrasher', 'bell-ringer']));
    expect(ids).not.toContain('uprooted');
  });

  it('awards the Hard milestones for story clears on Hard', () => {
    const hardClear: DayRecord = {
      ...day,
      levelId: 'many-hands',
      difficulty: 'hard',
      rank: null,
      score: 0,
      treasureIds: ['a', 'b', 'c', 'd'],
    };
    expect(play(emptySave(), hardClear).ids).toContain('hardened');
    expect(
      play(emptySave(), { ...day, levelId: 'many-hands', difficulty: 'hard' }).ids,
    ).not.toContain('hardened');
    const bell: DayRecord = { ...hardClear, levelId: 'the-bellwether', workersLost: 0 };
    expect(play(emptySave(), bell).ids).toContain('hard-as-stone');
    expect(play(emptySave(), { ...bell, workersLost: 1 }).ids).not.toContain('hard-as-stone');
  });

  it('awards the medal milestones from challenge medals', () => {
    const allPlatinum: SaveData = {
      ...emptySave(),
      medals: Object.fromEntries(LEVELS.map((level) => [`hunt|${level.id}`, 'Platinum'])),
    };
    const ids = unlockAchievements(allPlatinum, null, now).unlocked.map((a) => a.id);
    expect(ids).toEqual([
      'platinum-student',
      'honor-roll',
      'dandori-master',
      'gold-standard',
      'platinum-ten',
    ]);
  });

  it('awards the story milestones for lessons cleared in the story', () => {
    const story: SaveData = {
      ...emptySave(),
      story: { day: 40, cleared: LEVELS.map((level) => level.id) },
    };
    const ids = unlockAchievements(story, null, now).unlocked.map((a) => a.id);
    expect(ids).toEqual(['graduate', 'first-ember', 'restorer', 'well-travelled']);
  });

  it('awards the challenge and battle milestones', () => {
    const hunt: DayRecord = { ...day, mode: 'hunt', rank: 'Bronze', perfectBloom: true };
    expect(play(emptySave(), hunt).ids).toContain('perfect-bloom');
    const won: DayRecord = { ...day, mode: 'marble', rank: null, battle: 'won', rival: 'hard' };
    const first = play(emptySave(), won);
    expect(first.ids).toEqual(expect.arrayContaining(['first-blood', 'proctor-beaten']));
    expect(play(emptySave(), { ...won, rival: 'easy' }).ids).not.toContain('proctor-beaten');
    const crown: SaveData = {
      ...emptySave(),
      battles: {
        marble: { won: 1, lost: 0, drawn: 0 },
        bingo: { won: 1, lost: 0, drawn: 0 },
        duel: { won: 1, lost: 0, drawn: 0 },
      },
    };
    expect(unlockAchievements(crown, null, now).unlocked.map((a) => a.id)).toContain('every-race');
  });
});

describe('the new feats', () => {
  const clearDay: DayRecord = {
    ...day,
    treasureIds: ['shard-1', 'shard-2', 'shard-3', 'shard-4'],
    timeLeft: 40,
  };
  const earns = (record: DayRecord, id: string) => {
    const achievement = findAchievement(id);
    if (!achievement) throw new Error(id);
    return achievement.earned(recordDay(emptySave(), record), record);
  };

  it.each([
    ['full-basket', { glowcaps: 1, glowcapsTotal: 1, twins: 1, twinsTotal: 1 }],
    ['twin-flame', { twins: 1 }],
    ['steady-hands', { dewglass: 1 }],
    ['deep-water', { sunkHome: 1 }],
    ['trial-by-fire', { ventHome: 1 }],
    ['live-wire', { coilHome: 1 }],
    ['crystal-breaker', { crystalBroken: 1 }],
    ['glasscutter', { crystalBroken: 3 }],
    ['lifeguard', { rescued: 3 }],
    ['full-spectrum', { kindsAlive: 4 }],
    ['round-trip', { caves: 1 }],
    ['cleared-out', { cavesEmptied: 1 }],
    ['chain-gang', { bestChain: 5 }],
    ['chain-reaction', { bestChain: 10 }],
    ['pacifist', { beasts: 2 }],
  ] as const)('%s is earned by a day that does it, and not by one that does not', (id, feats) => {
    expect(earns({ ...clearDay, feats }, id)).toBe(true);
    expect(earns(clearDay, id)).toBe(false);
  });

  it('keeps Full Basket for lessons with something to take, all of it', () => {
    expect(earns({ ...clearDay, feats: { glowcaps: 0, glowcapsTotal: 0 } }, 'full-basket')).toBe(
      false,
    );
    expect(earns({ ...clearDay, feats: { glowcaps: 1, glowcapsTotal: 2 } }, 'full-basket')).toBe(
      false,
    );
  });

  it('marks the skill feats on the right days', () => {
    const boss: DayRecord = { ...clearDay, bossesDefeated: ['gravelmaw'], workersLost: 0 };
    expect(earns(boss, 'flawless')).toBe(true);
    expect(earns({ ...boss, workersLost: 1 }, 'flawless')).toBe(false);
    expect(earns({ ...clearDay, timeLeft: 3 }, 'photo-finish')).toBe(true);
    expect(earns({ ...clearDay, timeLeft: 95 }, 'blitz')).toBe(true);
    expect(earns({ ...clearDay, timeLeft: 80 }, 'blitz')).toBe(false);
    const hard: DayRecord = { ...clearDay, difficulty: 'hard', captainHits: 0, workersLost: 0 };
    expect(earns(hard, 'iron-warden')).toBe(true);
    expect(earns(hard, 'hard-and-whole')).toBe(true);
    expect(earns({ ...hard, difficulty: 'normal' }, 'iron-warden')).toBe(false);
    expect(earns({ ...clearDay, workersAlive: 80 }, 'grand-army')).toBe(true);
  });

  it('counts posts to the board, relics from below and the long totals', () => {
    const save: SaveData = {
      ...emptySave(),
      posted: ['a', 'b'],
      treasuresCollected: ['the-cistern:shard-1', 'many-hands:shard-1'],
      totals: { ...emptySave().totals, grown: 150, rescued: 25, glowcaps: 3, caveTrips: 10 },
    };
    const progress = (id: string) => findAchievement(id)?.progress?.(save);
    expect(progress('on-the-board')).toEqual([1, 1]);
    expect(progress('board-regular')).toEqual([2, 20]);
    expect(progress('below-stairs')).toEqual([1, 10]);
    expect(progress('green-thumb')).toEqual([100, 100]);
    expect(progress('firefighter')).toEqual([25, 25]);
    expect(progress('regular-diver')).toEqual([10, 10]);
  });

  it('has a good many to earn', () => {
    expect(ACHIEVEMENTS.filter((achievement) => !achievement.secret).length).toBeGreaterThanOrEqual(
      60,
    );
  });
});
