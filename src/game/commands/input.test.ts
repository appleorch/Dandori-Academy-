import { describe, expect, it } from 'vitest';
import { InputController } from './input';

describe('InputController', () => {
  it('turns the joystick into movement, ignoring a resting thumb', () => {
    const input = new InputController();
    input.stickX = 0.1;
    input.stickZ = -0.1;
    expect(input.sample(0, 0)).toMatchObject({ moveX: 0, moveZ: 0 });
    input.stickX = 0.8;
    input.stickZ = -0.6;
    expect(input.sample(0, 0)).toMatchObject({ moveX: 0.8, moveZ: -0.6 });
  });

  it('holds the whistle while its button is down and passes the cursor through', () => {
    const input = new InputController();
    input.whistleButton = true;
    expect(input.sample(3, -4)).toMatchObject({ whistleHeld: true, cursorX: 3, cursorZ: -4 });
    input.releaseTouchControls();
    expect(input.sample(0, 0).whistleHeld).toBe(false);
    expect(input.aimOffset).toBeNull();
  });

  it('delivers charge and dismiss presses exactly once', () => {
    const input = new InputController();
    input.queueRush();
    input.queueDismiss();
    expect(input.sample(0, 0)).toMatchObject({ rush: true, dismiss: true });
    expect(input.sample(0, 0)).toMatchObject({ rush: false, dismiss: false });
  });

  it('starts tall screens zoomed further out', () => {
    const portrait = InputController.forScreen(390, 844);
    const landscape = InputController.forScreen(1280, 720);
    expect(portrait.zoom).toBeGreaterThan(landscape.zoom);
  });
});
