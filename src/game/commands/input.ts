import { CAPTAIN } from '../core/config';
import { SPROUT_KINDS, type SproutKind } from '../workers/sprouts';
import {
  actionsForKey,
  DEFAULT_BINDINGS,
  RESERVED_KEY,
  type Action,
  type Bindings,
} from './bindings';
import { noteDevice } from './device';
import { PadReader, type PadFrame, type PadSnapshot, type Vec } from './gamepad';

/** One simulation step's worth of player commands. */
export interface InputState {
  moveX: number;
  moveZ: number;
  cursorX: number;
  cursorZ: number;
  throwHeld: boolean;
  whistleHeld: boolean;
  dismiss: boolean;
  /** Send the whole squad running to the cursor. */
  rush: boolean;
  /** Switch the kind of Sproutling to throw: to the next one in the squad, the previous one, or a given kind. */
  cycleKind: boolean;
  cycleBack: boolean;
  selectKind: SproutKind | null;
}

export const NO_INPUT: InputState = {
  moveX: 0,
  moveZ: 0,
  cursorX: 0,
  cursorZ: 0,
  throwHeld: false,
  whistleHeld: false,
  dismiss: false,
  rush: false,
  cycleKind: false,
  cycleBack: false,
  selectKind: null,
};

const MIN_ZOOM = 14;
const MAX_ZOOM = 60;
const DEFAULT_ZOOM = 26;
/** Tall, narrow screens see little to the sides, so they start further out. */
const PORTRAIT_ZOOM = 38;
const STICK_DEADZONE = 0.2;
/** Zoom units per second while a zoom key or button is held. */
const ZOOM_KEY_RATE = 28;
/** With the right stick at rest, the pad's cursor sits this far ahead of the Warden as they walk. */
const REST_AIM = 5;
/** How quickly the resting cursor swings round to where the Warden walks, per second. */
const REST_AIM_EASE = 6;

/** Actions that happen once per press and wait for the next simulation step to read them. */
const ONE_SHOTS = ['dismiss', 'charge', 'interact', 'nextKind', 'prevKind'] as const;
type OneShot = (typeof ONE_SHOTS)[number];
const KIND_ACTIONS: readonly Action[] = ['kind1', 'kind2', 'kind3', 'kind4'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Keys the browser must not act on while they steer the game (scrolling, focus moves). */
function shouldSwallow(code: string): boolean {
  return code !== RESERVED_KEY && !/^F\d{1,2}$/.test(code);
}

/**
 * Collects keyboard, mouse, gamepad and touch state and turns it into InputState, through the
 * player's bindings (see bindings.ts).
 *
 * Touch on the play field throws at the touched point and two fingers pinch to zoom. The
 * on-screen joystick and buttons (see TouchControls) drive the public stick, whistle and aim
 * fields directly. Gamepads are read once a frame by `pollPads`.
 */
export class InputController {
  /** Pointer position in normalised device coordinates. */
  pointerX = 0;
  pointerY = 0;
  zoom = DEFAULT_ZOOM;
  /** Multiplier on wheel zoom, from the player's settings. */
  zoomSpeed = 1;
  /** Virtual joystick position, each axis from -1 to 1. */
  stickX = 0;
  stickZ = 0;
  /** True while the on-screen whistle button is held. */
  whistleButton = false;
  /**
   * Cursor position relative to the captain, set while the whistle button is being dragged
   * or while a gamepad is aiming. Null means the cursor follows the pointer instead.
   */
  aimOffset: { x: number; z: number } | null = null;
  /** True while the on-screen fast-forward button is held. */
  fastButton = false;
  /** The tactical view: the camera pulls right out to show the whole course. */
  tactical = false;
  /** The player's bindings, from the settings. */
  bindings: Bindings = DEFAULT_BINDINGS;
  /** Press once to start whistling or fast-forwarding and again to stop, instead of holding. */
  whistleToggle = false;
  fastToggle = false;
  /** Snap a stick's aim onto the nearest job in a small cone (see aimAssist.ts). */
  aimAssist = true;
  /**
   * Whether the day is running: presses made while it is paused, briefing or over are dropped
   * and keys are left to the menus. Set by the game loop each frame.
   */
  live = false;
  private readonly keys = new Set<string>();
  /** A finger on the play field, which throws. */
  private touchDown = false;
  private readonly queued = new Set<OneShot>();
  private selectQueued: SproutKind | null = null;
  private whistleLatched = false;
  private fastLatched = false;
  private readonly pad = new PadReader();
  private padFrame: PadFrame | null = null;
  /** The pad's cursor, relative to the Warden, while the pad has the aim. */
  private padAim: Vec = { x: 0, z: -REST_AIM };
  private padHasAim = false;

  /** Fast-forward: held, toggled, or the on-screen button. */
  get fast(): boolean {
    return this.fastButton || (this.fastToggle ? this.fastLatched : this.held('fastForward'));
  }

  /** Look at idle Sproutlings while held. */
  get peek(): boolean {
    return this.held('peek');
  }

  /** Whether a gamepad stick is steering the cursor (so aim assist applies). */
  get padOwnsAim(): boolean {
    return this.padHasAim;
  }

  /** Whether an action's key, mouse button or pad button is down right now. */
  held(action: Action): boolean {
    for (const code of this.bindings.keys[action]) {
      if (code !== null && this.keys.has(code)) return true;
    }
    return this.padFrame?.held.has(action) ?? false;
  }

  /** The on-screen counterpart of the interact key: knock, go down or come back up. */
  queueInteract(): void {
    this.queued.add('interact');
  }

  /** True once per press of the interact key. */
  takeInteract(): boolean {
    const queued = this.queued.has('interact');
    this.queued.delete('interact');
    return queued;
  }

  /** A controller with a starting zoom that suits the screen's shape. */
  static forScreen(width: number, height: number): InputController {
    const input = new InputController();
    if (height > width) input.zoom = PORTRAIT_ZOOM;
    return input;
  }

  queueRush(): void {
    this.queued.add('charge');
  }

  /** Chooses a kind of Sproutling to throw (a HUD chip). */
  queueSelect(kind: SproutKind): void {
    this.selectQueued = kind;
  }

  /** Switches to the next kind of Sproutling in the squad (the on-screen button). */
  queueCycle(): void {
    this.queued.add('nextKind');
  }

  queueDismiss(): void {
    this.queued.add('dismiss');
  }

  /** Lets go of every on-screen control, for when they disappear mid-press. */
  releaseTouchControls(): void {
    this.stickX = 0;
    this.stickZ = 0;
    this.whistleButton = false;
    this.fastButton = false;
    if (!this.padHasAim) this.aimOffset = null;
  }

  /** Drops every press waiting for a step and every latched toggle: the day stopped. */
  clearPresses(): void {
    this.queued.clear();
    this.selectQueued = null;
    this.whistleLatched = false;
    this.fastLatched = false;
  }

  /** Lets go of everything held, as when the window loses focus. */
  releaseAll(): void {
    this.keys.clear();
    this.touchDown = false;
    this.clearPresses();
  }

  /** What a press of an action does at once: queue it for the next step, or flip a toggle. */
  press(action: Action): void {
    if (!this.live) return;
    if ((ONE_SHOTS as readonly Action[]).includes(action)) this.queued.add(action as OneShot);
    const kind = KIND_ACTIONS.indexOf(action);
    if (kind >= 0) this.selectQueued = SPROUT_KINDS[kind];
    if (action === 'tactical') this.tactical = !this.tactical;
    if (action === 'whistle' && this.whistleToggle) this.whistleLatched = !this.whistleLatched;
    if (action === 'fastForward' && this.fastToggle) this.fastLatched = !this.fastLatched;
  }

  private pressCode(code: string): void {
    for (const action of actionsForKey(this.bindings, code)) this.press(action);
  }

  /**
   * Reads the gamepads for this frame: their presses, the left stick's movement and the right
   * stick's aim. With the right stick at rest the cursor swings ahead of the walking Warden.
   */
  pollPads(pads: readonly PadSnapshot[], dt: number): void {
    const frame = this.pad.read(pads, this.bindings);
    this.padFrame = frame;
    if (!frame.active) return;
    noteDevice('pad');
    for (const action of frame.pressed) this.press(action);
    const reach = CAPTAIN.cursorRange;
    const aiming = frame.aim.x !== 0 || frame.aim.z !== 0;
    const walking = frame.move.x !== 0 || frame.move.z !== 0;
    if (aiming) {
      this.padAim = { x: frame.aim.x * reach, z: frame.aim.z * reach };
      this.padHasAim = true;
    } else if (walking) {
      const length = Math.hypot(frame.move.x, frame.move.z);
      const ease = Math.min(1, dt * REST_AIM_EASE);
      const tx = (frame.move.x / length) * REST_AIM;
      const tz = (frame.move.z / length) * REST_AIM;
      if (!this.padHasAim) this.padAim = { x: tx, z: tz };
      this.padAim = {
        x: this.padAim.x + (tx - this.padAim.x) * ease,
        z: this.padAim.z + (tz - this.padAim.z) * ease,
      };
      this.padHasAim = true;
    }
    if (this.padHasAim) this.aimOffset = { ...this.padAim };
  }

  /** Per-frame upkeep that is not tied to simulation steps: zooming with held keys or buttons. */
  update(dt: number): void {
    const zoom = (this.held('zoomOut') ? 1 : 0) - (this.held('zoomIn') ? 1 : 0);
    if (zoom !== 0 && this.live) {
      this.zoom = clamp(this.zoom + zoom * ZOOM_KEY_RATE * dt * this.zoomSpeed, MIN_ZOOM, MAX_ZOOM);
    }
  }

  /** Starts listening. Returns a function that removes every listener. */
  attach(element: HTMLElement): () => void {
    const touches = new Map<number, { x: number; y: number }>();
    let pinching = false;
    let pinchDistance = 1;
    let pinchZoom = this.zoom;
    const touchSpread = (): number => {
      const [a, b] = [...touches.values()];
      return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      noteDevice('keyboard');
      this.keys.add(event.code);
      // Paused, briefing or over: the keys belong to the menus.
      if (!this.live) return;
      const bound = actionsForKey(this.bindings, event.code).length > 0;
      if (bound && shouldSwallow(event.code)) event.preventDefault();
      if (!event.repeat) this.pressCode(event.code);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      this.keys.delete(event.code);
    };
    const aimAt = (event: PointerEvent): void => {
      const rect = element.getBoundingClientRect();
      this.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    /** The mouse takes the aim back from a gamepad once it actually moves. */
    const mouseAims = (): void => {
      noteDevice('keyboard');
      if (this.padHasAim) {
        this.padHasAim = false;
        this.aimOffset = null;
      }
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'touch') {
        if (event.movementX !== 0 || event.movementY !== 0) mouseAims();
        aimAt(event);
        return;
      }
      const touch = touches.get(event.pointerId);
      if (!touch) return;
      touch.x = event.clientX;
      touch.y = event.clientY;
      if (touches.size >= 2) {
        this.zoom = clamp((pinchZoom * pinchDistance) / touchSpread(), MIN_ZOOM, MAX_ZOOM);
      } else if (!pinching) {
        aimAt(event);
      }
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') {
        noteDevice('touch');
        element.setPointerCapture(event.pointerId);
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.size === 1) {
          aimAt(event);
          this.touchDown = true;
        } else if (touches.size === 2) {
          // A second finger turns the gesture into a pinch and stops the throwing.
          this.touchDown = false;
          pinching = true;
          pinchDistance = touchSpread();
          pinchZoom = this.zoom;
        }
        return;
      }
      mouseAims();
      aimAt(event);
      const code = `Mouse${event.button}`;
      // The middle button would otherwise start the browser's autoscroll.
      if (event.button === 1) event.preventDefault();
      this.pressCode(code);
      this.keys.add(code);
    };
    const onPointerUp = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') {
        if (!touches.delete(event.pointerId)) return;
        this.touchDown = false;
        if (touches.size === 0) pinching = false;
        return;
      }
      this.keys.delete(`Mouse${event.button}`);
    };
    const onWheel = (event: WheelEvent): void => {
      this.zoom = clamp(this.zoom + event.deltaY * 0.02 * this.zoomSpeed, MIN_ZOOM, MAX_ZOOM);
    };
    const onContextMenu = (event: Event): void => event.preventDefault();
    const onBlur = (): void => {
      this.releaseAll();
      touches.clear();
      pinching = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onBlur);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('wheel', onWheel, { passive: true });
    element.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onBlur);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('contextmenu', onContextMenu);
      this.releaseAll();
    };
  }

  /** Builds the commands for one step. One-shot presses are consumed by the first step that reads them. */
  sample(cursorX: number, cursorZ: number): InputState {
    const right = this.held('moveRight') ? 1 : 0;
    const left = this.held('moveLeft') ? 1 : 0;
    const down = this.held('moveDown') ? 1 : 0;
    const up = this.held('moveUp') ? 1 : 0;
    const stick = Math.hypot(this.stickX, this.stickZ) > STICK_DEADZONE ? 1 : 0;
    // Pad buttons bound to movement are counted in `held`; the pad's stick adds here.
    const padMove = this.padFrame?.move ?? { x: 0, z: 0 };
    const take = (action: OneShot): boolean => {
      const queued = this.queued.has(action);
      this.queued.delete(action);
      return queued;
    };
    const selectKind = this.selectQueued;
    this.selectQueued = null;
    return {
      moveX: clamp(right - left + this.stickX * stick + padMove.x, -1, 1),
      moveZ: clamp(down - up + this.stickZ * stick + padMove.z, -1, 1),
      cursorX,
      cursorZ,
      throwHeld: this.held('throw') || this.touchDown,
      whistleHeld:
        (this.whistleToggle ? this.whistleLatched : this.held('whistle')) || this.whistleButton,
      dismiss: take('dismiss'),
      rush: take('charge'),
      cycleKind: take('nextKind'),
      cycleBack: take('prevKind'),
      selectKind,
    };
  }
}
