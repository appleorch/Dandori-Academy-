import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { CHALLENGE_LEVELS, type LevelDefinition } from '../world/level';
import { playChallengeDay } from '../world/diveBot';
import { challengeFacts } from './facts';
import { challengePar, scoreChallenge, type ChallengeId } from './modes';

beforeAll(async () => {
  await initPhysics();
});

/*
 * Every challenge field played whole by the test player under its rules: slow, so it runs with
 * `npm run test:levels` (and in CI), not with `npm test`.
 */

/** Plays a field as its challenge's simulation would, to the end. */
function play(level: LevelDefinition, mode: ChallengeId) {
  const day = playChallengeDay(level, mode);
  const sim = day.surface;
  const facts = challengeFacts(sim);
  const result = { ended: sim.ended, elapsed: sim.elapsed, facts };
  day.dispose();
  return result;
}

describe.each(CHALLENGE_LEVELS)('$id', (level) => {
  const field = level.challenge;
  if (!field) throw new Error(`${level.id} is not a challenge field`);
  const mode = field.mode;
  it('is measured at the test player’s own result under its rules', () => {
    const day = play(level, mode);
    const score = scoreChallenge(mode, level, day.facts);
    expect(score.rank).not.toBe('Copper');
    if (mode === 'growing') {
      // The headcount at sunset is Platinum, and Diamond asks for clearly more.
      expect(day.ended).toBe('timeUp');
      expect(day.facts.alive).toBe(field.pace);
      expect(score.rank).toBe('Platinum');
    } else if (mode === 'expedition') {
      // No clock: every floor emptied, with the test player's headcount at the end.
      expect(day.ended).toBe('allCollected');
      expect(day.facts.shardsHome).toBe(day.facts.shardsTotal);
      expect(day.facts.alive).toBe(field.pace);
      // Where the test player grew every Sproutling the floors hold, Platinum is Diamond too.
      const par = challengePar(mode, level);
      expect(score.rank).toBe(par.diamondScore === par.parScore ? 'Diamond' : 'Platinum');
    } else if (mode === 'trial') {
      // No clock: every Sunshard home, losing exactly as many as Platinum allows.
      expect(day.ended).toBe('allCollected');
      expect(day.facts.lost).toBe(field.pace);
      expect(score.rank).toBe(field.pace === 0 ? 'Diamond' : 'Platinum');
    } else {
      // The finishing time, rounded up to the next second, is Platinum's pace.
      expect(day.ended).toBe('allCollected');
      expect(day.elapsed).toBeLessThanOrEqual(field.pace);
      expect(day.elapsed).toBeGreaterThan(field.pace - 1);
      expect(score.rank).not.toBe('Diamond');
    }
  }, 300_000);
});
