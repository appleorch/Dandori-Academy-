import { describe, expect, it } from 'vitest';
import { wheelSlot } from '../game/commands/input';
import { ACTIONS, DEFAULT_BINDINGS, PAD } from '../game/commands/bindings';
import { MANUAL, TIPS, tipFor } from './manual';
import { EXTRA_SCREENS, MODE_SCREENS } from './MenuNav';

describe('the kind wheel', () => {
  it('points up, right, down and left at the four kinds, and at nothing near the centre', () => {
    expect(wheelSlot(0, -1)).toBe(0);
    expect(wheelSlot(1, 0)).toBe(1);
    expect(wheelSlot(0, 1)).toBe(2);
    expect(wheelSlot(-1, 0)).toBe(3);
    expect(wheelSlot(0.3, -0.9)).toBe(0);
    expect(wheelSlot(0.1, 0.1)).toBeNull();
  });

  it('opens from D-pad right by default, and every action has a binding entry', () => {
    expect(DEFAULT_BINDINGS.pad.kindWheel).toBe(PAD.right);
    for (const action of ACTIONS) {
      expect(DEFAULT_BINDINGS.keys[action], action).toBeDefined();
      expect(DEFAULT_BINDINGS.pad[action], action).not.toBeUndefined();
    }
    const pads = ACTIONS.map((action) => DEFAULT_BINDINGS.pad[action]).filter((b) => b !== null);
    expect(new Set(pads).size).toBe(pads.length);
  });
});

describe('the menus', () => {
  it('offers four ways to play and the Extras, with no screen in both', () => {
    expect(MODE_SCREENS.map(([screen]) => screen)).toEqual([
      'camp',
      'map',
      'challenges',
      'battles',
    ]);
    const extras = EXTRA_SCREENS.map(([screen]) => screen);
    for (const screen of [
      'journal',
      'guide',
      'leaderboard',
      'achievements',
      'wardrobe',
      'settings',
    ] as const) {
      expect(extras).toContain(screen);
    }
    expect(extras.some((screen) => MODE_SCREENS.some(([mode]) => mode === screen))).toBe(false);
  });
});

describe('the manual and the tips', () => {
  it('has a page with a picture for every mechanic, and tips that cycle', () => {
    const ids = MANUAL.map((page) => page.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['throw', 'whistle', 'kinds', 'carry', 'beasts', 'gates', 'day', 'story'])
      expect(ids).toContain(id);
    for (const page of MANUAL) expect(page.lines.length).toBeGreaterThan(0);
    expect(TIPS.length).toBeGreaterThan(8);
    expect(tipFor(0)).toBe(TIPS[0]);
    expect(tipFor(1000 * TIPS.length + 1000)).toBe(TIPS[1]);
  });
});

describe('the kind wheel on the keyboard', () => {
  it('opens while its key is held, points where the mouse leans, and chooses on letting go', async () => {
    const { InputController } = await import('../game/commands/input');
    const input = new InputController();
    const keys = (input as unknown as { keys: Set<string> }).keys;
    keys.add('KeyZ');
    input.pointerX = 0.8;
    input.pointerY = 0;
    input.update(1 / 60);
    expect(input.wheel()).toEqual({ open: true, pick: 1 });
    keys.delete('KeyZ');
    input.update(1 / 60);
    expect(input.wheel().open).toBe(false);
    const selected = (input as unknown as { selectQueued: string | null }).selectQueued;
    expect(selected).toBe('dew');
  });
});
