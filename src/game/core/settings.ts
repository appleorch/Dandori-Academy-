import { DIFFICULTIES, type Difficulty } from './difficulty';

/**
 * Rendering quality. Low: no shadows or effects. Medium: shadows, bloom, tilt-shift
 * and vignette. High: adds ambient occlusion, sharper shadows and full resolution.
 */
export const GRAPHICS_LEVELS = ['low', 'medium', 'high'] as const;
export type GraphicsLevel = (typeof GRAPHICS_LEVELS)[number];

/** Player preferences. Stored per browser, separate from progress. */
export interface Settings {
  graphics: GraphicsLevel;
  /** Mode chosen on the lesson list. */
  difficulty: Difficulty;
  carrierCounts: boolean;
  healthBars: boolean;
  /** Multiplier on mouse-wheel zoom. */
  zoomSpeed: number;
  pauseOnBlur: boolean;
  /** Sound effect volume, 0 to 1. */
  sfxVolume: number;
  /** Music volume, 0 to 1. */
  musicVolume: number;
  /** Proctor Ashwick's advice during a day. */
  hints: boolean;
  /** The story briefing shown before each day begins. */
  briefings: boolean;
  /** Set once the prologue has been read or skipped. */
  seenIntro: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  graphics: 'high',
  difficulty: 'normal',
  carrierCounts: true,
  healthBars: true,
  zoomSpeed: 1,
  pauseOnBlur: true,
  sfxVolume: 0.7,
  musicVolume: 0.35,
  hints: true,
  briefings: true,
  seenIntro: false,
};

export const ZOOM_SPEED_MIN = 0.25;
export const ZOOM_SPEED_MAX = 3;

const STORAGE_KEY = 'dandori-academy-settings';

export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Builds settings from untrusted data, keeping each valid field and defaulting the rest. */
export function parseSettings(value: unknown, defaults: Settings = DEFAULT_SETTINGS): Settings {
  const settings = { ...defaults };
  if (typeof value !== 'object' || value === null) return settings;
  const raw = value as Record<string, unknown>;
  settings.difficulty = DIFFICULTIES.find((mode) => mode === raw.difficulty) ?? settings.difficulty;
  const graphics = GRAPHICS_LEVELS.find((level) => level === raw.graphics);
  // Settings saved before quality levels existed had a shadows switch instead.
  if (graphics) settings.graphics = graphics;
  else if (raw.shadows === false) settings.graphics = 'low';
  for (const key of [
    'carrierCounts',
    'healthBars',
    'pauseOnBlur',
    'hints',
    'briefings',
    'seenIntro',
  ] as const) {
    if (typeof raw[key] === 'boolean') settings[key] = raw[key];
  }
  if (typeof raw.zoomSpeed === 'number' && Number.isFinite(raw.zoomSpeed)) {
    settings.zoomSpeed = Math.min(ZOOM_SPEED_MAX, Math.max(ZOOM_SPEED_MIN, raw.zoomSpeed));
  }
  for (const key of ['sfxVolume', 'musicVolume'] as const) {
    const volume = raw[key];
    if (typeof volume === 'number' && Number.isFinite(volume)) {
      settings[key] = Math.min(1, Math.max(0, volume));
    }
  }
  return settings;
}

export function loadSettings(
  storage: SettingsStorage,
  defaults: Settings = DEFAULT_SETTINGS,
): Settings {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null ? { ...defaults } : parseSettings(JSON.parse(raw), defaults);
  } catch {
    return { ...defaults };
  }
}

export function writeSettings(storage: SettingsStorage, settings: Settings): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
