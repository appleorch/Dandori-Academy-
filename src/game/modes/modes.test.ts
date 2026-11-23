import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import {
  LEVELS,
  rankedBonusTotal,
  shardCount,
  sproutlingsPossible,
  treasureTotal,
  type LevelDefinition,
} from '../world/level';
import { playGreedy } from '../world/testBot';
import { challengeFacts } from './facts';
import {
  carcassWeight,
  CHALLENGE_IDS,
  challengeOpen,
  challengePar,
  challengeTimes,
  MODES,
  scoreChallenge,
  shardWeight,
  type ChallengeFacts,
  type ChallengeId,
} from './modes';
import { EVERYTHING_TIMES, TRIAL_TIMES } from './paceTimes';

beforeAll(async () => {
  await initPhysics();
});

const byId = (id: string): LevelDefinition => {
  const level = LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(id);
  return level;
};

/** A perfect day for a challenge: everything home, nobody lost, the most Sproutlings grown. */
function perfect(level: LevelDefinition, timeLeft: number): ChallengeFacts {
  return {
    treasureValue: treasureTotal(level) + rankedBonusTotal(level),
    glowcapValue: 0,
    weight: shardWeight(level) + carcassWeight(level),
    glowcapWeight: 0,
    carcassWeight: carcassWeight(level),
    shardsHome: shardCount(level),
    shardsTotal: shardCount(level),
    beastsLeft: 0,
    everything: true,
    alive: sproutlingsPossible(level),
    lost: 0,
    timeLeft,
    survived: true,
  };
}

describe('every challenge', () => {
  it.each(
    LEVELS.flatMap((level) =>
      CHALLENGE_IDS.filter((mode) => challengeOpen(mode, level)).map(
        (mode) => [MODES[mode].name, level.name, mode, level] as const,
      ),
    ),
  )('%s in %s: Diamond is reachable at its Diamond time', (_mode, _lesson, mode, level) => {
    const { diamond } = challengeTimes(mode, level);
    expect(scoreChallenge(mode, level, perfect(level, level.dayLength - diamond)).rank).toBe(
      'Diamond',
    );
  });

  it('has its medal targets in order', () => {
    for (const level of LEVELS) {
      for (const mode of CHALLENGE_IDS) {
        const par = challengePar(mode, level);
        expect(par.diamondScore, `${mode} ${level.id}`).toBeGreaterThanOrEqual(par.parScore);
        expect(par.parScore).toBeGreaterThan(0);
      }
    }
  });
});

describe('the rules', () => {
  const LESSON = byId('first-light');

  it('Growing Season counts heads and nothing else', () => {
    const day = { ...perfect(LESSON, 100), alive: 17 };
    const score = scoreChallenge('growing', LESSON, day);
    expect(score.total).toBe(17);
    expect(scoreChallenge('growing', LESSON, { ...day, treasureValue: 0, timeLeft: 0 }).total).toBe(
      17,
    );
  });

  it('Treasure Hunt adds treasure, 10 a survivor and a point every two seconds, and blooms for no losses', () => {
    const day = { ...perfect(LESSON, 41), alive: 12, lost: 0 };
    const score = scoreChallenge('hunt', LESSON, day);
    expect(score.total).toBe(day.treasureValue + 120 + 20);
    expect(score.perfectBloom).toBe(true);
    expect(scoreChallenge('hunt', LESSON, { ...day, lost: 1 }).perfectBloom).toBe(false);
    // Ending the day early with Sunshards still out is no Perfect Bloom.
    expect(scoreChallenge('hunt', LESSON, { ...day, shardsHome: 0 }).perfectBloom).toBe(false);
    // The clock stops counting if the Warden falls.
    expect(scoreChallenge('hunt', LESSON, { ...day, survived: false }).total).toBe(
      day.treasureValue + 120,
    );
  });

  it('a Mission pays for time only on a 100% clear', () => {
    const sweep = perfect(LESSON, 30);
    const full = scoreChallenge('mission', LESSON, sweep);
    expect(full.total).toBe(sweep.treasureValue + carcassWeight(LESSON) * 50 + 300);
    const beastLeft = scoreChallenge('mission', LESSON, { ...sweep, beastsLeft: 1 });
    expect(beastLeft.total).toBe(full.total - 300);
    expect(beastLeft.gateMet).toBe(false);
    expect(['Platinum', 'Diamond']).not.toContain(beastLeft.rank);
  });

  it('the Dandori Challenge scores weight, and seconds once everything is collected', () => {
    const all = perfect(LESSON, 30);
    expect(scoreChallenge('dandori', LESSON, all).total).toBe(all.weight * 10 + 30);
    const short = { ...all, everything: false, weight: all.weight - 3 };
    expect(scoreChallenge('dandori', LESSON, short).total).toBe(short.weight * 10);
  });

  it('Glowcaps add to a score but never to what a medal needs', () => {
    for (const mode of ['hunt', 'mission'] as const) {
      expect(challengePar(mode, LESSON).parScore).toBe(
        challengePar(mode, { ...LESSON, blooms: [] }).parScore,
      );
    }
    // A Platinum-paced day stays Platinum however many Glowcaps came home with it.
    for (const mode of ['hunt', 'mission', 'dandori'] as const) {
      const { platinum } = challengeTimes(mode, LESSON);
      const day = perfect(LESSON, LESSON.dayLength - platinum);
      const glowing = {
        ...day,
        treasureValue: day.treasureValue + 500,
        glowcapValue: 500,
        weight: day.weight + 50,
        glowcapWeight: 50,
      };
      const plain = scoreChallenge(mode, LESSON, day);
      const score = scoreChallenge(mode, LESSON, glowing);
      expect(plain.rank, mode).toBe('Platinum');
      expect(score.rank, mode).toBe('Platinum');
      expect(score.total, mode).toBeGreaterThan(plain.total);
      expect(score.ranked, mode).toBe(plain.ranked);
    }
  });
});

/** Plays a lesson as a challenge's simulation would, to the end. */
function play(level: LevelDefinition, mode: ChallengeId) {
  const sim = new Simulation(level, {
    endsWhen: MODES[mode].endsWhen,
    growth: MODES[mode].growth,
  });
  playGreedy(sim);
  const facts = challengeFacts(sim);
  const result = { ended: sim.ended, elapsed: sim.elapsed, facts };
  sim.dispose();
  return result;
}

describe.each(LEVELS)('$name', (level) => {
  it('takes the test player exactly its measured time to collect everything', () => {
    const day = play(level, 'mission');
    expect(day.ended).toBe('allCollected');
    expect(day.facts.everything).toBe(true);
    const time = EVERYTHING_TIMES[level.id];
    expect(day.elapsed).toBeLessThanOrEqual(time);
    expect(day.elapsed).toBeGreaterThan(time - 1);
    // Its medals in the challenges that end that way are never Diamond.
    for (const mode of ['mission', 'dandori'] as const) {
      expect(scoreChallenge(mode, level, day.facts).rank).not.toBe('Diamond');
    }
  }, 300_000);

  it('offers a Lean Squad Trial only if the starting squad can finish it', () => {
    const day = play(level, 'trial');
    const time = TRIAL_TIMES[level.id];
    if (time === undefined) {
      expect(day.facts.everything).toBe(false);
      expect(challengeOpen('trial', level)).toBe(false);
    } else {
      expect(day.facts.everything).toBe(true);
      expect(day.elapsed).toBeLessThanOrEqual(time);
      expect(day.elapsed).toBeGreaterThan(time - 1);
      expect(scoreChallenge('trial', level, day.facts).rank).not.toBe('Diamond');
    }
  }, 300_000);
});
