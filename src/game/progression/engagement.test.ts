import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { CHAIN } from '../core/config';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { bestClearTime, emptySave, recordDay, type DayRecord } from '../save/saveManager';
import { LEVELS } from '../world/level';
import { OUTFITS, wornOutfit } from './outfits';

beforeAll(async () => {
  await initPhysics();
});

const day = (splits: number[] | undefined, score = 1000): DayRecord => ({
  levelId: 'many-hands',
  difficulty: 'normal',
  stage: 1,
  score,
  rank: 'Gold',
  workersAlive: 10,
  workersLost: 0,
  treasureIds: ['a'],
  treasuresTotal: 1,
  enemiesDefeated: 0,
  enemiesTotal: 0,
  captainHits: 0,
  timeLeft: 10,
  dayLength: 60,
  bossesDefeated: [],
  bloomsCollected: 0,
  splits,
});

describe('chains', () => {
  it('link deliveries that arrive close together', () => {
    const sim = new Simulation(LEVELS[0]);
    let chained = 0;
    for (let i = 0; i < 60 * 60 && !sim.ended; i++) {
      // Throw at whichever haul is nearest the cursor sweep: a plain, sloppy day.
      const shard = [...sim.carryables.entries()][0];
      const at = shard ? sim.transforms.require(shard[0]) : sim.captainTransform;
      sim.step({
        ...NO_INPUT,
        cursorX: at.x,
        cursorZ: at.z,
        throwHeld: true,
        moveX: (at.x - sim.captainTransform.x) / 20,
      });
      for (const event of sim.events)
        if (event.type === 'chain') chained = Math.max(chained, event.amount);
    }
    const times = sim.stats.deliveryTimes;
    let longest = times.length > 0 ? 1 : 0;
    let run = 1;
    for (let i = 1; i < times.length; i++) {
      run = times[i] - times[i - 1] <= CHAIN.window ? run + 1 : 1;
      longest = Math.max(longest, run);
    }
    expect(times.length).toBeGreaterThan(0);
    expect(sim.stats.bestChain).toBe(longest);
    expect(chained).toBe(longest >= 2 ? longest : 0);
    sim.dispose();
  });
});

describe('personal-best splits', () => {
  it('keep the fastest clear only', () => {
    let save = recordDay(emptySave(), day([5, 12, 30]));
    expect(bestClearTime(save, 'many-hands', 'normal')).toBe(30);
    save = recordDay(save, day([4, 10, 34]));
    expect(save.bestSplits['many-hands']).toEqual([5, 12, 30]);
    save = recordDay(save, day([6, 11, 25]));
    expect(bestClearTime(save, 'many-hands', 'normal')).toBe(25);
  });

  it('ignore days that did not clear, and keep Hard apart', () => {
    let save = recordDay(emptySave(), day(undefined));
    expect(bestClearTime(save, 'many-hands', 'normal')).toBeNull();
    save = recordDay(save, { ...day([9, 20]), difficulty: 'hard' });
    expect(bestClearTime(save, 'many-hands', 'hard')).toBe(20);
    expect(bestClearTime(save, 'many-hands', 'normal')).toBeNull();
  });
});

describe('outfits', () => {
  it('start with only the cadet uniform, and never wear a locked one', () => {
    const save = emptySave();
    expect(OUTFITS.filter((outfit) => outfit.unlocked(save)).map((o) => o.id)).toEqual(['cadet']);
    expect(wornOutfit(save, 'platinum').id).toBe('cadet');
  });

  it('open as medals and feats are earned', () => {
    const golds = Object.fromEntries(LEVELS.slice(0, 5).map((level) => [level.id, 'Gold']));
    const save = { ...emptySave(), bestRanks: golds, achievements: { 'lights-on': 'x' } };
    expect(wornOutfit(save, 'kindling').id).toBe('kindling');
    expect(wornOutfit(save, 'lamplighter').id).toBe('lamplighter');
    expect(wornOutfit(save, 'harvest').id).toBe('cadet');
  });
});
