import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { HARD, penaltyPerLoss } from '../core/difficulty';
import { evaluateDay } from '../dandori/scoring';
import { rankTargets } from '../dandori/targets';
import { ENEMY_SPECS } from '../enemies/enemyKinds';
import { forDifficulty, LEVELS } from '../world/level';
import { initPhysics } from './physics';
import { Simulation } from './Simulation';

function lesson(id: string) {
  const found = LEVELS.find((level) => level.id === id);
  if (!found) throw new Error(`No lesson ${id}`);
  return found;
}

const DRIP_LINE = lesson('drip-line');

beforeAll(async () => {
  await initPhysics();
});

describe('Hard mode', () => {
  it('shortens the day but keeps the Platinum finish time, with its own par', () => {
    for (const base of LEVELS) {
      const hard = forDifficulty(base, 'hard');
      expect(hard.difficulty).toBe('hard');
      expect(hard.dayLength).toBe(Math.round(base.dayLength * HARD.dayLength));
      expect(hard.platinumTime).toBe(base.platinumTime);
      expect(hard.parScore).toBeLessThan(base.parScore);
      expect(rankTargets(hard)[2].timeLeft).toBe(hard.dayLength - hard.platinumTime);
      expect(forDifficulty(hard, 'normal')).toEqual(base);
    }
  });

  it('toughens enemies, lowers the Warden to two hearts, and leaves gates alone', () => {
    const level = lesson('bramble-gate');
    const normal = new Simulation(level);
    const hard = new Simulation(forDifficulty(level, 'hard'));
    expect(hard.captainState.hp).toBe(HARD.captainHp);
    for (const sim of [normal, hard]) {
      for (const [, enemy] of sim.enemies.entries()) {
        const expected =
          enemy.kind === 'gate' || sim === normal
            ? enemy.maxHp
            : ENEMY_SPECS[enemy.kind].hp * HARD.enemyHp;
        expect(enemy.maxHp).toBe(expected);
      }
    }
    expect([...normal.enemies.entries()].map(([, e]) => e.kind === 'gate' && e.maxHp)).toEqual(
      [...hard.enemies.entries()].map(([, e]) => e.kind === 'gate' && e.maxHp),
    );
    normal.dispose();
    hard.dispose();
  });

  it('makes drips deadly', () => {
    const lost = (difficulty: 'normal' | 'hard'): number => {
      const level = forDifficulty(
        {
          ...DRIP_LINE,
          captain: { x: -6, z: 8 },
          drips: [{ x: -6, z: 8, period: 100, offset: 0.5 }],
        },
        difficulty,
      );
      const sim = new Simulation({ ...level, captain: { x: -6, z: 8 } });
      for (let i = 0; i < 60 * 3; i++) sim.step({ ...NO_INPUT, cursorX: -6, cursorZ: 8 });
      const count = sim.stats.workersLost;
      sim.dispose();
      return count;
    };
    expect(lost('normal')).toBe(0);
    expect(lost('hard')).toBeGreaterThan(0);
    expect(lost('hard')).toBeLessThanOrEqual(HARD.dripKills);
  });

  it('charges double for every lost Emberling', () => {
    const stats = {
      treasureValue: 1000,
      treasuresCollected: 5,
      treasuresTotal: 5,
      timeLeft: 10,
      workersAlive: 8,
      workersLost: 4,
    };
    const normal = evaluateDay(stats, 2000, penaltyPerLoss('normal'));
    const hard = evaluateDay(stats, 2000, penaltyPerLoss('hard'));
    expect(normal.lossPenalty).toBe(40);
    expect(hard.lossPenalty).toBe(80);
  });
});

describe('timed events', () => {
  it('drop each drip and sprout each Glowcap exactly once', () => {
    const level = {
      ...DRIP_LINE,
      enemies: [],
      drips: [{ x: 20, z: -10, period: 2, offset: 0.5 }],
      blooms: [{ x: 20, z: 10, weight: 1, at: 1, lifetime: 100 }],
    };
    const sim = new Simulation(level);
    let splashes = 0;
    let sprouts = 0;
    for (let i = 0; i < 60 * 5; i++) {
      sim.step({ ...NO_INPUT });
      splashes += sim.events.filter((event) => event.type === 'splash').length;
      sprouts += sim.events.filter((event) => event.type === 'bloom').length;
    }
    // Drips due at 0.5, 2.5 and 4.5 s land 1.5 s later: two by the 5 s mark.
    expect(splashes).toBe(2);
    expect(sprouts).toBe(1);
    sim.dispose();
  });
});
