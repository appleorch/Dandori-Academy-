import type { InputState } from '../commands/input';
import type { Difficulty } from '../core/difficulty';
import { levelForMode } from '../modes/battle';
import { MODES, type ModeId } from '../modes/modes';
import { Expedition } from '../simulation/expedition';
import { Simulation } from '../simulation/Simulation';
import { initPhysics } from '../simulation/physics';
import { forDifficulty, levelById, type LevelDefinition } from '../world/level';
import { compress, decompress, packInputs, quantise, unpackInputs } from './inputLog';

/**
 * Replays. A day is fully decided by its field, its mode and its inputs, so a log of those
 * replays it exactly: in the viewer, for a ghost, and on the board's server to check a run.
 * Only what happens outside the simulation's own input needs noting beside the inputs: going
 * down a stair and back up, and ending the day early.
 *
 * SIM_VERSION is the simulation's version: bump it whenever a change would make an old log
 * play out differently (any change to the rules, the physics or a field). Logs only replay,
 * and runs are only verified, against the version they were recorded on.
 */
export const SIM_VERSION = 1;

/** What happened outside the inputs, and at which step (counted across the whole day). */
export type ReplayEvent = readonly [
  step: number,
  kind: 'down' | 'up' | 'end' | 'emberbrew' | 'stillwater' | 'sort',
];

export interface DayLog {
  v: 1;
  sim: number;
  /** The game version it was played on, shown only. */
  game: string;
  level: string;
  difficulty: Difficulty;
  mode: ModeId;
  /** The inputs, packed and compressed (see inputLog.ts). */
  inputs: string;
  events: ReplayEvent[];
  /** Seconds of day played, for the viewer's timeline before anything is replayed. */
  seconds: number;
}

/** Modes whose days can be replayed: everything but the story (whose field depends on the
 * story so far) and battles (with a rival alongside). */
export function replayable(mode: ModeId): boolean {
  return mode !== 'campaign' && MODES[mode].kind !== 'battle';
}

/** The field a logged day was played on, as it was set up then. */
export function fieldFor(levelId: string, difficulty: Difficulty, mode: ModeId) {
  const base = levelById(levelId);
  return base ? levelForMode(forDifficulty(base, difficulty), mode) : null;
}

/** A fresh day on a field, as the game starts one (see GameCanvas). */
export function newDay(level: LevelDefinition, mode: ModeId): Expedition {
  const rules = MODES[mode];
  return new Expedition(new Simulation(level, { endsWhen: rules.endsWhen, growth: rules.growth }));
}

/**
 * Notes a day as it is played. The loop hands each step's input to `input`, which returns
 * what to give the simulation (the input on the log's grid), and tells it of anything else.
 */
export class Recorder {
  readonly inputs: InputState[] = [];
  readonly events: ReplayEvent[] = [];

  input(raw: InputState): InputState {
    const input = quantise(raw);
    this.inputs.push(input);
    return input;
  }

  event(kind: ReplayEvent[1]): void {
    this.events.push([this.inputs.length, kind]);
  }

  async log(
    day: { level: string; difficulty: Difficulty; mode: ModeId },
    game: string,
  ): Promise<DayLog> {
    return {
      v: 1,
      sim: SIM_VERSION,
      game,
      ...day,
      inputs: await compress(packInputs(this.inputs)),
      events: [...this.events],
      seconds: this.inputs.length / 60,
    };
  }
}

/** A logged day, ready to be played back step by step. */
export class ReplayRun {
  readonly expedition: Expedition;
  step = 0;
  private nextEvent = 0;

  constructor(
    readonly log: DayLog,
    readonly inputs: readonly InputState[],
    readonly level: LevelDefinition,
  ) {
    this.expedition = newDay(level, log.mode);
  }

  /** Unpacks a log and sets up its day; null if the log is from another version or field. */
  static async open(log: DayLog): Promise<ReplayRun | null> {
    if (log.sim !== SIM_VERSION) return null;
    await initPhysics();
    const level = fieldFor(log.level, log.difficulty, log.mode);
    if (!level) return null;
    const inputs = unpackInputs(await decompress(log.inputs));
    return new ReplayRun(log, inputs, level);
  }

  get total(): number {
    return this.inputs.length;
  }

  get done(): boolean {
    return this.step >= this.inputs.length || this.expedition.surface.ended !== null;
  }

  /** Plays up to `count` steps; returns how many were played. */
  advance(count: number): number {
    let played = 0;
    while (played < count && !this.done) {
      while (
        this.nextEvent < this.log.events.length &&
        this.log.events[this.nextEvent][0] <= this.step
      ) {
        const kind = this.log.events[this.nextEvent++][1];
        if (kind === 'down') this.expedition.descend();
        else if (kind === 'up') this.expedition.ascend();
        else if (kind === 'emberbrew') this.expedition.active.sprayEmberbrew();
        else if (kind === 'stillwater') this.expedition.active.sprayStillwater();
        else if (kind === 'sort') this.expedition.active.sortSquad();
        else this.expedition.surface.endNow();
      }
      if (this.done) break;
      const sim = this.expedition.active;
      sim.step(this.inputs[this.step++]);
      if (this.expedition.below) this.expedition.settle();
      played++;
    }
    // An end noted after the last input still ends the day.
    for (; this.nextEvent < this.log.events.length; this.nextEvent++) {
      const [at, kind] = this.log.events[this.nextEvent];
      if (at > this.step) break;
      if (kind === 'end') this.expedition.surface.endNow();
    }
    return played;
  }

  dispose(): void {
    this.expedition.dispose();
  }
}

/** Plays a log to its end, headless; null if it cannot be replayed here. */
export async function replayToEnd(log: DayLog): Promise<ReplayRun | null> {
  const run = await ReplayRun.open(log);
  if (!run) return null;
  run.advance(Infinity);
  return run;
}
