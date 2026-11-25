import { NO_INPUT, type InputState } from '../commands/input';
import { packInputs, quantise, unpackInputs } from '../replay/inputLog';
import type { Simulation } from '../simulation/Simulation';

/**
 * Online play in lockstep. Both browsers run the same simulations; only inputs cross the wire.
 * Each step's input is decided `delay` steps ahead and sent at once, so by the time a step is
 * due the other side's input for it has usually arrived; if it has not, the step waits. Every
 * second each side sends a hash of its simulations, and a mismatch is reported as a desync.
 * Plain logic over a `Transport`, so two peers can be run against each other in a test.
 */

export type NetMessage =
  | { t: 'input'; step: number; input: string }
  | { t: 'hash'; step: number; hash: number }
  | { t: 'start'; level: string; mode: string }
  | { t: 'bye' };

export interface Transport {
  send(message: NetMessage): void;
  /** Called for every message from the other side. */
  onMessage: ((message: NetMessage) => void) | null;
  close(): void;
}

/** Steps of input delay: about 100 ms at 60 steps a second. */
export const INPUT_DELAY = 6;
/** How often the simulations' hash is compared, in steps. */
export const HASH_EVERY = 60;

const encode = (input: InputState) => {
  const bytes = packInputs([input]);
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
};
const decode = (text: string): InputState => {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return unpackInputs(bytes)[0];
};

export class Lockstep {
  /** The next step to be played. */
  step = 0;
  /** Set when the two sides' simulations stopped matching, with the step it was noticed at. */
  desync: number | null = null;
  /** Set when the other side has left: their field stands still from then on. */
  left = false;
  private readonly mine = new Map<number, InputState>();
  private readonly theirs = new Map<number, InputState>();
  private readonly hashes = new Map<number, { mine?: number; theirs?: number }>();
  private queued = 0;

  constructor(
    private readonly transport: Transport,
    readonly delay = INPUT_DELAY,
  ) {
    // The first steps have no input decided ahead: nobody presses anything.
    for (let s = 0; s < delay; s++) {
      this.mine.set(s, NO_INPUT);
      this.theirs.set(s, NO_INPUT);
    }
    this.queued = delay;
    transport.onMessage = (message) => this.receive(message);
  }

  private receive(message: NetMessage): void {
    if (message.t === 'input') this.theirs.set(message.step, decode(message.input));
    else if (message.t === 'hash') this.noteHash(message.step, 'theirs', message.hash);
    else if (message.t === 'bye') this.left = true;
  }

  private noteHash(step: number, side: 'mine' | 'theirs', hash: number): void {
    const entry = this.hashes.get(step) ?? {};
    entry[side] = hash;
    this.hashes.set(step, entry);
    if (entry.mine !== undefined && entry.theirs !== undefined) {
      if (entry.mine !== entry.theirs && this.desync === null) this.desync = step;
      this.hashes.delete(step);
    }
  }

  /**
   * Decides this side's input for the step `delay` ahead, and sends it. Call once before each
   * step played; calls while waiting change nothing (the input is already decided).
   */
  submit(input: InputState): void {
    if (this.queued > this.step + this.delay) return;
    const decided = quantise(input);
    this.mine.set(this.queued, decided);
    this.transport.send({ t: 'input', step: this.queued, input: encode(decided) });
    this.queued++;
  }

  /** Whether both sides' inputs for the next step are here. */
  ready(): boolean {
    return this.mine.has(this.step) && (this.left || this.theirs.has(this.step));
  }

  /** Both inputs for the next step, moving on to the one after. Only when `ready`. */
  take(): { mine: InputState; theirs: InputState } {
    const mine = this.mine.get(this.step) ?? NO_INPUT;
    const theirs = this.theirs.get(this.step) ?? NO_INPUT;
    this.mine.delete(this.step);
    this.theirs.delete(this.step);
    this.step++;
    return { mine, theirs };
  }

  /** After a step: every second, sends the hash of the simulations and checks the other's. */
  check(hash: () => number): void {
    if (this.step % HASH_EVERY !== 0) return;
    const value = hash();
    this.noteHash(this.step, 'mine', value);
    this.transport.send({ t: 'hash', step: this.step, hash: value });
  }

  close(): void {
    this.transport.send({ t: 'bye' });
    this.transport.close();
  }
}

/** FNV-1a over numbers, each taken to a ten-thousandth. */
function mix(hash: number, value: number): number {
  let h = hash ^ (Math.round(value * 10000) | 0);
  h = Math.imul(h, 16777619);
  return h >>> 0;
}

/**
 * A hash of a simulation's state that both sides can compare: the step, the Warden, every
 * Sproutling, beast and haul, and what has come home.
 */
export function simHash(sim: Simulation, seed = 2166136261): number {
  let h = mix(seed, sim.tick);
  h = mix(h, sim.captainTransform.x);
  h = mix(h, sim.captainTransform.z);
  h = mix(h, sim.captainState.hp);
  for (const [entity, worker] of sim.workers.entries()) {
    const at = sim.transforms.require(entity);
    h = mix(mix(mix(h, entity), at.x), at.z);
    h = mix(h, worker.state.length);
  }
  for (const [entity, enemy] of sim.enemies.entries()) {
    const at = sim.transforms.require(entity);
    h = mix(mix(mix(h, entity), at.x), at.z);
    h = mix(h, enemy.hp);
  }
  for (const [entity] of sim.carryables.entries()) {
    const at = sim.transforms.require(entity);
    h = mix(mix(h, at.x), at.z);
  }
  h = mix(h, sim.stats.treasuresCollected.length);
  h = mix(h, sim.stats.weightDelivered);
  return h;
}

/** Both fields of an online battle, hashed the same way round on both sides: host's first. */
export function battleHash(host: Simulation, guest: Simulation): number {
  return simHash(guest, simHash(host));
}
