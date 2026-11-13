/** Player preferences. Stored per browser, separate from progress. */
export interface Settings {
  shadows: boolean;
  carrierCounts: boolean;
  healthBars: boolean;
  /** Multiplier on mouse-wheel zoom. */
  zoomSpeed: number;
  pauseOnBlur: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  shadows: true,
  carrierCounts: true,
  healthBars: true,
  zoomSpeed: 1,
  pauseOnBlur: true,
};

export const ZOOM_SPEED_MIN = 0.25;
export const ZOOM_SPEED_MAX = 3;

const STORAGE_KEY = 'dandori-academy-settings';

export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Builds settings from untrusted data, keeping each valid field and defaulting the rest. */
export function parseSettings(value: unknown): Settings {
  const settings = { ...DEFAULT_SETTINGS };
  if (typeof value !== 'object' || value === null) return settings;
  const raw = value as Record<string, unknown>;
  for (const key of ['shadows', 'carrierCounts', 'healthBars', 'pauseOnBlur'] as const) {
    if (typeof raw[key] === 'boolean') settings[key] = raw[key];
  }
  if (typeof raw.zoomSpeed === 'number' && Number.isFinite(raw.zoomSpeed)) {
    settings.zoomSpeed = Math.min(ZOOM_SPEED_MAX, Math.max(ZOOM_SPEED_MIN, raw.zoomSpeed));
  }
  return settings;
}

export function loadSettings(storage: SettingsStorage): Settings {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null ? { ...DEFAULT_SETTINGS } : parseSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
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
