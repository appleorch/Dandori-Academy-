import { useEffect } from 'react';
import { PAD, RESERVED_KEY } from '../game/commands/bindings';
import { noteDevice, useInputDevice } from '../game/commands/device';
import { connectedPads, PadReader, readStick } from '../game/commands/gamepad';
import { useGameStore } from '../game/core/gameStore';

/**
 * Menus on a gamepad, and Escape as "back" on the keyboard. The D-pad or left stick moves focus
 * to the nearest control in that direction, A presses it, B goes back, and Menu pauses and
 * resumes a day. While a day is running only Menu is read here: everything else belongs to the
 * game's own input (see InputController.pollPads).
 */

/** Set while the Controls page waits for a button to bind, so pressing it does not also navigate. */
export const padCapture = { active: false };

type Direction = 'up' | 'down' | 'left' | 'right';
const DIRECTIONS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
/** A held direction repeats after this long, then this often. */
const REPEAT_DELAY = 380;
const REPEAT_EVERY = 140;

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function visible(element: HTMLElement): boolean {
  if (element.getClientRects().length === 0) return false;
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.pointerEvents !== 'none';
}

/** The layer a pad can act in: an open dialog, the topmost overlay, or the whole page. */
function activeLayer(): ParentNode {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="alertdialog"], .screen.overlay');
  return dialogs.length > 0 ? dialogs[dialogs.length - 1] : document;
}

function focusables(): HTMLElement[] {
  return [...activeLayer().querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
}

function focus(element: HTMLElement): void {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** The control a pad starts from when nothing is focused: the primary one if marked. */
function startingPoint(candidates: HTMLElement[]): HTMLElement | undefined {
  return (
    candidates.find((element) => element.matches('[data-primary], [autofocus]')) ?? candidates[0]
  );
}

/**
 * The nearest control in a direction from `from`: straight ahead counts for more than off to
 * the side, so moving down a column stays in the column.
 */
export function nearestInDirection(
  from: DOMRect,
  candidates: readonly { rect: DOMRect; index: number }[],
  direction: Direction,
): number | null {
  const d = DIRECTIONS[direction];
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;
  let best: number | null = null;
  let bestScore = Infinity;
  for (const { rect, index } of candidates) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Edge to edge along the direction, so a wide button next to a narrow one is found.
    const along =
      direction === 'down'
        ? rect.top - from.bottom
        : direction === 'up'
          ? from.top - rect.bottom
          : direction === 'right'
            ? rect.left - from.right
            : from.left - rect.right;
    const ahead = (cx - fx) * d.x + (cy - fy) * d.y;
    if (ahead <= 1 || along < -Math.min(from.height, from.width) / 2) continue;
    const across = Math.abs((cx - fx) * d.y + (cy - fy) * d.x);
    const score = Math.max(0, along) + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
}

function move(direction: Direction): void {
  const candidates = focusables();
  if (candidates.length === 0) return;
  const current = document.activeElement as HTMLElement | null;
  if (!current || !candidates.includes(current)) {
    const start = startingPoint(candidates);
    if (start) focus(start);
    return;
  }
  // A slider takes left and right for itself.
  if (
    current instanceof HTMLInputElement &&
    current.type === 'range' &&
    (direction === 'left' || direction === 'right')
  ) {
    nudgeRange(current, direction === 'right' ? 1 : -1);
    return;
  }
  const from = current.getBoundingClientRect();
  const others = candidates
    .map((element, index) => ({ element, rect: element.getBoundingClientRect(), index }))
    .filter(({ element }) => element !== current);
  const index = nearestInDirection(from, others, direction);
  if (index !== null) focus(candidates[index]);
}

/** Steps a range input as the arrow keys would, telling React about the change. */
function nudgeRange(input: HTMLInputElement, steps: number): void {
  const step = Number(input.step) || 1;
  const min = Number(input.min);
  const max = Number(input.max);
  const value = Math.min(max, Math.max(min, Number(input.value) + steps * step));
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, String(value));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function press(): void {
  const candidates = focusables();
  const current = document.activeElement as HTMLElement | null;
  if (current && candidates.includes(current)) {
    current.click();
    return;
  }
  const start = startingPoint(candidates);
  if (start) focus(start);
}

/** Back: out of a paused day's menu, or from any screen to the main menu. */
function back(): void {
  const store = useGameStore.getState();
  if (store.pokerOpen) return;
  if (store.phase === 'playing') {
    if (store.paused) store.resume();
    return;
  }
  if (store.phase === 'results' || store.phase === 'story' || store.phase === 'menu') return;
  store.showScreen('menu');
}

export function usePadNavigation(): void {
  useEffect(() => {
    const reader = new PadReader();
    let raf = 0;
    let held: Direction | null = null;
    let nextRepeat = 0;
    let wasLive = false;

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick);
      const pads = connectedPads();
      useInputDevice.getState().setPadConnected(pads.length > 0);
      if (pads.length === 0) return;
      const store = useGameStore.getState();
      const frame = reader.read(pads, store.settings.bindings);
      if (frame.active) noteDevice('pad');
      if (padCapture.active) {
        held = null;
        return;
      }
      const pressed = new Set(frame.buttonsPressed);
      const pauseButton = store.settings.bindings.pad.pause;
      const pausePressed =
        pressed.has(PAD.menu) || (pauseButton !== null && pressed.has(pauseButton));
      const live =
        store.phase === 'playing' && !store.paused && !store.briefing && !store.pokerOpen;
      if (live) {
        wasLive = true;
        held = null;
        if (pausePressed) store.pause();
        return;
      }
      // Coming out of a running day, the buttons still down were pressed for the game.
      if (wasLive) {
        wasLive = false;
        reader.absorb(pads);
        return;
      }
      if (store.phase === 'playing' && store.briefing && pausePressed) {
        store.beginDay();
        return;
      }
      if (store.phase === 'playing' && store.paused && pausePressed) {
        store.resume();
        return;
      }
      if (pressed.has(PAD.a)) press();
      if (pressed.has(PAD.b)) back();

      // Direction: the D-pad, or the left stick pushed most of the way.
      const stick = readStick(frame.move.x, frame.move.z, 0.5);
      let direction: Direction | null = null;
      const pad = pads.some((p) => (p.buttons[PAD.up] ?? 0) > 0.5)
        ? 'up'
        : pads.some((p) => (p.buttons[PAD.down] ?? 0) > 0.5)
          ? 'down'
          : pads.some((p) => (p.buttons[PAD.left] ?? 0) > 0.5)
            ? 'left'
            : pads.some((p) => (p.buttons[PAD.right] ?? 0) > 0.5)
              ? 'right'
              : null;
      if (pad) direction = pad;
      else if (Math.abs(stick.x) > Math.abs(stick.z) && stick.x !== 0)
        direction = stick.x > 0 ? 'right' : 'left';
      else if (stick.z !== 0) direction = stick.z > 0 ? 'down' : 'up';
      if (direction === null) {
        held = null;
      } else if (direction !== held) {
        held = direction;
        nextRepeat = now + REPEAT_DELAY;
        move(direction);
      } else if (now >= nextRepeat) {
        nextRepeat = now + REPEAT_EVERY;
        move(direction);
      }
    };
    raf = requestAnimationFrame(tick);

    // Escape backs out of menu screens, as B does on a pad.
    const onKey = (event: KeyboardEvent): void => {
      if (event.code !== RESERVED_KEY || event.defaultPrevented) return;
      if (document.querySelector('[role="alertdialog"]')) return;
      const store = useGameStore.getState();
      if (store.phase === 'playing' || store.pokerOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input[type="text"], textarea')) return;
      back();
    };
    const onConnect = (): void => useInputDevice.getState().setPadConnected(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('gamepadconnected', onConnect);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('gamepadconnected', onConnect);
    };
  }, []);
}
