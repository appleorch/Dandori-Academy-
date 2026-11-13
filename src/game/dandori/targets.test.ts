import { describe, expect, it } from 'vitest';
import { LEVELS } from '../world/level';
import { evaluateDay } from './scoring';
import { rankTargets } from './targets';

describe.each(LEVELS)('$name rank targets', (level) => {
  const targets = rankTargets(level);

  it('asks for Platinum at exactly the lesson’s Platinum time', () => {
    expect(level.platinumTime).toBeGreaterThan(0);
    expect(level.platinumTime).toBeLessThan(level.dayLength);
    expect(targets[2]).toEqual({
      rank: 'Platinum',
      score: level.parScore,
      timeLeft: level.dayLength - level.platinumTime,
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
            treasureValue: level.treasures.reduce((sum, t) => sum + t.weight * 100, 0),
            treasuresCollected: level.treasures.length,
            treasuresTotal: level.treasures.length,
            timeLeft,
            workersAlive: level.startingWorkers,
            workersLost: 0,
          },
          level.parScore,
        );
      expect(day(target.timeLeft).total).toBeGreaterThanOrEqual(target.score);
      expect(day(target.timeLeft - 1).total).toBeLessThan(target.score);
    }
  });
});
