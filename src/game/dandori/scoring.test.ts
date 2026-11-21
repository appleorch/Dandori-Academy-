import { describe, expect, it } from 'vitest';
import { evaluateDay, RANKS, rankScore, rankValue, type DayStats, type Par } from './scoring';

const base: DayStats = {
  treasureValue: 2300,
  treasuresCollected: 6,
  treasuresTotal: 6,
  timeLeft: 59.2,
  workersAlive: 20,
  workersLost: 0,
  glowcapPoints: 0,
};
const PAR: Par = { parScore: 3000, diamondScore: 3200 };

describe('evaluateDay', () => {
  it('adds treasure, time and worker bonuses', () => {
    const score = evaluateDay(base, PAR);
    expect(score).toMatchObject({ treasure: 2300, timeBonus: 600, workerBonus: 100, total: 3000 });
    expect(score.rank).toBe('Platinum');
  });

  it('gives no time bonus unless every treasure is collected', () => {
    const score = evaluateDay({ ...base, treasuresCollected: 5, treasureValue: 1500 }, PAR);
    expect(score.timeBonus).toBe(0);
    expect(score.total).toBe(1600);
    expect(score.rank).toBe('Bronze');
  });

  it('penalises losses and never goes negative', () => {
    expect(evaluateDay({ ...base, workersLost: 5 }, PAR).total).toBe(2950);
    const wipe = evaluateDay(
      { ...base, treasureValue: 0, treasuresCollected: 0, workersAlive: 0, workersLost: 10 },
      PAR,
    );
    expect(wipe.total).toBe(0);
    expect(wipe.rank).toBe('Copper');
  });

  it('maps score ratios to ranks', () => {
    const par: Par = { parScore: 1000, diamondScore: 1200 };
    const at = (total: number) =>
      evaluateDay({ ...base, treasureValue: total, timeLeft: 0, workersAlive: 0 }, par).rank;
    expect(at(1200)).toBe('Diamond');
    expect(at(1199)).toBe('Platinum');
    expect(at(1000)).toBe('Platinum');
    expect(at(999)).toBe('Gold');
    expect(at(750)).toBe('Gold');
    expect(at(749)).toBe('Silver');
    expect(at(550)).toBe('Silver');
    expect(at(549)).toBe('Bronze');
    expect(at(350)).toBe('Bronze');
    expect(at(349)).toBe('Copper');
  });

  it('keeps Platinum and Diamond for days with every Sunshard home', () => {
    // Bonus score (Glowcaps) can push a day past par without clearing it.
    const short = { ...base, treasuresCollected: 5, treasureValue: 5000 };
    const score = evaluateDay(short, PAR);
    expect(score.total).toBeGreaterThan(PAR.diamondScore);
    expect(score.rank).toBe('Gold');
  });

  it('orders every rank, each asking at least as much as the one below', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(rankValue(RANKS[i])).toBeGreaterThan(rankValue(RANKS[i - 1]));
      expect(rankScore(RANKS[i], PAR)).toBeGreaterThan(rankScore(RANKS[i - 1], PAR));
    }
    expect(rankScore('Copper', PAR)).toBe(0);
  });
});
