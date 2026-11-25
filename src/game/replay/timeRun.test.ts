import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { greedyPlayer } from '../world/testBot';
import { LEVELS } from '../world/level';
import { checkRun, compareRuns, makeTimeRun, type RunEntry } from '../leaderboard/runCode';
import { boardMode, standings, type BoardEntry } from '../leaderboard/board';
import { timeMedal } from '../modes/timeAttack';
import { fieldFor, newDay, Recorder } from './replay';
import { verifyRun } from './verify';

beforeAll(async () => {
  await initPhysics();
});

describe('the Time Attack board', () => {
  it('posts a clear with the medal its time earned, and verifies it by replay', async () => {
    const level = LEVELS[0];
    const field = fieldFor(level.id, 'normal', 'lessons');
    if (!field) throw new Error('no field');
    const day = newDay(field, 'lessons');
    const sim = day.surface;
    const player = greedyPlayer(sim);
    const recorder = new Recorder();
    for (let tick = 0; !sim.ended && tick < 60 * level.dayLength; tick++) {
      sim.step(recorder.input(player.input(tick)));
    }
    const cleared = sim.stats.treasuresCollected.length === sim.stats.treasuresTotal;
    expect(cleared).toBe(true);
    recorder.event('end');
    const log = await recorder.log({ level: level.id, difficulty: 'normal', mode: 'lessons' }, 't');
    const run = makeTimeRun(
      {
        levelId: level.id,
        difficulty: 'normal',
        elapsed: sim.elapsed,
        timeLeft: sim.timeLeft,
        shardsTotal: sim.stats.treasuresTotal,
        alive: sim.workers.size,
        lost: sim.stats.workersLost,
      },
      't',
      new Date('2026-11-25T12:00:00Z'),
    );
    if (!run) throw new Error('no run');
    expect(run.mode).toBe('lessons');
    expect(run.rank).toBe(timeMedal(field, run.time));
    expect(checkRun(run)).toBeNull();
    expect(boardMode(run)).toBe('lessons');
    expect(await verifyRun(run, log)).toBe('same');
    // A claim quicker than the replay, or with a medal it did not earn, is caught.
    expect(await verifyRun({ ...run, time: run.time - 5, timeLeft: run.timeLeft + 5 }, log)).toBe(
      'different',
    );
    expect(checkRun({ ...run, rank: run.rank === 'Diamond' ? 'Gold' : 'Diamond' })).not.toBeNull();
    expect(checkRun({ ...run, shards: run.shardsTotal - 1 })).not.toBeNull();
    expect(checkRun({ ...run, score: 100 })).not.toBeNull();
    day.dispose();
  });

  it('ranks clears by time, quickest first, apart from the challenge boards', () => {
    const base: RunEntry = {
      v: 1,
      game: 't',
      level: 'x',
      difficulty: 'normal',
      print: 'p',
      mode: 'lessons',
      score: 0,
      rank: 'Gold',
      treasure: 0,
      timeBonus: 0,
      workerBonus: 0,
      lossPenalty: 0,
      shards: 3,
      shardsTotal: 3,
      time: 100,
      timeLeft: 200,
      alive: 10,
      lost: 0,
      at: '2026-11-25T12:00:00Z',
    };
    const slow = { ...base, time: 120 };
    expect([slow, base].sort(compareRuns)[0]).toBe(base);
    const entries = [
      { ...slow, player: 'a1a1a1a1a1a1a1a1', name: 'Ada', code: 'a' },
      { ...base, player: 'b2b2b2b2b2b2b2b2', name: 'Bo', code: 'b' },
      { ...base, mode: 'hunt', player: 'c3c3c3c3c3c3c3c3', name: 'Cy', code: 'c' },
    ] as BoardEntry[];
    expect(standings(entries, 'x', 'normal', 'lessons').map((e) => e.code)).toEqual(['b', 'a']);
  });
});
