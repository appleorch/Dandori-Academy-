import { beforeAll, describe, expect, it } from 'vitest';
import { evaluateDay, rankValue } from '../dandori/scoring';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { penaltyPerLoss } from '../core/difficulty';
import { forDifficulty, LEVELS } from './level';
import { BOT_STYLES, playGreedy } from './testBot';

/** Time allowed for tests that play whole days, the longest lessons up to three times. */
const LONG_TEST_MS = 300_000;

/** Platinum is the bot's clear time rounded up to the next whole second. */
const PLATINUM_SLACK = 1;

beforeAll(async () => {
  await initPhysics();
});

/*
 * Whole days played by the test player on every lesson: slow, so they run with
 * `npm run test:levels` (and in CI), not with `npm test`.
 */

describe.each(LEVELS)('$name on Hard', (base) => {
  // Hard is not tuned to the bot: a simple greedy player, given up to three tries with a
  // slightly different style each time (as a person would retry), must bring home at least
  // 80% of the shards.
  it(
    'stays winnable for a simple greedy player',
    () => {
      const level = forDifficulty(base, 'hard');
      const tries: string[] = [];
      let won = false;
      for (const style of BOT_STYLES) {
        const sim = new Simulation(level);
        playGreedy(sim, undefined, style);
        const score = evaluateDay(
          {
            treasureValue: sim.stats.treasureValue,
            treasuresCollected: sim.stats.treasuresCollected.length,
            treasuresTotal: sim.stats.treasuresTotal,
            timeLeft: sim.timeLeft,
            workersAlive: sim.workers.size,
            workersLost: sim.stats.workersLost,
            glowcapPoints: sim.stats.bonus.glowcapPoints,
          },
          level,
          penaltyPerLoss('hard'),
        );
        const home = sim.stats.treasuresCollected.length;
        tries.push(`${home}/${sim.stats.treasuresTotal} (${sim.ended})`);
        won = home >= Math.ceil(sim.stats.treasuresTotal * 0.8) && score.total > 0;
        sim.dispose();
        if (won) break;
      }
      expect(won, tries.join(', ')).toBe(true);
      // Up to three whole days on the longest lessons: allow for them on a busy machine.
    },
    LONG_TEST_MS,
  );
});

describe.each(LEVELS)('$name', (level) => {
  it(
    'has a Platinum time set at a simple greedy player’s clear time',
    () => {
      const sim = new Simulation(level);
      playGreedy(sim);
      const score = evaluateDay(
        {
          treasureValue: sim.stats.treasureValue,
          treasuresCollected: sim.stats.treasuresCollected.length,
          treasuresTotal: sim.stats.treasuresTotal,
          timeLeft: sim.timeLeft,
          workersAlive: sim.workers.size,
          workersLost: sim.stats.workersLost,
          glowcapPoints: sim.stats.bonus.glowcapPoints,
        },
        level,
      );
      expect(sim.ended).toBe('allCollected');
      // Platinum times are set from this bot's clear time, rounded up to the next second: it
      // must keep making them, and they must not drift slack. Its losses can cost it Platinum,
      // but never so many that it falls below Gold; and Diamond is always beyond it.
      expect(sim.elapsed).toBeLessThanOrEqual(level.platinumTime);
      expect(sim.elapsed).toBeGreaterThan(level.platinumTime - PLATINUM_SLACK);
      expect(rankValue(score.rank)).toBeGreaterThanOrEqual(rankValue('Gold'));
      expect(score.rank).not.toBe('Diamond');
      sim.dispose();
    },
    LONG_TEST_MS,
  );
});
