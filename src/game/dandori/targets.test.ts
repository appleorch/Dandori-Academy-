import { describe, expect, it } from 'vitest';
import { bonusTotal, LEVELS, shardCount, treasureTotal } from '../world/level';
import { evaluateDay } from './scoring';
import { rankTargets } from './targets';

describe.each(LEVELS)('$name rank targets', (level) => {
  const targets = rankTargets(level);

  it('asks for Platinum and Diamond at exactly the lesson’s Platinum and Diamond times', () => {
    expect(level.platinumTime).toBeGreaterThan(0);
    expect(level.platinumTime).toBeLessThan(level.dayLength);
    expect(level.diamondTime).toBeGreaterThan(0);
    expect(level.diamondTime).toBeLessThan(level.platinumTime);
    expect(targets.map((target) => target.rank)).toEqual(['Silver', 'Gold', 'Platinum', 'Diamond']);
    expect(targets[2]).toEqual({
      rank: 'Platinum',
      score: level.parScore,
      timeLeft: level.dayLength - level.platinumTime,
    });
    expect(targets[3]).toEqual({
      rank: 'Diamond',
      score: level.diamondScore,
      timeLeft: level.dayLength - level.diamondTime,
    });
  });

  it('gets easier with every rank and stays inside the day', () => {
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i].score).toBeGreaterThan(targets[i - 1].score);
    }
    for (const target of targets) expect(target.timeLeft ?? 0).toBeLessThan(level.dayLength);
  });

  it('earns each rank when its target is met exactly, and not a second sooner', () => {
    for (const target of targets) {
      if (target.timeLeft === null) continue;
      const day = (timeLeft: number) =>
        evaluateDay(
          {
            treasureValue: treasureTotal(level) + bonusTotal(level),
            treasuresCollected: shardCount(level),
            treasuresTotal: shardCount(level),
            timeLeft,
            workersAlive: level.startingWorkers,
            workersLost: 0,
          },
          level,
        );
      expect(day(target.timeLeft).total).toBeGreaterThanOrEqual(target.score);
      expect(day(target.timeLeft).rank).toBe(target.rank);
      expect(day(target.timeLeft - 1).total).toBeLessThan(target.score);
    }
  });
});
