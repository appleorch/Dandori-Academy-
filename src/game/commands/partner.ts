import { CAPTAIN } from '../core/config';
import { DEFAULT_BINDINGS } from './bindings';
import { PadReader, type PadSnapshot } from './gamepad';
import { NO_INPUT, type InputState } from './input';

/**
 * Local co-op's second player, on a gamepad of their own with the default layout: the left
 * stick walks, the right stick aims round their Warden, RT throws, LT whistles, A charges, B
 * dismisses, LB and RB change kind. The first player keeps the keyboard and mouse (and, with
 * two pads plugged in, the first pad).
 */
export class PartnerPad {
  private readonly reader = new PadReader();
  private aim = { x: 0, z: 3 };

  /** The pads the first player's controls should read, and the second player's own pad. */
  static share(pads: readonly PadSnapshot[]): {
    first: PadSnapshot[];
    partner: PadSnapshot | null;
  } {
    if (pads.length === 0) return { first: [], partner: null };
    return { first: pads.slice(0, -1), partner: pads[pads.length - 1] };
  }

  /** The second player's input this step, aimed round their Warden at (x, z). */
  sample(pad: PadSnapshot | null, x: number, z: number): InputState {
    if (!pad) return { ...NO_INPUT, cursorX: x + this.aim.x, cursorZ: z + this.aim.z };
    const frame = this.reader.read([pad], DEFAULT_BINDINGS);
    const stick = frame.aim;
    if (stick.x !== 0 || stick.z !== 0) {
      this.aim = { x: stick.x * CAPTAIN.cursorRange, z: stick.z * CAPTAIN.cursorRange };
    } else if (frame.move.x !== 0 || frame.move.z !== 0) {
      const length = Math.hypot(frame.move.x, frame.move.z);
      this.aim = { x: (frame.move.x / length) * 5, z: (frame.move.z / length) * 5 };
    }
    const pressed = frame.pressed;
    return {
      moveX: frame.move.x,
      moveZ: frame.move.z,
      cursorX: x + this.aim.x,
      cursorZ: z + this.aim.z,
      throwHeld: frame.held.has('throw'),
      whistleHeld: frame.held.has('whistle'),
      dismiss: pressed.has('dismiss'),
      rush: pressed.has('charge'),
      cycleKind: pressed.has('nextKind'),
      cycleBack: pressed.has('prevKind'),
      selectKind: null,
    };
  }
}

/** The buttons the second player uses, for the co-op help line. */
export const PARTNER_HELP =
  'Player 2 (gamepad): left stick walks, right stick aims, RT throws, LT whistles, A charges, B dismisses, LB/RB change kind.';
