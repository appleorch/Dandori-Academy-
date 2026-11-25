import type { InputState } from '../commands/input';
import type { LevelDefinition } from '../world/levelTypes';

/**
 * Time Attack's own measures: a medal for the clear time, the Academy time across every lesson,
 * the Warden's path through a best run kept compactly for its ghost, and input logs packed by
 * run length (the simulation is deterministic, so a day's inputs reproduce it exactly).
 */

export type TimeMedal = 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';

/** Gold and Silver, as multiples of the Platinum time. */
const GOLD = 1.25;
const SILVER = 1.6;

/** The medal a clear in `seconds` earns: Diamond and Platinum by the lesson's own times. */
export function timeMedal(
  level: Pick<LevelDefinition, 'platinumTime' | 'diamondTime'>,
  seconds: number,
): TimeMedal {
  if (seconds <= level.diamondTime) return 'Diamond';
  if (seconds <= level.platinumTime) return 'Platinum';
  if (seconds <= level.platinumTime * GOLD) return 'Gold';
  if (seconds <= level.platinumTime * SILVER) return 'Silver';
  return 'Bronze';
}

/** The seconds each medal asks for, for the results' targets. */
export function medalTimes(level: Pick<LevelDefinition, 'platinumTime' | 'diamondTime'>) {
  return {
    Diamond: level.diamondTime,
    Platinum: level.platinumTime,
    Gold: level.platinumTime * GOLD,
    Silver: level.platinumTime * SILVER,
  };
}

/**
 * The Academy time: the best clear of every lesson cleared, added up, and how many lessons that
 * covers. `splits` is the save's best splits by lesson; the last split of each is its clear.
 */
export function academyTime(
  lessons: readonly Pick<LevelDefinition, 'id'>[],
  splits: Readonly<Record<string, readonly number[]>>,
): { seconds: number; lessons: number } {
  let seconds = 0;
  let count = 0;
  for (const lesson of lessons) {
    const best = splits[lesson.id];
    if (!best || best.length === 0) continue;
    seconds += best[best.length - 1];
    count++;
  }
  return { seconds, lessons: count };
}

/** How often the Warden's place is noted for a ghost, in simulation steps. */
export const TRACK_EVERY = 15;

/** Packs a path of (x, z) pairs, a tenth of a unit apart at most, as base64 16-bit integers. */
export function encodeTrack(track: readonly number[]): string {
  const values = new Int16Array(track.length);
  track.forEach((value, i) => {
    values[i] = Math.max(-32768, Math.min(32767, Math.round(value * 10)));
  });
  const bytes = new Uint8Array(values.buffer);
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

export function decodeTrack(packed: string | undefined): number[] {
  if (!packed) return [];
  let text: string;
  try {
    text = atob(packed);
  } catch {
    return [];
  }
  if (text.length % 2 !== 0) return [];
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return [...new Int16Array(bytes.buffer)].map((value) => value / 10);
}

/** Where a ghost stands `seconds` into its run, between the noted places; null once it ends. */
export function ghostAt(
  track: readonly number[],
  seconds: number,
  stepsPerSecond = 60,
): { x: number; z: number } | null {
  const points = track.length / 2;
  if (points < 2) return null;
  const at = (seconds * stepsPerSecond) / TRACK_EVERY;
  if (at >= points - 1) return null;
  const i = Math.floor(at);
  const t = at - i;
  return {
    x: track[i * 2] + (track[i * 2 + 2] - track[i * 2]) * t,
    z: track[i * 2 + 1] + (track[i * 2 + 3] - track[i * 2 + 1]) * t,
  };
}

/** One step's input, as it is logged: the cursor to a twentieth of a unit. */
type Logged = InputState;

const key = (input: Logged) =>
  JSON.stringify({
    ...input,
    cursorX: Math.round(input.cursorX * 20) / 20,
    cursorZ: Math.round(input.cursorZ * 20) / 20,
    moveX: Math.round(input.moveX * 100) / 100,
    moveZ: Math.round(input.moveZ * 100) / 100,
  });

/** Packs a day's inputs, one per step, as runs of identical steps. */
export function encodeInputs(inputs: readonly Logged[]): string {
  const runs: [string, number][] = [];
  for (const input of inputs) {
    const k = key(input);
    const last = runs[runs.length - 1];
    if (last && last[0] === k) last[1]++;
    else runs.push([k, 1]);
  }
  return JSON.stringify(runs.map(([k, n]) => [JSON.parse(k), n]));
}

export function decodeInputs(packed: string): Logged[] {
  const runs = JSON.parse(packed) as [Logged, number][];
  const out: Logged[] = [];
  for (const [input, count] of runs) for (let i = 0; i < count; i++) out.push(input);
  return out;
}
