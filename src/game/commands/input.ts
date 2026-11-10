/** One simulation step's worth of player commands. */
export interface InputState {
  moveX: number;
  moveZ: number;
  cursorX: number;
  cursorZ: number;
  throwHeld: boolean;
  whistleHeld: boolean;
  dismiss: boolean;
}

export const NO_INPUT: InputState = {
  moveX: 0,
  moveZ: 0,
  cursorX: 0,
  cursorZ: 0,
  throwHeld: false,
  whistleHeld: false,
  dismiss: false,
};

const MIN_ZOOM = 14;
const MAX_ZOOM = 44;

/** Collects keyboard and pointer state from the DOM and turns it into InputState. */
export class InputController {
  /** Pointer position in normalised device coordinates. */
  pointerX = 0;
  pointerY = 0;
  zoom = 26;
  private readonly keys = new Set<string>();
  private leftDown = false;
  private rightDown = false;
  private dismissQueued = false;

  /** Starts listening. Returns a function that removes every listener. */
  attach(element: HTMLElement): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code === 'KeyQ' && !event.repeat) this.dismissQueued = true;
      if (event.code === 'Space') event.preventDefault();
      this.keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      this.keys.delete(event.code);
    };
    const onPointerMove = (event: PointerEvent): void => {
      const rect = element.getBoundingClientRect();
      this.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onPointerDown = (event: PointerEvent): void => {
      onPointerMove(event);
      if (event.button === 0) this.leftDown = true;
      if (event.button === 2) this.rightDown = true;
    };
    const onPointerUp = (event: PointerEvent): void => {
      if (event.button === 0) this.leftDown = false;
      if (event.button === 2) this.rightDown = false;
    };
    const onWheel = (event: WheelEvent): void => {
      this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom + event.deltaY * 0.02));
    };
    const onContextMenu = (event: Event): void => event.preventDefault();
    const onBlur = (): void => {
      this.keys.clear();
      this.leftDown = false;
      this.rightDown = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('blur', onBlur);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('wheel', onWheel, { passive: true });
    element.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('blur', onBlur);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('contextmenu', onContextMenu);
    };
  }

  /** Builds the commands for one step. The dismiss press is consumed by the first step that reads it. */
  sample(cursorX: number, cursorZ: number): InputState {
    const { keys } = this;
    const right = keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0;
    const left = keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0;
    const down = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0;
    const up = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
    const dismiss = this.dismissQueued;
    this.dismissQueued = false;
    return {
      moveX: right - left,
      moveZ: down - up,
      cursorX,
      cursorZ,
      throwHeld: this.leftDown,
      whistleHeld: this.rightDown || keys.has('Space'),
      dismiss,
    };
  }
}
