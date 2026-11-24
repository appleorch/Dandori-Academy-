import { copyBindings, DEFAULT_BINDINGS, parseBindings, type Bindings } from '../commands/bindings';
import { DIFFICULTIES, type Difficulty } from './difficulty';
import { LOCALES, type Locale } from '../../i18n/i18n';

/**
 * Rendering quality. Low: no shadows or effects. Medium: shadows, bloom, tilt-shift
 * and vignette. High: adds ambient occlusion, sharper shadows and full resolution.
 */
export const GRAPHICS_LEVELS = ['low', 'medium', 'high'] as const;
export type GraphicsLevel = (typeof GRAPHICS_LEVELS)[number];

/**
 * Colour palettes for the four kinds, hazard rings and medal ranks. The two colour-blind ones
 * keep every pair apart for players with red-green (deuteranopia) or blue-yellow (tritanopia)
 * colour blindness; see rendering/palette.ts.
 */
export const PALETTES = ['default', 'deuteranopia', 'tritanopia'] as const;
export type PaletteName = (typeof PALETTES)[number];

export const UI_SCALE_MIN = 0.9;
export const UI_SCALE_MAX = 1.5;

/** Player preferences. Stored per browser, separate from progress. */
export interface Settings {
  graphics: GraphicsLevel;
  /**
   * Whether the graphics level is settled: the player picked one, or the first day's frame
   * times were measured (see QualityTuner). Until then a slow device may have it lowered once.
   */
  graphicsTuned: boolean;
  /** The language of the menus and the game's text. */
  locale: Locale;
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
  /** Headmaster Sprocket's running commentary. */
  commentary: boolean;
  /** The story briefing shown before each day begins. */
  briefings: boolean;
  /** Set once the prologue has been read or skipped. */
  seenIntro: boolean;
  /** The Warden's outfit (see progression/outfits). */
  outfit: string;
  /** Post each new personal best to the Academy leaderboard by itself. */
  postRuns: boolean;
  /** The name shown on the Academy leaderboard; a generated one is used while empty. */
  wardenName: string;
  /** A random id that tells this player's runs apart on the board, made once per browser. */
  playerId: string;
  /** Keys, mouse buttons and gamepad buttons for every action. */
  bindings: Bindings;
  /** Sticks snap the cursor onto the nearest job in a small cone. */
  aimAssist: boolean;
  /** Colours for the kinds, hazard rings and ranks. */
  palette: PaletteName;
  /** Size of menus and the HUD, from UI_SCALE_MIN to UI_SCALE_MAX. */
  uiScale: number;
  /** No camera shake, punch or hit-stop, calmer particles and no pulsing menus. */
  reducedMotion: boolean;
  /** Solid, outlined HUD panels for reading over busy ground. */
  highContrast: boolean;
  /** Press once to whistle (or fast-forward) and again to stop, instead of holding. */
  whistleToggle: boolean;
  fastToggle: boolean;
  /** Show the throw arc even while whistling or with nobody in the squad. */
  alwaysShowArc: boolean;
}

/** Longest Warden name the board shows. */
export const WARDEN_NAME_MAX = 20;

/** A name the board will show: letters, digits, spaces and a few marks, trimmed; null if none. */
export function cleanWardenName(name: string): string | null {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, WARDEN_NAME_MAX).trim();
  return /^[\p{L}\p{N}][\p{L}\p{N} _.'-]*$/u.test(trimmed) ? trimmed : null;
}

/** The board name for a player with no name of their own: "Warden" and four letters of their id. */
export function defaultWardenName(playerId: string): string {
  return `Warden ${playerId.slice(0, 4).toUpperCase()}`;
}

/** A fresh random player id: 16 hex digits. */
export function newPlayerId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const DEFAULT_SETTINGS: Settings = {
  graphics: 'high',
  graphicsTuned: false,
  locale: 'en',
  difficulty: 'normal',
  carrierCounts: true,
  healthBars: true,
  zoomSpeed: 1,
  pauseOnBlur: true,
  sfxVolume: 0.7,
  musicVolume: 0.35,
  hints: true,
  commentary: true,
  briefings: true,
  seenIntro: false,
  outfit: 'cadet',
  postRuns: true,
  wardenName: '',
  playerId: '',
  bindings: DEFAULT_BINDINGS,
  aimAssist: true,
  palette: 'default',
  uiScale: 1,
  reducedMotion: false,
  highContrast: false,
  whistleToggle: false,
  fastToggle: false,
  alwaysShowArc: false,
};

export const ZOOM_SPEED_MIN = 0.25;
export const ZOOM_SPEED_MAX = 3;

const STORAGE_KEY = 'dandori-academy-settings';

export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Builds settings from untrusted data, keeping each valid field and defaulting the rest. */
export function parseSettings(value: unknown, defaults: Settings = DEFAULT_SETTINGS): Settings {
  const settings = { ...defaults, bindings: copyBindings(defaults.bindings) };
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
    'commentary',
    'briefings',
    'seenIntro',
    'postRuns',
    'graphicsTuned',
    'aimAssist',
    'reducedMotion',
    'highContrast',
    'whistleToggle',
    'fastToggle',
    'alwaysShowArc',
  ] as const) {
    if (typeof raw[key] === 'boolean') settings[key] = raw[key];
  }
  settings.locale = LOCALES.find((locale) => locale === raw.locale) ?? settings.locale;
  if (typeof raw.outfit === 'string') settings.outfit = raw.outfit;
  if (typeof raw.wardenName === 'string')
    settings.wardenName = cleanWardenName(raw.wardenName) ?? '';
  if (typeof raw.playerId === 'string' && /^[0-9a-f]{16}$/.test(raw.playerId)) {
    settings.playerId = raw.playerId;
  }
  if (raw.bindings !== undefined) settings.bindings = parseBindings(raw.bindings);
  settings.palette = PALETTES.find((palette) => palette === raw.palette) ?? settings.palette;
  if (typeof raw.uiScale === 'number' && Number.isFinite(raw.uiScale)) {
    settings.uiScale = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, raw.uiScale));
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
    return raw === null ? parseSettings(null, defaults) : parseSettings(JSON.parse(raw), defaults);
  } catch {
    return parseSettings(null, defaults);
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
