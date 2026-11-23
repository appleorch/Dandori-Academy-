import { describe, expect, it } from 'vitest';
import {
  cleanWardenName,
  defaultWardenName,
  DEFAULT_SETTINGS,
  loadSettings,
  newPlayerId,
  parseSettings,
  WARDEN_NAME_MAX,
  writeSettings,
} from './settings';

describe('settings', () => {
  it('defaults every missing or invalid field', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ graphics: 'medium', healthBars: 'no', zoomSpeed: 'fast' })).toEqual({
      ...DEFAULT_SETTINGS,
      graphics: 'medium',
    });
    expect(parseSettings({ graphics: 'ultra' }).graphics).toBe(DEFAULT_SETTINGS.graphics);
  });

  it('turns the old shadows switch into a graphics level', () => {
    expect(parseSettings({ shadows: false }).graphics).toBe('low');
    expect(parseSettings({ shadows: true }).graphics).toBe('auto');
  });

  it('clamps volumes to 0..1', () => {
    expect(parseSettings({ sfxVolume: 4, musicVolume: -1 })).toMatchObject({
      sfxVolume: 1,
      musicVolume: 0,
    });
  });

  it('clamps zoom speed', () => {
    expect(parseSettings({ zoomSpeed: 50 }).zoomSpeed).toBe(3);
    expect(parseSettings({ zoomSpeed: 0 }).zoomSpeed).toBe(0.25);
  });

  it('round-trips through storage and survives corrupt data', () => {
    let stored: string | null = null;
    const storage = {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    };
    const custom = {
      ...DEFAULT_SETTINGS,
      carrierCounts: false,
      zoomSpeed: 2,
      graphics: 'low' as const,
    };
    expect(writeSettings(storage, custom)).toBe(true);
    expect(loadSettings(storage)).toEqual(custom);
    stored = '{broken';
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('Warden names for the board', () => {
  it('keeps ordinary names and tidies their spacing', () => {
    expect(cleanWardenName('  Ada  Lovelace ')).toBe('Ada Lovelace');
    expect(cleanWardenName("O'Brien-2")).toBe("O'Brien-2");
    expect(cleanWardenName('Zoë')).toBe('Zoë');
  });

  it('refuses markup, empty names and leading marks, and cuts long ones', () => {
    expect(cleanWardenName('<b>hi</b>')).toBeNull();
    expect(cleanWardenName('   ')).toBeNull();
    expect(cleanWardenName('-dash')).toBeNull();
    expect(cleanWardenName('a'.repeat(40))).toHaveLength(WARDEN_NAME_MAX);
  });

  it('gives every browser its own player id and a name to go with it', () => {
    const id = newPlayerId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(newPlayerId()).not.toBe(id);
    expect(defaultWardenName('ab12cd34ef567890')).toBe('Warden AB12');
    expect(parseSettings({ playerId: id, wardenName: 'Ada', postRuns: false })).toMatchObject({
      playerId: id,
      wardenName: 'Ada',
      postRuns: false,
    });
    expect(parseSettings({ playerId: 'nope', wardenName: '<x>' })).toMatchObject({
      playerId: '',
      wardenName: '',
      postRuns: true,
    });
  });
});
