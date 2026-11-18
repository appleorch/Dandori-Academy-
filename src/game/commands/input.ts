import { SPROUT_KINDS, type SproutKind } from '../workers/sprouts';

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
  /** Switch the kind of Sproutling to throw: to the next one in the squad, or to a given kind. */
  cycleKind: boolean;
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
  selectKind: null,
};

const MIN_ZOOM = 14;
const MAX_ZOOM = 60;
const DEFAULT_ZOOM = 26;
/** Tall, narrow screens see little to the sides, so they start further out. */
const PORTRAIT_ZOOM = 38;
const STICK_DEADZONE = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Collects keyboard, mouse and touch state and turns it into InputState.
 *
 * Touch on the play field throws at the touched point and two fingers pinch to
 * zoom. The on-screen joystick and buttons (see TouchControls) drive the public
 * stick, whistle and aim fields directly.
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
   * Cursor position relative to the captain, set while the whistle button is being
   * dragged. Null means the cursor follows the pointer instead.
   */
  aimOffset: { x: number; z: number } | null = null;
  private readonly keys = new Set<string>();
  private leftDown = false;
  private rightDown = false;
  private dismissQueued = false;
  private rushQueued = false;
  private interactQueued = false;
  private cycleQueued = false;
  private selectQueued: SproutKind | null = null;
  /** True while the on-screen fast-forward button is held. */
  fastButton = false;
  /** The tactical view: the camera pulls right out to show the whole course. Toggled with V. */
  tactical = false;

  /** Fast-forward: Shift, or the on-screen button. */
  get fast(): boolean {
    return this.fastButton || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  /** Look at idle Emberlings: Tab. */
  get peek(): boolean {
    return this.keys.has('Tab');
  }

  /** The on-screen counterpart of E: knock, go down or come back up. */
  queueInteract(): void {
    this.interactQueued = true;
  }

  /** True once per press of the interact key (E). */
  takeInteract(): boolean {
    const queued = this.interactQueued;
    this.interactQueued = false;
    return queued;
  }

  /** A controller with a starting zoom that suits the screen's shape. */
  static forScreen(width: number, height: number): InputController {
    const input = new InputController();
    if (height > width) input.zoom = PORTRAIT_ZOOM;
    return input;
  }

  queueRush(): void {
    this.rushQueued = true;
  }

  /** Chooses a kind of Sproutling to throw (a HUD chip). */
  queueSelect(kind: SproutKind): void {
    this.selectQueued = kind;
  }

  /** Switches to the next kind of Sproutling in the squad (the on-screen button). */
  queueCycle(): void {
    this.cycleQueued = true;
  }

  queueDismiss(): void {
    this.dismissQueued = true;
  }

  /** Lets go of every on-screen control, for when they disappear mid-press. */
  releaseTouchControls(): void {
    this.stickX = 0;
    this.stickZ = 0;
    this.whistleButton = false;
    this.fastButton = false;
    this.aimOffset = null;
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
      if (event.code === 'KeyQ' && !event.repeat) this.dismissQueued = true;
      if (event.code === 'KeyF' && !event.repeat) this.rushQueued = true;
      if (event.code === 'KeyE' && !event.repeat) this.interactQueued = true;
      if (event.code === 'KeyC' && !event.repeat) this.cycleQueued = true;
      const digit = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
      if (digit >= 0 && !event.repeat) this.selectQueued = SPROUT_KINDS[digit];
      if (event.code === 'KeyV' && !event.repeat) this.tactical = !this.tactical;
      if (event.code === 'Space' || event.code === 'Tab') event.preventDefault();
      this.keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      this.keys.delete(event.code);
    };
    const aimAt = (event: PointerEvent): void => {
      const rect = element.getBoundingClientRect();
      this.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'touch') {
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
        element.setPointerCapture(event.pointerId);
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.size === 1) {
          aimAt(event);
          this.leftDown = true;
        } else if (touches.size === 2) {
          // A second finger turns the gesture into a pinch and stops the throwing.
          this.leftDown = false;
          pinching = true;
          pinchDistance = touchSpread();
          pinchZoom = this.zoom;
        }
        return;
      }
      aimAt(event);
      if (event.button === 0) this.leftDown = true;
      if (event.button === 2) this.rightDown = true;
      if (event.button === 1) {
        event.preventDefault();
        this.rushQueued = true;
      }
    };
    const onPointerUp = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') {
        if (!touches.delete(event.pointerId)) return;
        this.leftDown = false;
        if (touches.size === 0) pinching = false;
        return;
      }
      if (event.button === 0) this.leftDown = false;
      if (event.button === 2) this.rightDown = false;
    };
    const onWheel = (event: WheelEvent): void => {
      this.zoom = clamp(this.zoom + event.deltaY * 0.02 * this.zoomSpeed, MIN_ZOOM, MAX_ZOOM);
    };
    const onContextMenu = (event: Event): void => event.preventDefault();
    const onBlur = (): void => {
      this.keys.clear();
      this.leftDown = false;
      this.rightDown = false;
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
      this.leftDown = false;
    };
  }

  /** Builds the commands for one step. One-shot presses (dismiss, rush) are consumed by the first step that reads them. */
  sample(cursorX: number, cursorZ: number): InputState {
    const { keys } = this;
    const right = keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0;
    const left = keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0;
    const down = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
    const up = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
    const stick = Math.hypot(this.stickX, this.stickZ) > STICK_DEADZONE ? 1 : 0;
    const dismiss = this.dismissQueued;
    const rush = this.rushQueued;
    const cycleKind = this.cycleQueued;
    const selectKind = this.selectQueued;
    this.dismissQueued = false;
    this.rushQueued = false;
    this.cycleQueued = false;
    this.selectQueued = null;
    return {
      moveX: clamp(right - left + this.stickX * stick, -1, 1),
      moveZ: clamp(down - up + this.stickZ * stick, -1, 1),
      cursorX,
      cursorZ,
      throwHeld: this.leftDown,
      whistleHeld: this.rightDown || keys.has('Space') || this.whistleButton,
      dismiss,
      rush,
      cycleKind,
      selectKind,
    };
  }
}
