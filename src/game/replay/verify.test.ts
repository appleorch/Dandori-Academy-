import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { greedyPlayer } from '../world/testBot';
import { CHALLENGE_LEVELS } from '../world/level';
import { challengeFacts } from '../modes/facts';
import { scoreChallenge } from '../modes/modes';
import { encodePost, makeChallengeRun, type RunEntry } from '../leaderboard/runCode';
import { collectBoard, parseRelayPosts, relayMessage } from '../leaderboard/board';
import { fieldFor, newDay, Recorder, type DayLog } from './replay';
import { logHash } from './replayStore';
import { verifyRun } from './verify';

beforeAll(async () => {
  await initPhysics();
});

/** A challenge day played by the test player and ended early, as a run and its replay. */
async function playedRun(): Promise<{ run: RunEntry; log: DayLog }> {
  const level = CHALLENGE_LEVELS.find((l) => l.challenge?.mode === 'hunt') ?? CHALLENGE_LEVELS[0];
  const mode = level.challenge?.mode ?? 'hunt';
  const field = fieldFor(level.id, 'normal', mode);
  if (!field) throw new Error('no field');
  const day = newDay(field, mode);
  const sim = day.surface;
  const player = greedyPlayer(sim);
  const recorder = new Recorder();
  for (let tick = 0; tick < 60 * 40 && !sim.ended; tick++)
    sim.step(recorder.input(player.input(tick)));
  recorder.event('end');
  sim.endNow();
  const facts = challengeFacts(sim);
  const run = makeChallengeRun(
    {
      levelId: level.id,
      difficulty: 'normal',
      mode,
      facts,
      score: scoreChallenge(mode, field, facts),
      elapsed: sim.elapsed,
    },
    'test',
    new Date('2026-11-25T12:00:00Z'),
  );
  day.dispose();
  if (!run) throw new Error('no run');
  return { run, log: await recorder.log({ level: level.id, difficulty: 'normal', mode }, 'test') };
}

describe('verified leaderboards', () => {
  it('finds a run’s own replay gives its result, and a doctored claim does not', async () => {
    const { run, log } = await playedRun();
    expect(await verifyRun(run, log)).toBe('same');
    expect(await verifyRun({ ...run, time: run.time - 5 }, log)).toBe('different');
    expect(await verifyRun(run, { ...log, sim: log.sim + 1 })).toBe('unchecked');
  });

  it('keeps and marks verified runs, drops doctored ones, and keeps the top replays', async () => {
    const { run, log } = await playedRun();
    const honest = await encodePost({
      v: 1,
      player: 'a1a1a1a1a1a1a1a1',
      name: 'Ada',
      run,
      log: logHash(log),
    });
    const doctored = await encodePost({
      v: 1,
      player: 'b2b2b2b2b2b2b2b2',
      name: 'Bo',
      run: { ...run, time: run.time - 5 },
      log: logHash(log),
    });
    // Off the relay: the replay rides beside each post.
    const answer = [honest, doctored]
      .map((code) => JSON.stringify({ event: 'message', message: relayMessage(code, log) }))
      .join('\n');
    const { posts } = parseRelayPosts(answer);
    expect(posts[0].log).toEqual(log);
    const collected = await collectBoard(
      { v: 1, updated: '', posts: [], verified: [], logs: [] },
      posts,
      new Set(),
      new Date(),
      verifyRun,
      () => false,
      logHash,
    );
    expect(collected.file.posts).toEqual([honest]);
    expect(collected.file.verified).toEqual([honest]);
    expect(collected.file.logs).toEqual([logHash(log)]);
    expect(collected.logs.get(logHash(log))).toEqual(log);
    // Next time round it stays verified without being replayed again.
    let replays = 0;
    const again = await collectBoard(
      collected.file,
      [],
      new Set(),
      new Date(),
      async () => {
        replays++;
        return 'different';
      },
      () => true,
      logHash,
    );
    expect(replays).toBe(0);
    expect(again.file.verified).toEqual([honest]);
  });
});
