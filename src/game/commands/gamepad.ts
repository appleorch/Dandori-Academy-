import { ACTIONS, type Action, type Bindings } from './bindings';

/**
 * Gamepads, read through the browser's Gamepad API. The browser hands over a fresh snapshot of
 * every pad each frame; PadReader turns those snapshots into actions held and pressed, through
 * the player's bindings. Everything here is plain data, so it is tested without a browser.
 */

/** A pad as read in one frame: button values from 0 to 1, and stick axes from -1 to 1. */
export interface PadSnapshot {
  buttons: readonly number[];
  axes: readonly number[];
}

/** Stick travel ignored around the centre, so a resting thumb or a worn stick does nothing. */
export const STICK_DEADZONE = 0.22;
/** How far a trigger or button must go down to count as pressed. */
export const PRESS_THRESHOLD = 0.4;

export interface Vec {
  x: number;
  z: number;
}

/**
 * A stick's position with a round dead zone, rescaled so movement starts from zero at the edge
 * of the dead zone and reaches full at full travel. Up on the stick is minus z: up the screen.
 */
export function readStick(x: number, y: number, deadzone = STICK_DEADZONE): Vec {
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length <= deadzone) return { x: 0, z: 0 };
  const scaled = Math.min(1, (length - deadzone) / (1 - deadzone));
  return { x: (x / length) * scaled, z: (y / length) * scaled };
}

/** Copies what is needed from the browser's live Gamepad objects. */
export function snapshotPads(pads: readonly (Gamepad | null)[]): PadSnapshot[] {
  const out: PadSnapshot[] = [];
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    out.push({ buttons: pad.buttons.map((button) => button.value), axes: [...pad.axes] });
  }
  return out;
}

/** Every pad the browser knows of, or none where the Gamepad API is missing. */
export function connectedPads(): PadSnapshot[] {
  try {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
    return snapshotPads(navigator.getGamepads());
  } catch {
    return [];
  }
}

export interface PadFrame {
  /** Left stick: movement. Buttons bound to movement are in `held` instead. */
  move: Vec;
  /** Right stick: aim, from -1 to 1 on each axis. */
  aim: Vec;
  /** Actions whose button is down. */
  held: Set<Action>;
  /** Actions whose button went down since the last read. */
  pressed: Set<Action>;
  /** Raw buttons that went down since the last read, for menus and rebinding. */
  buttonsPressed: number[];
  /** Whether anything on any pad was used this frame. */
  active: boolean;
}

/**
 * Turns pad snapshots into a frame of actions. It remembers which buttons were down last time,
 * so each press is reported once. Several pads count as one: any of them can press a button,
 * and the stick pushed furthest wins.
 */
export class PadReader {
  private down: boolean[] = [];

  read(pads: readonly PadSnapshot[], bindings: Bindings): PadFrame {
    const buttons: boolean[] = [];
    let move: Vec = { x: 0, z: 0 };
    let aim: Vec = { x: 0, z: 0 };
    for (const pad of pads) {
      pad.buttons.forEach((value, i) => {
        if (value > PRESS_THRESHOLD) buttons[i] = true;
      });
      const left = readStick(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      const right = readStick(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
      if (Math.hypot(left.x, left.z) > Math.hypot(move.x, move.z)) move = left;
      if (Math.hypot(right.x, right.z) > Math.hypot(aim.x, aim.z)) aim = right;
    }
    const buttonsPressed: number[] = [];
    const size = Math.max(buttons.length, this.down.length);
    for (let i = 0; i < size; i++) {
      if (buttons[i] && !this.down[i]) buttonsPressed.push(i);
    }
    this.down = buttons;

    const held = new Set<Action>();
    const pressed = new Set<Action>();
    for (const action of ACTIONS) {
      const button = bindings.pad[action];
      if (button === null) continue;
      if (buttons[button]) held.add(action);
      if (buttonsPressed.includes(button)) pressed.add(action);
    }
    const active =
      buttons.some(Boolean) || move.x !== 0 || move.z !== 0 || aim.x !== 0 || aim.z !== 0;
    return { move, aim, held, pressed, buttonsPressed, active };
  }

  /** Forgets what was down, so a button held across a screen change is not seen as new. */
  reset(): void {
    this.down = [];
  }

  /** Treats every button down now as already seen. */
  absorb(pads: readonly PadSnapshot[]): void {
    const buttons: boolean[] = [];
    for (const pad of pads) {
      pad.buttons.forEach((value, i) => {
        if (value > PRESS_THRESHOLD) buttons[i] = true;
      });
    }
    this.down = buttons;
  }
}
