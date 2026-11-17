import { beforeAll, describe, expect, it } from 'vitest';
import { penaltyPerLoss, type Difficulty } from '../core/difficulty';
import { evaluateDay } from '../dandori/scoring';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { forDifficulty, LEVELS } from './level';
import { playGreedy } from './testBot';

/**
 * Not a test: a measurement. `npm run balance` plays every lesson with the test bot on both
 * difficulties and rewrites BALANCE.md with a table of how it went. Platinum times are
 * meant to sit a little slower than the bot's Normal clear time.
 */
const enabled = Boolean(import.meta.env.VITE_BALANCE);

function play(base: (typeof LEVELS)[number], difficulty: Difficulty) {
  const level = forDifficulty(base, difficulty);
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
    },
    level.parScore,
    penaltyPerLoss(difficulty),
  );
  const row = {
    level,
    time: sim.elapsed,
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
      'On Normal it must clear each lesson at Platinum pace; on Hard it must bring home at least 80% of the Sunshards.',
      '',
      '| # | Lesson | Day | Platinum by | Bot clear | Bot / Platinum | Bot lost | Hard day | Hard shards | Hard lost | Hard rank |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
    ];
    for (const base of LEVELS) {
      const normal = play(base, 'normal');
      const hard = play(base, 'hard');
      lines.push(
        `| ${base.stage} | ${base.name} | ${base.dayLength}s | ${base.platinumTime}s | ${normal.cleared ? `${Math.round(normal.time)}s` : `not cleared (${normal.shards})`} | ${(normal.time / base.platinumTime).toFixed(2)} | ${normal.lost} | ${hard.level.dayLength}s | ${hard.shards} | ${hard.lost} | ${hard.rank} |`,
      );
    }
    await expect(`${lines.join('\n')}\n`).toMatchFileSnapshot('../../../BALANCE.md');
  }, 600000);
});
