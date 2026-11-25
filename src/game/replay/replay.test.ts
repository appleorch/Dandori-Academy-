import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT, type InputState } from '../commands/input';
import { initPhysics } from '../simulation/physics';
import { greedyPlayer } from '../world/testBot';
import { CHALLENGE_LEVELS } from '../world/level';
import { challengeFacts } from '../modes/facts';
import { compress, decompress, packInputs, quantise, unpackInputs } from './inputLog';
import { fieldFor, newDay, Recorder, replayToEnd, ReplayRun, SIM_VERSION } from './replay';

beforeAll(async () => {
  await initPhysics();
});

describe('the input log', () => {
  it('packs a day’s inputs small and unpacks them exactly', async () => {
    const inputs: InputState[] = [];
    for (let i = 0; i < 2000; i++) {
      inputs.push(
        quantise({
          ...NO_INPUT,
          moveX: i % 300 < 150 ? 0.7071 : -1,
          moveZ: Math.sin(i / 50),
          cursorX: 10 + Math.cos(i / 40) * 7.33,
          cursorZ: -4 + Math.sin(i / 40) * 7.33,
          throwHeld: i % 90 < 30,
          whistleHeld: i % 400 > 380,
          dismiss: i === 999,
          rush: i === 1500,
          selectKind: i === 1200 ? 'dew' : null,
        }),
      );
    }
    const packed = packInputs(inputs);
    expect(unpackInputs(packed)).toEqual(inputs);
    // A few bytes a step at most, and less again compressed.
    expect(packed.length).toBeLessThan(inputs.length * 8);
    const text = await compress(packed);
    expect(await decompress(text)).toEqual(packed);
    expect(() => unpackInputs(new Uint8Array([1, 2, 3]))).toThrow();
  });
});

describe('replays', () => {
  it('replays a recorded test-player day exactly, ending early included', async () => {
    const level = CHALLENGE_LEVELS.find((l) => l.challenge?.mode === 'hunt') ?? CHALLENGE_LEVELS[0];
    const mode = level.challenge?.mode ?? 'hunt';
    const field = fieldFor(level.id, 'normal', mode);
    if (!field) throw new Error('no field');
    const live = newDay(field, mode);
    const sim = live.surface;
    const player = greedyPlayer(sim);
    const recorder = new Recorder();
    for (let tick = 0; tick < 60 * 70 && !sim.ended; tick++) {
      sim.step(recorder.input(player.input(tick)));
    }
    // The player calls the day from the pause menu, as the loop would note it.
    recorder.event('end');
    sim.endNow();
    const log = await recorder.log({ level: level.id, difficulty: 'normal', mode }, 'test');
    expect(log.sim).toBe(SIM_VERSION);

    const run = await replayToEnd(JSON.parse(JSON.stringify(log)));
    if (!run) throw new Error('could not replay');
    const again = run.expedition.surface;
    expect(again.ended).toBe(sim.ended);
    expect(again.elapsed).toBe(sim.elapsed);
    expect(again.stats.treasuresCollected).toEqual(sim.stats.treasuresCollected);
    expect(again.stats.workersLost).toBe(sim.stats.workersLost);
    expect(again.captainTransform.x).toBe(sim.captainTransform.x);
    expect(challengeFacts(again)).toEqual(challengeFacts(sim));
    run.dispose();
    live.dispose();
  });

  it('refuses a log from another simulation version', async () => {
    const log = {
      v: 1 as const,
      sim: SIM_VERSION + 1,
      game: 'x',
      level: CHALLENGE_LEVELS[0].id,
      difficulty: 'normal' as const,
      mode: 'hunt' as const,
      inputs: await compress(packInputs([NO_INPUT])),
      events: [],
      seconds: 0,
    };
    expect(await ReplayRun.open(log)).toBeNull();
  });
});
