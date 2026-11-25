import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { initPhysics } from '../simulation/physics';
import { greedyPlayer } from '../world/testBot';
import { CHALLENGE_LEVELS } from '../world/level';
import { challengeFacts } from '../modes/facts';
import { scoreChallenge } from '../modes/modes';
import { makeChallengeRun } from '../leaderboard/runCode';
import { boardGroup, standings, type BoardEntry } from '../leaderboard/board';
import { simHash } from '../net/lockstep';
import { fieldFor, newDay, Recorder, replayToEnd } from './replay';
import { verifyRun } from './verify';

beforeAll(async () => {
  await initPhysics();
});

describe('co-op replays and boards', () => {
  it('records both players, replays the day exactly, and verifies it for the co-op board', async () => {
    const level = CHALLENGE_LEVELS.find((l) => l.challenge?.mode === 'hunt') ?? CHALLENGE_LEVELS[0];
    const mode = level.challenge?.mode ?? 'hunt';
    const field = fieldFor(level.id, 'normal', mode);
    if (!field) throw new Error('no field');
    const day = newDay(field, mode, true);
    const sim = day.surface;
    const player = greedyPlayer(sim);
    const recorder = new Recorder();
    for (let tick = 0; tick < 60 * 30 && !sim.ended; tick++) {
      const partner = sim.partnerWarden;
      const second = recorder.partner({
        ...NO_INPUT,
        moveX: tick % 400 < 200 ? 1 : -1,
        cursorX: (partner?.x ?? 0) + 4,
        cursorZ: partner?.z ?? 0,
        throwHeld: tick % 90 < 20,
      });
      sim.step(recorder.input(player.input(tick)), second);
    }
    recorder.event('end');
    sim.endNow();
    const log = await recorder.log({ level: level.id, difficulty: 'normal', mode }, 'test');
    expect(log.partner).toBeDefined();
    const run = await replayToEnd(log);
    if (!run) throw new Error('no replay');
    expect(simHash(run.expedition.surface)).toBe(simHash(sim));
    run.dispose();

    const facts = challengeFacts(sim);
    const entry = makeChallengeRun(
      {
        levelId: level.id,
        difficulty: 'normal',
        mode,
        facts,
        score: scoreChallenge(mode, field, facts),
        elapsed: sim.elapsed,
        coop: true,
      },
      'test',
      new Date('2026-11-25T12:00:00Z'),
    );
    if (!entry) throw new Error('no run');
    expect(entry.coop).toBe(true);
    expect(await verifyRun(entry, log)).toBe('same');
    // Played solo, the same claim would not hold.
    expect(await verifyRun({ ...entry, coop: undefined }, log)).toBe('different');
    const board = [
      { ...entry, player: 'a1a1a1a1a1a1a1a1', name: 'Ada', code: 'a' },
      { ...entry, coop: undefined, player: 'a1a1a1a1a1a1a1a1', name: 'Ada', code: 'b' },
    ] as BoardEntry[];
    expect(standings(board, level.id, 'normal', mode, true).map((e) => e.code)).toEqual(['a']);
    expect(standings(board, level.id, 'normal', mode, false).map((e) => e.code)).toEqual(['b']);
    expect(boardGroup(entry)).toBe(`${mode}+coop`);
    day.dispose();
  });
});
