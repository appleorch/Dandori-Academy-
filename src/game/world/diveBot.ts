import { NO_INPUT, type InputState } from '../commands/input';
import { createMover, steerTo } from '../navigation/steering';
import { MODES, type ModeId } from '../modes/modes';
import { Expedition } from '../simulation/expedition';
import { Simulation } from '../simulation/Simulation';
import { shardCount, type LevelDefinition } from './level';
import { BOT_STYLES, greedyPlayer, type BotStyle, type GreedyPlayer } from './testBot';

/** How near a way down (or the foot of the stair) the Warden must stand to take it. */
export const STAIR_REACH = 2.6;
/** Steps of pushing without moving before the Warden sidesteps (pinned on a wall's corner). */
const PINNED_STEPS = 60;
/** Steps a sidestep lasts. */
const SIDESTEP_STEPS = 40;
/** Steps waited for stragglers to join the squad before going down without them. */
const GATHER_STEPS = 60 * 25;

/** One step of a dive: what to press, and whether to take the stairs down or up after it. */
export interface DiveStep {
  input: InputState;
  move?: 'down' | 'up';
}

/** Sunshards of a floor's own still to come home (an Expedition's field counts its caves too). */
export function floorLeft(sim: Simulation): number {
  const own = shardCount({ ...sim.level, floors: undefined });
  // Shards pooled up from the caves are noted as `caveId:shardId`.
  const home = sim.stats.treasuresCollected.filter((id) => !id.includes(':')).length;
  return own - home;
}

/**
 * The test player on an Expedition: the greedy player on each floor, and between floors, once a
 * floor's own Sunshards are home, down the stairs with the squad until the deepest floor is
 * emptied, then back up floor by floor. A floor with a way down is gone down before it is left.
 */
export function diver(expedition: Expedition, style: BotStyle = BOT_STYLES[0]) {
  let on: Simulation = expedition.active;
  let player: GreedyPlayer = greedyPlayer(on, style);
  const mover = createMover();
  const dir = { x: 0, z: 0 };
  let gatherSince = -1;
  const walk = (sim: Simulation, x: number, z: number): InputState => {
    const input: InputState = { ...NO_INPUT, cursorX: x, cursorZ: z };
    steerTo(sim.nav, mover, sim.anchor, x, z, 1 / 60, dir);
    input.moveX = dir.x;
    input.moveZ = dir.z;
    return input;
  };
  // Pinned: pushing for a while without moving (the grid sees a way the body cannot take).
  const pin = { x: 0, z: 0, since: 0, side: 1, until: -1, dx: 0, dz: 0 };
  const unpin = (tick: number, out: DiveStep): DiveStep => {
    const at = on.captainTransform;
    if (tick < pin.until) {
      out.input.moveX = pin.dx;
      out.input.moveZ = pin.dz;
      return out;
    }
    const pushing = Math.hypot(out.input.moveX, out.input.moveZ) > 0.5;
    if (!pushing || Math.hypot(at.x - pin.x, at.z - pin.z) > 0.3) {
      pin.x = at.x;
      pin.z = at.z;
      pin.since = tick;
    } else if (tick - pin.since > PINNED_STEPS) {
      // Step aside and back, turning the other way each time.
      pin.side = -pin.side;
      pin.dx = -out.input.moveZ * pin.side - out.input.moveX * 0.5;
      pin.dz = out.input.moveX * pin.side - out.input.moveZ * 0.5;
      const length = Math.hypot(pin.dx, pin.dz) || 1;
      pin.dx /= length;
      pin.dz /= length;
      pin.until = tick + SIDESTEP_STEPS;
      pin.since = tick + SIDESTEP_STEPS;
    }
    return out;
  };
  const step = (tick: number): DiveStep => unpin(tick, choose(tick));
  const choose = (tick: number): DiveStep => {
    if (expedition.active !== on) {
      on = expedition.active;
      player = greedyPlayer(on, style);
      gatherSince = -1;
    }
    const sim = on;
    const from = sim.captainTransform;
    const descent = sim.level.descent;
    const left = floorLeft(sim);
    if (left > 0) return { input: player.input(tick) };
    if (descent && !expedition.emptied(descent.to)) {
      // Everyone this floor has gathers first, for a while; then down with whoever came.
      const { squad, total } = sim.countWorkers();
      if (gatherSince < 0) gatherSince = tick;
      if (squad < total && tick - gatherSince < GATHER_STEPS) return { input: player.input(tick) };
      const near = Math.hypot(from.x - descent.x, from.z - descent.z) < STAIR_REACH - 0.4;
      if (near && expedition.blocked() === null) {
        return { input: { ...NO_INPUT, cursorX: from.x, cursorZ: from.z }, move: 'down' };
      }
      const input = walk(sim, descent.x, descent.z);
      // Tapping the whistle on the way keeps the squad close behind.
      input.whistleHeld = squad === 0 && tick % 2 === 0;
      if (squad === 0) {
        input.cursorX = from.x;
        input.cursorZ = from.z;
      }
      return { input };
    }
    if (expedition.below) {
      // This floor and every one below it emptied: back up the way in.
      const start = sim.level.captain;
      if (Math.hypot(from.x - start.x, from.z - start.z) < STAIR_REACH - 0.4) {
        return { input: { ...NO_INPUT, cursorX: from.x, cursorZ: from.z }, move: 'up' };
      }
      return { input: walk(sim, start.x, start.z) };
    }
    return { input: player.input(tick) };
  };
  return { step };
}

/**
 * Plays an Expedition to the end with the test player, stepping whichever floor is active and
 * taking the stairs as it says. `onMove` hears each trip, for a replay's log.
 */
export function playDive(
  expedition: Expedition,
  onStep?: (input: InputState) => InputState,
  onMove?: (move: 'down' | 'up') => void,
  limit = 60 * 1800,
): void {
  const bot = diver(expedition);
  for (let tick = 0; tick < limit && !expedition.surface.ended; tick++) {
    const { input, move } = bot.step(tick);
    const sim = expedition.active;
    sim.step(onStep ? onStep(input) : input);
    if (expedition.below) expedition.settle();
    if (move === 'down' && expedition.descend()) onMove?.('down');
    else if (move === 'up' && expedition.below) {
      expedition.ascend();
      onMove?.('up');
    }
  }
}

/**
 * A challenge day played whole by the test player under its rules: an Expedition dived to the
 * bottom, any other field played through the same way. The caller disposes of the day.
 */
export function playChallengeDay(level: LevelDefinition, mode: ModeId): Expedition {
  const rules = MODES[mode];
  const day = new Expedition(
    new Simulation(level, { endsWhen: rules.endsWhen, growth: rules.growth }),
  );
  // The diver is the greedy player wherever there are no stairs, with its sidestep for a Warden
  // pinned on a wall's corner, which hand-built walls make likely.
  playDive(day);
  return day;
}
