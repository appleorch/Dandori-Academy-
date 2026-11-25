import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { CHALLENGE_LEVELS, shardCount, treasureTotal } from './level';
import { challengeFacts } from '../modes/facts';
import { scoreChallenge } from '../modes/modes';
import { checkRun, makeChallengeRun } from '../leaderboard/runCode';
import { fieldFor, newDay, Recorder } from '../replay/replay';
import { verifyRun } from '../replay/verify';
import { simHash } from '../net/lockstep';
import { replayToEnd } from '../replay/replay';
import { playDive } from './diveBot';

beforeAll(async () => {
  await initPhysics();
});

describe('the Expedition', () => {
  const level = CHALLENGE_LEVELS.find((l) => l.challenge?.mode === 'expedition');
  if (!level) throw new Error('no Expedition field');

  it('counts every floor in the field’s Sunshards and treasure', () => {
    const floors = level.floors ?? [];
    expect(floors.length).toBeGreaterThanOrEqual(2);
    const own = shardCount({ ...level, floors: undefined });
    expect(shardCount(level)).toBe(own + floors.reduce((sum, f) => sum + shardCount(f), 0));
    expect(treasureTotal(level)).toBeGreaterThan(treasureTotal({ ...level, floors: undefined }));
    // Each floor but the last leads to the next.
    floors.forEach((floor, i) => expect(floor.descent?.to).toBe(floors[i + 1]?.id));
    expect(level.descent?.to).toBe(floors[0].id);
  });

  it('is dived to the bottom, replays exactly, and verifies for the board', async () => {
    const field = fieldFor(level.id, 'normal', 'expedition');
    if (!field) throw new Error('no field');
    expect(field.descent).toBeDefined();
    const day = newDay(field, 'expedition');
    const recorder = new Recorder();
    const moves: string[] = [];
    playDive(
      day,
      (input) => recorder.input(input),
      (move) => {
        recorder.event(move);
        moves.push(move);
      },
    );
    const sim = day.surface;
    expect(sim.ended).toBe('allCollected');
    expect(moves.filter((m) => m === 'down').length).toBe(field.floors?.length);
    const facts = challengeFacts(sim);
    expect(facts.shardsHome).toBe(facts.shardsTotal);
    const log = await recorder.log(
      { level: level.id, difficulty: 'normal', mode: 'expedition' },
      't',
    );
    const replay = await replayToEnd(log);
    if (!replay) throw new Error('no replay');
    expect(simHash(replay.expedition.surface)).toBe(simHash(sim));
    replay.dispose();
    const run = makeChallengeRun(
      {
        levelId: level.id,
        difficulty: 'normal',
        mode: 'expedition',
        facts,
        score: scoreChallenge('expedition', field, facts),
        elapsed: sim.elapsed,
      },
      't',
      new Date('2026-11-25T12:00:00Z'),
    );
    if (!run) throw new Error('no run');
    // The log's inputs are on its grid, so the day may differ a little from the measured one.
    expect(['Gold', 'Platinum', 'Diamond']).toContain(run.rank);
    expect(checkRun(run)).toBeNull();
    expect(await verifyRun(run, log)).toBe('same');
    expect(await verifyRun({ ...run, alive: run.alive + 1 }, log)).toBe('different');
    day.dispose();
  }, 120_000);
});
