import { beforeAll, describe, expect, it } from 'vitest';
import { penaltyPerLoss, type Difficulty } from '../core/difficulty';
import { evaluateDay } from '../dandori/scoring';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { forDifficulty, LEVELS } from './level';
import { BOT_STYLES, playGreedy } from './testBot';

/**
 * Not a test: a measurement. `npm run balance` plays every lesson with the test bot on both
 * difficulties and rewrites BALANCE.md with a table of how it went. Platinum times are
 * the bot's Normal clear time rounded up to the next second.
 */
const enabled = Boolean(import.meta.env.VITE_BALANCE);

function play(base: (typeof LEVELS)[number], difficulty: Difficulty, style = BOT_STYLES[0]) {
  const level = forDifficulty(base, difficulty);
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
    },
    level,
    penaltyPerLoss(difficulty),
  );
  const row = {
    level,
    time: sim.elapsed,
    home: sim.stats.treasuresCollected.length,
    total: sim.stats.treasuresTotal,
    cleared: sim.ended === 'allCollected',
    shards: `${sim.stats.treasuresCollected.length}/${sim.stats.treasuresTotal}`,
    lost: sim.stats.workersLost,
    rank: score.rank,
  };
  sim.dispose();
  return row;
}

beforeAll(async () => {
  await initPhysics();
});

describe.skipIf(!enabled)('balance report', () => {
  it('measures every lesson', async () => {
    const lines = [
      '# Balance report',
      '',
      'Written by `npm run balance`. A simple greedy test player plays every lesson on Normal and on Hard.',
      'On Normal it must clear each lesson by the Platinum time (which is set from its own clear time) and earn at least Gold; on Hard it must bring home at least 80% of the Sunshards in one of up to three tries, each in a slightly different style.',
      '',
      '| # | Lesson | Day | Diamond by | Platinum by | Bot clear | Bot / Platinum | Bot lost | Bot rank | Hard day | Hard shards | Hard lost | Hard rank | Hard tries |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ];
    for (const base of LEVELS) {
      const normal = play(base, 'normal');
      // Hard gets up to three tries in different styles, as in level.test.ts.
      let hard = play(base, 'hard');
      let tries = 1;
      while (hard.home < Math.ceil(hard.total * 0.8) && tries < BOT_STYLES.length) {
        hard = play(base, 'hard', BOT_STYLES[tries]);
        tries++;
      }
      lines.push(
        `| ${base.stage} | ${base.name} | ${base.dayLength}s | ${base.diamondTime}s | ${base.platinumTime}s | ${normal.cleared ? `${normal.time.toFixed(1)}s` : `not cleared (${normal.shards})`} | ${(normal.time / base.platinumTime).toFixed(2)} | ${normal.lost} | ${normal.rank} | ${hard.level.dayLength}s | ${hard.shards} | ${hard.lost} | ${hard.rank} | ${tries} |`,
      );
    }
    await expect(`${lines.join('\n')}\n`).toMatchFileSnapshot('../../../BALANCE.md');
  }, 600000);
});
