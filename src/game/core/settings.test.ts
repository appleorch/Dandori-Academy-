import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, parseSettings, writeSettings } from './settings';

describe('settings', () => {
  it('defaults every missing or invalid field', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ shadows: false, healthBars: 'no', zoomSpeed: 'fast' })).toEqual({
      ...DEFAULT_SETTINGS,
      shadows: false,
    });
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
    const custom = { ...DEFAULT_SETTINGS, carrierCounts: false, zoomSpeed: 2 };
    expect(writeSettings(storage, custom)).toBe(true);
    expect(loadSettings(storage)).toEqual(custom);
    stored = '{broken';
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });
});
