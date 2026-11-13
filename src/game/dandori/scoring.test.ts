import { describe, expect, it } from 'vitest';
import { evaluateDay, rankValue, type DayStats } from './scoring';

const base: DayStats = {
  treasureValue: 2300,
  treasuresCollected: 6,
  treasuresTotal: 6,
  timeLeft: 59.2,
  workersAlive: 20,
  workersLost: 0,
};

describe('evaluateDay', () => {
  it('adds treasure, time and worker bonuses', () => {
    const score = evaluateDay(base, 3000);
    expect(score).toMatchObject({ treasure: 2300, timeBonus: 600, workerBonus: 100, total: 3000 });
    expect(score.rank).toBe('Platinum');
  });

  it('gives no time bonus unless every treasure is collected', () => {
    const score = evaluateDay({ ...base, treasuresCollected: 5, treasureValue: 1500 }, 3000);
    expect(score.timeBonus).toBe(0);
    expect(score.total).toBe(1600);
    expect(score.rank).toBe('Bronze');
  });

  it('penalises losses and never goes negative', () => {
    expect(evaluateDay({ ...base, workersLost: 5 }, 3000).total).toBe(2950);
    const wipe = evaluateDay(
      { ...base, treasureValue: 0, treasuresCollected: 0, workersAlive: 0, workersLost: 10 },
      3000,
    );
    expect(wipe.total).toBe(0);
  });

  it('maps score ratios to ranks', () => {
    const at = (total: number) =>
      evaluateDay({ ...base, treasureValue: total, timeLeft: 0, workersAlive: 0 }, 1000).rank;
    expect(at(1000)).toBe('Platinum');
    expect(at(800)).toBe('Gold');
    expect(at(550)).toBe('Silver');
    expect(at(549)).toBe('Bronze');
    expect(rankValue('Gold')).toBeGreaterThan(rankValue('Silver'));
  });
});
