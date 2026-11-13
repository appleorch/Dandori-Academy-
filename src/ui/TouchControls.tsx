import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { InputController } from '../game/commands/input';
import { CAPTAIN } from '../game/core/config';

/** How far the joystick knob travels from the centre, in pixels. */
const STICK_TRAVEL = 44;
/** World units of aim per pixel dragged from the whistle button. */
const AIM_UNITS_PER_PIXEL = 0.07;

/**
 * On-screen controls for touch: a joystick to move, a whistle button that also
 * aims when dragged, and charge and dismiss buttons. Throwing is done by touching
 * the play field itself.
 */
export function TouchControls({ input }: { input: InputController }) {
  const knob = useRef<HTMLDivElement>(null);
  const whistleOrigin = useRef({ x: 0, y: 0 });

  useEffect(() => () => input.releaseTouchControls(), [input]);

  const moveStick = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > STICK_TRAVEL) {
      dx *= STICK_TRAVEL / length;
      dy *= STICK_TRAVEL / length;
    }
    input.stickX = dx / STICK_TRAVEL;
    input.stickZ = dy / STICK_TRAVEL;
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const releaseStick = (): void => {
    input.stickX = 0;
    input.stickZ = 0;
    if (knob.current) knob.current.style.transform = '';
  };

  const aimWhistle = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    let x = (event.clientX - whistleOrigin.current.x) * AIM_UNITS_PER_PIXEL;
    let z = (event.clientY - whistleOrigin.current.y) * AIM_UNITS_PER_PIXEL;
    const length = Math.hypot(x, z);
    if (length > CAPTAIN.cursorRange) {
      x *= CAPTAIN.cursorRange / length;
      z *= CAPTAIN.cursorRange / length;
    }
    input.aimOffset = { x, z };
  };
  const releaseWhistle = (): void => {
    input.whistleButton = false;
    input.aimOffset = null;
  };

  return (
    <div className="touch-controls">
      <div
        className="stick"
        role="application"
        aria-label="Move joystick"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          moveStick(event);
        }}
        onPointerMove={moveStick}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
      >
        <div ref={knob} className="stick-knob" />
      </div>
      <div className="touch-buttons">
        <button
          type="button"
          className="touch-button dismiss"
          onPointerDown={() => input.queueDismiss()}
        >
          Dismiss
        </button>
        <button
          type="button"
          className="touch-button charge"
          onPointerDown={() => input.queueRush()}
        >
          Charge
        </button>
        <button
          type="button"
          className="touch-button whistle"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            whistleOrigin.current = { x: event.clientX, y: event.clientY };
            input.whistleButton = true;
            input.aimOffset = { x: 0, z: 0 };
          }}
          onPointerMove={aimWhistle}
          onPointerUp={releaseWhistle}
          onPointerCancel={releaseWhistle}
        >
          Whistle
          <small>drag to aim</small>
        </button>
      </div>
    </div>
  );
}
