import { beforeAll, describe, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { CHALLENGE_LEVELS, sproutlingsPossible } from '../world/level';
import { playGreedy } from '../world/testBot';
import { challengeFacts } from './facts';
import { MODES } from './modes';

/**
 * Not a test: a measurement. `npm run paces` plays every challenge field with the test player
 * under its challenge's rules and prints what it measured (see `ChallengeField.pace`).
 */
const enabled = Boolean(import.meta.env.VITE_PACES);

beforeAll(async () => {
  await initPhysics();
});

describe.skipIf(!enabled)('challenge paces', () => {
  it('measures every field', () => {
    const only = (import.meta.env.VITE_PACES_ONLY as string | undefined) ?? '';
    const rows: Record<string, unknown>[] = [];
    for (const level of CHALLENGE_LEVELS) {
      if (only && !level.id.startsWith(only)) continue;
      const mode = level.challenge?.mode ?? 'lessons';
      const sim = new Simulation(level, {
        endsWhen: MODES[mode].endsWhen,
        growth: MODES[mode].growth,
      });
      playGreedy(sim);
      const facts = challengeFacts(sim);
      rows.push({
        id: level.id,
        ended: sim.ended,
        elapsed: Math.round(sim.elapsed * 100) / 100,
        day: level.dayLength,
        alive: facts.alive,
        lost: facts.lost,
        shards: `${facts.shardsHome}/${facts.shardsTotal}`,
        everything: facts.everything,
        beastsLeft: facts.beastsLeft,
        possible: sproutlingsPossible(level),
        lastDelivery: Math.round((sim.stats.deliveries.at(-1)?.time ?? 0) * 10) / 10,
      });
      sim.dispose();
    }
    for (const row of rows) console.log(`PACE ${JSON.stringify(row)}`);
  }, 3_600_000);
});
