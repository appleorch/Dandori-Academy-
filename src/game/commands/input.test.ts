import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAPTAIN } from '../core/config';
import { assistAim } from './aimAssist';
import {
  ACTIONS,
  actionsForKey,
  bindKey,
  bindPad,
  DEFAULT_BINDINGS,
  findConflicts,
  keyLabel,
  keyName,
  PAD,
  padLabel,
  parseBindings,
  sameBindings,
  unboundKeys,
} from './bindings';
import { PadReader, readStick, snapshotPads, type PadSnapshot } from './gamepad';
import { InputController } from './input';

/** A pad at rest, with the given buttons down (value 1) and stick axes. */
function pad(buttons: number[] = [], axes: [number, number, number, number] = [0, 0, 0, 0]) {
  const values = Array.from({ length: 17 }, (_, i): number => (buttons.includes(i) ? 1 : 0));
  return { buttons: values, axes } satisfies PadSnapshot;
}

/** A controller that counts presses, as it does while a day is running. */
function liveInput(): InputController {
  const input = new InputController();
  input.live = true;
  return input;
}

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

describe('gamepad mapping', () => {
  it('reads sticks with a round dead zone, rescaled to start from zero', () => {
    expect(readStick(0.1, 0.1)).toEqual({ x: 0, z: 0 });
    const full = readStick(1, 0);
    expect(full.x).toBeCloseTo(1);
    expect(full.z).toBeCloseTo(0);
    const half = readStick(0, -0.61);
    expect(half.x).toBeCloseTo(0);
    expect(half.z).toBeCloseTo(-0.5, 2);
    expect(readStick(NaN, 0)).toEqual({ x: 0, z: 0 });
  });

  it('copies only connected pads from the browser', () => {
    const live = {
      connected: true,
      buttons: [{ value: 1 }, { value: 0 }],
      axes: [0.5, 0],
    } as unknown as Gamepad;
    const gone = { ...live, connected: false } as unknown as Gamepad;
    expect(snapshotPads([null, live, gone])).toEqual([{ buttons: [1, 0], axes: [0.5, 0] }]);
  });

  it('reports a button press once, and holds it while down', () => {
    const reader = new PadReader();
    const first = reader.read([pad([PAD.a, PAD.rt])], DEFAULT_BINDINGS);
    expect([...first.pressed].sort()).toEqual(['charge', 'throw']);
    expect(first.held.has('throw')).toBe(true);
    const second = reader.read([pad([PAD.a, PAD.rt])], DEFAULT_BINDINGS);
    expect(second.pressed.size).toBe(0);
    expect(second.held.has('throw')).toBe(true);
    const third = reader.read([pad([])], DEFAULT_BINDINGS);
    expect(third.held.size).toBe(0);
    expect(third.active).toBe(false);
  });

  it('counts a trigger only once it is pulled past the threshold', () => {
    const reader = new PadReader();
    const light = pad();
    light.buttons[PAD.lt] = 0.2;
    expect(reader.read([light], DEFAULT_BINDINGS).held.has('whistle')).toBe(false);
    light.buttons[PAD.lt] = 0.7;
    expect(reader.read([light], DEFAULT_BINDINGS).held.has('whistle')).toBe(true);
  });

  it('maps every button of the default layout to its action', () => {
    const input = liveInput();
    const press = (button: number) => {
      input.pollPads([pad([button])], 1 / 60);
      const state = input.sample(0, 0);
      input.pollPads([pad()], 1 / 60);
      return state;
    };
    expect(press(PAD.a).rush).toBe(true);
    expect(press(PAD.b).dismiss).toBe(true);
    expect(press(PAD.rb).cycleKind).toBe(true);
    expect(press(PAD.lb).cycleBack).toBe(true);
    press(PAD.x);
    input.pollPads([pad([PAD.x])], 1 / 60);
    expect(input.takeInteract()).toBe(true);
    input.pollPads([pad()], 1 / 60);
    expect(input.tactical).toBe(false);
    press(PAD.y);
    expect(input.tactical).toBe(true);

    input.pollPads([pad([PAD.rt, PAD.lt])], 1 / 60);
    expect(input.sample(0, 0)).toMatchObject({ throwHeld: true, whistleHeld: true });
    input.pollPads([pad([PAD.view])], 1 / 60);
    expect(input.fast).toBe(true);
    input.pollPads([pad([PAD.left])], 1 / 60);
    expect(input.peek).toBe(true);
    input.pollPads([pad()], 1 / 60);
    expect(input.fast).toBe(false);
    expect(input.peek).toBe(false);
  });

  it('moves with the left stick and aims with the right, relative to the Warden', () => {
    const input = liveInput();
    input.pollPads([pad([], [0, -1, 1, 0])], 1 / 60);
    const state = input.sample(0, 0);
    expect(state.moveX).toBeCloseTo(0);
    expect(state.moveZ).toBeCloseTo(-1);
    expect(input.padOwnsAim).toBe(true);
    expect(input.aimOffset?.x).toBeCloseTo(CAPTAIN.cursorRange);
    expect(input.aimOffset?.z).toBeCloseTo(0);
  });

  it('swings the cursor ahead of the walking Warden while the right stick rests', () => {
    const input = liveInput();
    for (let i = 0; i < 120; i++) input.pollPads([pad([], [1, 0, 0, 0])], 1 / 60);
    expect(input.aimOffset?.x).toBeGreaterThan(4);
    expect(Math.abs(input.aimOffset?.z ?? 1)).toBeLessThan(0.1);
  });

  it('drops pad presses made while the day is stopped', () => {
    const input = new InputController();
    input.pollPads([pad([PAD.a, PAD.y])], 1 / 60);
    expect(input.sample(0, 0).rush).toBe(false);
    expect(input.tactical).toBe(false);
  });

  it('can toggle the whistle and fast-forward instead of holding them', () => {
    const input = liveInput();
    input.whistleToggle = true;
    input.fastToggle = true;
    input.pollPads([pad([PAD.lt, PAD.view])], 1 / 60);
    input.pollPads([pad()], 1 / 60);
    expect(input.sample(0, 0).whistleHeld).toBe(true);
    expect(input.fast).toBe(true);
    input.pollPads([pad([PAD.lt, PAD.view])], 1 / 60);
    input.pollPads([pad()], 1 / 60);
    expect(input.sample(0, 0).whistleHeld).toBe(false);
    expect(input.fast).toBe(false);
    // Stopping the day lets go of a latched toggle.
    input.pollPads([pad([PAD.lt])], 1 / 60);
    input.clearPresses();
    expect(input.sample(0, 0).whistleHeld).toBe(false);
  });

  it('follows rebound pad buttons', () => {
    const input = liveInput();
    input.bindings = bindPad(DEFAULT_BINDINGS, 'throw', PAD.a).bindings;
    input.pollPads([pad([PAD.a])], 1 / 60);
    const state = input.sample(0, 0);
    expect(state.throwHeld).toBe(true);
    // A was taken from charge, which no longer fires.
    expect(state.rush).toBe(false);
  });
});

describe('keyboard and mouse bindings', () => {
  let element: EventTarget & {
    getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
    setPointerCapture: () => void;
  };
  let detach: () => void;
  let input: InputController;

  const key = (type: 'keydown' | 'keyup', code: string): void => {
    window.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), { code, repeat: false }),
    );
  };
  const mouse = (type: 'pointerdown' | 'pointerup', button: number): void => {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      pointerType: 'mouse',
      button,
      clientX: 0,
      clientY: 0,
    });
    (type === 'pointerdown' ? element : window).dispatchEvent(event);
  };

  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget());
    element = Object.assign(new EventTarget(), {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      setPointerCapture: () => {},
    });
    input = liveInput();
    detach = input.attach(element as unknown as HTMLElement);
  });

  afterEach(() => {
    detach();
    vi.unstubAllGlobals();
  });

  it('plays as before with the default keys and mouse buttons', () => {
    key('keydown', 'KeyW');
    key('keydown', 'KeyD');
    mouse('pointerdown', 0);
    mouse('pointerdown', 2);
    key('keydown', 'KeyF');
    key('keydown', 'KeyQ');
    key('keydown', 'Digit3');
    expect(input.sample(0, 0)).toMatchObject({
      moveX: 1,
      moveZ: -1,
      throwHeld: true,
      whistleHeld: true,
      rush: true,
      dismiss: true,
      selectKind: 'stone',
    });
    mouse('pointerup', 0);
    mouse('pointerup', 2);
    key('keyup', 'KeyW');
    key('keyup', 'KeyD');
    expect(input.sample(0, 0)).toMatchObject({
      moveX: 0,
      moveZ: 0,
      throwHeld: false,
      whistleHeld: false,
    });
    key('keydown', 'KeyX');
    expect(input.sample(0, 0).cycleBack).toBe(true);
  });

  it('uses a rebound key, and the key it was taken from stops working', () => {
    input.bindings = bindKey(DEFAULT_BINDINGS, 'throw', 1, 'KeyF').bindings;
    key('keydown', 'KeyF');
    const state = input.sample(0, 0);
    expect(state.throwHeld).toBe(true);
    expect(state.rush).toBe(false);
    // Middle mouse is still on charge.
    mouse('pointerdown', 1);
    expect(input.sample(0, 0).rush).toBe(true);
  });

  it('can throw from a key and whistle from a mouse button', () => {
    let bindings = bindKey(DEFAULT_BINDINGS, 'throw', 0, 'KeyJ').bindings;
    bindings = bindKey(bindings, 'whistle', 0, 'Mouse0').bindings;
    input.bindings = bindings;
    key('keydown', 'KeyJ');
    mouse('pointerdown', 0);
    expect(input.sample(0, 0)).toMatchObject({ throwHeld: true, whistleHeld: true });
  });

  it('ignores keys while the day is stopped, and lets go of everything on blur', () => {
    input.live = false;
    key('keydown', 'KeyF');
    expect(input.sample(0, 0).rush).toBe(false);
    input.live = true;
    key('keydown', 'Space');
    expect(input.sample(0, 0).whistleHeld).toBe(true);
    window.dispatchEvent(new Event('blur'));
    expect(input.sample(0, 0).whistleHeld).toBe(false);
  });

  it('zooms with held zoom keys', () => {
    const before = input.zoom;
    key('keydown', 'Minus');
    input.update(0.5);
    expect(input.zoom).toBeGreaterThan(before);
    key('keyup', 'Minus');
    key('keydown', 'Equal');
    input.update(0.5);
    input.update(0.5);
    expect(input.zoom).toBeLessThan(before);
  });
});

describe('rebinding', () => {
  it('has no conflicts and every action on a key by default', () => {
    expect(findConflicts(DEFAULT_BINDINGS)).toEqual([]);
    expect(unboundKeys(DEFAULT_BINDINGS)).toEqual([]);
    for (const action of ACTIONS) expect(keyLabel(DEFAULT_BINDINGS, action)).not.toBe('');
  });

  it('moves a key that is already taken, and says where from', () => {
    const { bindings, takenFrom } = bindKey(DEFAULT_BINDINGS, 'dismiss', 0, 'KeyE');
    expect(takenFrom).toEqual(['interact']);
    expect(bindings.keys.dismiss).toEqual(['KeyE', null]);
    expect(bindings.keys.interact).toEqual([null, null]);
    expect(findConflicts(bindings)).toEqual([]);
    expect(unboundKeys(bindings)).toEqual(['interact']);
    // The original is untouched.
    expect(DEFAULT_BINDINGS.keys.interact).toEqual(['KeyE', null]);
  });

  it('moves a key between the two slots of one action without doubling it', () => {
    const { bindings, takenFrom } = bindKey(DEFAULT_BINDINGS, 'whistle', 1, 'Mouse2');
    expect(takenFrom).toEqual([]);
    expect(bindings.keys.whistle).toEqual([null, 'Mouse2']);
  });

  it('clears a slot', () => {
    const { bindings } = bindKey(DEFAULT_BINDINGS, 'pause', 1, null);
    expect(bindings.keys.pause).toEqual(['Escape', null]);
  });

  it('moves pad buttons the same way', () => {
    const { bindings, takenFrom } = bindPad(DEFAULT_BINDINGS, 'tactical', PAD.b);
    expect(takenFrom).toEqual(['dismiss']);
    expect(bindings.pad.dismiss).toBeNull();
    expect(padLabel(bindings, 'tactical')).toBe('B');
    expect(findConflicts(bindings)).toEqual([]);
  });

  it('finds conflicts in bindings that were saved by hand', () => {
    const parsed = parseBindings({
      keys: { throw: ['KeyQ', null] },
      pad: { charge: PAD.b },
    });
    const conflicts = findConflicts(parsed);
    expect(conflicts).toContainEqual({
      input: 'KeyQ',
      device: 'keys',
      actions: ['throw', 'dismiss'],
    });
    expect(conflicts).toContainEqual({
      input: PAD.b,
      device: 'pad',
      actions: ['charge', 'dismiss'],
    });
  });

  it('reads saved bindings back safely, defaulting anything missing or broken', () => {
    expect(sameBindings(parseBindings(undefined), DEFAULT_BINDINGS)).toBe(true);
    const parsed = parseBindings({
      keys: {
        throw: ['KeyT', 'KeyT'],
        whistle: ['<script>', 7],
        dismiss: ['KeyZ'],
        nonsense: ['KeyA', null],
      },
      pad: { throw: 99, charge: null, dismiss: 3.5, interact: PAD.y },
    });
    expect(parsed.keys.throw).toEqual(['KeyT', null]);
    expect(parsed.keys.whistle).toEqual([null, null]);
    expect(parsed.keys.dismiss).toEqual(DEFAULT_BINDINGS.keys.dismiss);
    expect(parsed.pad.throw).toBe(DEFAULT_BINDINGS.pad.throw);
    expect(parsed.pad.charge).toBeNull();
    expect(parsed.pad.dismiss).toBe(DEFAULT_BINDINGS.pad.dismiss);
    expect(parsed.pad.interact).toBe(PAD.y);
    expect(actionsForKey(parsed, 'KeyT')).toEqual(['throw']);
  });

  it('names keys and buttons for people', () => {
    expect(keyName('KeyW')).toBe('W');
    expect(keyName('Digit4')).toBe('4');
    expect(keyName('Mouse2')).toBe('Right mouse');
    expect(keyName('ShiftLeft')).toBe('Left Shift');
    expect(keyName('Numpad7')).toBe('Num 7');
    expect(keyLabel(DEFAULT_BINDINGS, 'whistle')).toBe('Right mouse / Space');
    expect(padLabel(DEFAULT_BINDINGS, 'throw')).toBe('RT');
  });
});

describe('aim assist', () => {
  const from = { x: 0, z: 0 };

  it('snaps onto a job close to the line of aim', () => {
    const snapped = assistAim(from, { x: 6, z: 0 }, [{ x: 7, z: 1.5 }], 10);
    expect(snapped).toEqual({ x: 7, z: 1.5 });
  });

  it('leaves the aim alone when nothing lies in the cone', () => {
    const aimed = { x: 6, z: 0 };
    expect(
      assistAim(
        from,
        aimed,
        [
          { x: 0, z: 6 },
          { x: -6, z: 0 },
        ],
        10,
      ),
    ).toBe(aimed);
  });

  it('prefers the job nearest the line, then the nearer one', () => {
    const spots = [
      { x: 6, z: 1.5 },
      { x: 5, z: 0.2 },
    ];
    expect(assistAim(from, { x: 6, z: 0 }, spots, 10)).toEqual({ x: 5, z: 0.2 });
    const tied = [
      { x: 8, z: 0 },
      { x: 4, z: 0 },
    ];
    expect(assistAim(from, { x: 6, z: 0 }, tied, 10)).toEqual({ x: 4, z: 0 });
  });

  it('ignores jobs out of reach or underfoot', () => {
    const aimed = { x: 6, z: 0 };
    expect(assistAim(from, aimed, [{ x: 30, z: 0 }], 10)).toBe(aimed);
    expect(assistAim(from, aimed, [{ x: 0.5, z: 0 }], 10)).toBe(aimed);
  });
});
