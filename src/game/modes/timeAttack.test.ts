import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS } from '../world/level';
import { greedyPlayer } from '../world/testBot';
import {
  academyTime,
  decodeInputs,
  decodeTrack,
  encodeInputs,
  encodeTrack,
  ghostAt,
  medalTimes,
  timeMedal,
  TRACK_EVERY,
} from './timeAttack';

beforeAll(async () => {
  await initPhysics();
});

const LESSON = LEVELS[0];

describe('time medals', () => {
  it('awards Diamond to Bronze by the clear time', () => {
    const times = medalTimes(LESSON);
    expect(timeMedal(LESSON, times.Diamond)).toBe('Diamond');
    expect(timeMedal(LESSON, times.Platinum)).toBe('Platinum');
    expect(timeMedal(LESSON, times.Gold)).toBe('Gold');
    expect(timeMedal(LESSON, times.Silver)).toBe('Silver');
    expect(timeMedal(LESSON, times.Silver + 1)).toBe('Bronze');
  });

  it('adds up the Academy time over the lessons cleared', () => {
    const total = academyTime([{ id: 'a' }, { id: 'b' }, { id: 'c' }], {
      a: [10, 30],
      c: [5, 12.5],
    });
    expect(total).toEqual({ seconds: 42.5, lessons: 2 });
  });
});

describe('ghosts', () => {
  it('packs a path and walks it back, between the noted places', () => {
    const track = [0, 0, 1.5, -2.25, 3, -4.5];
    const back = decodeTrack(encodeTrack(track));
    expect(back).toEqual([0, 0, 1.5, -2.2, 3, -4.5]);
    const halfway = ghostAt(back, (TRACK_EVERY / 60) * 0.5);
    expect(halfway?.x).toBeCloseTo(0.75);
    expect(ghostAt(back, 99)).toBeNull();
    expect(decodeTrack('not a track!')).toEqual([]);
  });

  it('notes the Warden’s path through a day', () => {
    const sim = new Simulation(LESSON);
    const player = greedyPlayer(sim);
    for (let tick = 0; tick < 600; tick++) sim.step(player.input(tick));
    expect(sim.track.length).toBe((600 / TRACK_EVERY) * 2);
    sim.dispose();
  });
});

describe('input logs', () => {
  it('replay a whole clear exactly, from their packed form', () => {
    // A run played on logged inputs (rounded as the log keeps them) ...
    const first = new Simulation(LESSON);
    const player = greedyPlayer(first);
    const log = [];
    for (let tick = 0; tick < 60 * 600 && !first.ended; tick++) {
      const input = decodeInputs(encodeInputs([player.input(tick)]))[0];
      log.push(input);
      first.step(input);
    }
    expect(first.ended).toBe('allCollected');
    const packed = encodeInputs(log);
    // ... is played again from the log alone, to the same clear time and deliveries.
    const again = new Simulation(LESSON);
    for (const input of decodeInputs(packed)) {
      if (again.ended) break;
      again.step(input);
    }
    expect(again.ended).toBe('allCollected');
    expect(again.elapsed).toBe(first.elapsed);
    expect(again.stats.deliveryTimes).toEqual(first.stats.deliveryTimes);
    // Runs of identical steps keep the log small.
    expect(packed.length).toBeLessThan(log.length * 40);
    first.dispose();
    again.dispose();
  }, 120_000);
});
