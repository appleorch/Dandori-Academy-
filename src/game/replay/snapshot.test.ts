import { beforeAll, describe, expect, it } from 'vitest';
import type { InputState } from '../commands/input';
import { initPhysics } from '../simulation/physics';
import { greedyPlayer } from '../world/testBot';
import { CHALLENGE_LEVELS, LEVELS } from '../world/level';
import { simHash } from '../net/lockstep';
import { fieldFor, newDay } from './replay';
import { snapshotExpedition } from './snapshot';

beforeAll(async () => {
  await initPhysics();
});

describe('snapshots', () => {
  for (const level of [
    CHALLENGE_LEVELS.find((l) => l.challenge?.mode === 'mission') ?? CHALLENGE_LEVELS[0],
    LEVELS[6],
  ]) {
    it(`play on exactly as the day did (${level.id})`, () => {
      const mode = level.challenge?.mode ?? 'lessons';
      const field = fieldFor(level.id, 'normal', mode);
      if (!field) throw new Error('no field');
      const day = newDay(field, mode);
      const player = greedyPlayer(day.surface);
      const inputs: InputState[] = [];
      for (let tick = 0; tick < 1800; tick++) inputs.push(player.input(tick));
      // Replay the inputs, taking a snapshot partway.
      const live = newDay(field, mode);
      for (let i = 0; i < 900; i++) live.surface.step(inputs[i]);
      const snap = snapshotExpedition(live);
      for (let i = 900; i < 1800; i++) live.surface.step(inputs[i]);
      for (let i = 900; i < 1800; i++) snap.surface.step(inputs[i]);
      expect(snap.surface.tick).toBe(live.surface.tick);
      expect(simHash(snap.surface)).toBe(simHash(live.surface));
      expect(snap.surface.stats.treasuresCollected).toEqual(live.surface.stats.treasuresCollected);
      day.dispose();
      live.dispose();
      snap.dispose();
    });
  }
});

describe('seeking in a replay', () => {
  it('goes back to an earlier moment and plays on to the same day', async () => {
    const { Recorder, ReplayRun } = await import('./replay');
    const level = CHALLENGE_LEVELS.find((l) => l.challenge?.mode === 'hunt') ?? CHALLENGE_LEVELS[0];
    const mode = level.challenge?.mode ?? 'hunt';
    const field = fieldFor(level.id, 'normal', mode);
    if (!field) throw new Error('no field');
    const day = newDay(field, mode);
    const player = greedyPlayer(day.surface);
    const recorder = new Recorder();
    for (let tick = 0; tick < 2400 && !day.surface.ended; tick++)
      day.surface.step(recorder.input(player.input(tick)));
    const log = await recorder.log({ level: level.id, difficulty: 'normal', mode }, 'test');
    const run = await ReplayRun.open(log);
    if (!run) throw new Error('no run');
    run.advance(2000);
    const there = simHash(run.expedition.surface);
    run.seekTo(700);
    expect(run.step).toBe(700);
    run.seekTo(2000);
    expect(simHash(run.expedition.surface)).toBe(there);
    run.dispose();
    day.dispose();
  });
});
