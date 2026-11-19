import { beforeAll, describe, expect, it } from 'vitest';
import { NORMAL_PENALTY_PER_LOSS } from '../core/difficulty';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import {
  bonusParts,
  bonusTotal,
  LEVELS,
  shardCount,
  sproutlingsPossible,
  treasureTotal,
  type LevelDefinition,
} from '../world/level';
import { playGreedy } from '../world/testBot';
import { evaluateDay, rankScore } from './scoring';
import { adviseDay, nextRank, tallyDay, type DayFacts } from './tally';

const byId = (id: string): LevelDefinition => {
  const level = LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(id);
  return level;
};

/** A lesson with all three kinds of bonus: Glowcaps, twins and Dewglass. */
const MIXED = byId('first-light');

/** Every Sunshard and every bonus home, nobody lost, `timeLeft` on the clock. */
function perfect(level: LevelDefinition, timeLeft: number): DayFacts {
  const parts = bonusParts(level);
  return {
    shardsHome: shardCount(level),
    treasureValue: treasureTotal(level) + bonusTotal(level),
    bonus: {
      glowcaps: parts.glowcaps,
      glowcapPoints: parts.glowcapPoints,
      twins: parts.twins,
      twinPoints: parts.twinPoints,
      dewglass: parts.dewglass,
      dewglassPoints: parts.dewglassPoints,
    },
    alive: level.startingWorkers,
    lost: 0,
    grown: 0,
    timeLeft,
  };
}

function score(level: LevelDefinition, facts: DayFacts) {
  return evaluateDay(
    {
      treasureValue: facts.treasureValue,
      treasuresCollected: facts.shardsHome,
      treasuresTotal: shardCount(level),
      timeLeft: facts.timeLeft,
      workersAlive: facts.alive,
      workersLost: facts.lost,
    },
    level,
  );
}

beforeAll(async () => {
  await initPhysics();
});

describe('the day tally', () => {
  it('keeps required and optional treasure apart', () => {
    expect(bonusParts(MIXED).glowcaps).toBeGreaterThan(0);
    expect(bonusParts(MIXED).twins).toBeGreaterThan(0);
    const facts = perfect(MIXED, 30);
    const tally = tallyDay(MIXED, facts);
    expect(tally.required).toMatchObject({ got: shardCount(MIXED), of: shardCount(MIXED) });
    expect(tally.required.points).toBe(treasureTotal(MIXED));
    expect(tally.optional.points).toBe(bonusTotal(MIXED));
    expect(tally.optional.possible).toBe(bonusTotal(MIXED));
    expect(tally.required.points + tally.optional.points).toBe(score(MIXED, facts).treasure);
  });

  it('counts how many Sproutlings a lesson can end with', () => {
    const lesson = byId('many-hands');
    // Ten to start and a mound hiding a seed pod, which grows two.
    expect(sproutlingsPossible(lesson)).toBe(12);
    for (const level of LEVELS) {
      expect(sproutlingsPossible(level)).toBeGreaterThanOrEqual(level.startingWorkers);
    }
  });

  it('adds up for a real day played by the test player', () => {
    const sim = new Simulation(MIXED);
    playGreedy(sim);
    const tally = tallyDay(MIXED, {
      shardsHome: sim.stats.treasuresCollected.length,
      treasureValue: sim.stats.treasureValue,
      bonus: sim.stats.bonus,
      alive: sim.workers.size,
      lost: sim.stats.workersLost,
      grown: sim.stats.grown,
      timeLeft: sim.timeLeft,
    });
    expect(tally.required.points + tally.optional.points).toBe(sim.stats.treasureValue);
    expect(tally.required.points).toBe(treasureTotal(MIXED));
    for (const part of [tally.optional.glowcaps, tally.optional.twins, tally.optional.dewglass]) {
      expect(part.got).toBeLessThanOrEqual(part.of);
      expect(part.points).toBeLessThanOrEqual(part.possible);
    }
    expect(tally.sproutlings.alive).toBeLessThanOrEqual(
      tally.sproutlings.start + tally.sproutlings.grown,
    );
    sim.dispose();
  });
});

describe('advice on the next rank', () => {
  it('says plainly when only time is missing', () => {
    // Every bonus taken, nobody lost, but a little slower than Diamond.
    const facts = perfect(MIXED, MIXED.dayLength - MIXED.platinumTime);
    const day = score(MIXED, facts);
    expect(day.rank).toBe('Platinum');
    const advice = adviseDay(MIXED, day, tallyDay(MIXED, facts), NORMAL_PENALTY_PER_LOSS);
    expect(advice.target).toBe('Diamond');
    expect(advice.short).toBe(rankScore('Diamond', MIXED) - day.total);
    expect(advice.levers.map((lever) => lever.kind)).toEqual(['time']);
    expect(advice.summary).toMatch(/Only time/);
  });

  it('lists the bonuses left behind and the Sproutlings lost, biggest first', () => {
    const facts = perfect(MIXED, MIXED.dayLength - MIXED.platinumTime);
    facts.treasureValue -= facts.bonus.glowcapPoints;
    facts.bonus = { ...facts.bonus, glowcaps: 0, glowcapPoints: 0 };
    facts.lost = 2;
    facts.alive -= 2;
    const day = score(MIXED, facts);
    const advice = adviseDay(MIXED, day, tallyDay(MIXED, facts), NORMAL_PENALTY_PER_LOSS);
    const kinds = advice.levers.map((lever) => lever.kind);
    expect(kinds).toContain('glowcaps');
    expect(kinds).toContain('losses');
    expect(kinds[kinds.length - 1]).toBe('time');
    const glowcaps = advice.levers.find((lever) => lever.kind === 'glowcaps');
    expect(glowcaps?.points).toBe(bonusParts(MIXED).glowcapPoints);
    const losses = advice.levers.find((lever) => lever.kind === 'losses');
    expect(losses?.points).toBe(2 * 15);
    for (let i = 1; i < advice.levers.length - 1; i++) {
      expect(advice.levers[i].points).toBeLessThanOrEqual(advice.levers[i - 1].points);
    }
  });

  it('names the blocker when a Sunshard stayed out', () => {
    const facts = perfect(MIXED, 0);
    facts.shardsHome -= 1;
    facts.treasureValue -= 100;
    // Pretend the score alone would be enough: it still cannot be Platinum.
    facts.treasureValue += 100000;
    const day = score(MIXED, facts);
    expect(day.rank).toBe('Gold');
    const advice = adviseDay(MIXED, day, tallyDay(MIXED, facts), NORMAL_PENALTY_PER_LOSS);
    expect(advice.target).toBe('Platinum');
    expect(advice.blocker).toMatch(/every Sunshard/);
    expect(advice.levers[0].kind).toBe('required');
    expect(advice.levers.some((lever) => lever.kind === 'time')).toBe(false);
  });

  it('has nowhere higher to point after Diamond', () => {
    expect(nextRank('Diamond')).toBeNull();
    expect(nextRank('Copper')).toBe('Bronze');
    const facts = perfect(MIXED, MIXED.dayLength);
    const day = score(MIXED, facts);
    expect(day.rank).toBe('Diamond');
    expect(adviseDay(MIXED, day, tallyDay(MIXED, facts), 10).target).toBeNull();
  });
});
