import { useGameStore } from '../game/core/gameStore';
import {
  DEFAULT_SETTINGS,
  ZOOM_SPEED_MAX,
  ZOOM_SPEED_MIN,
  type Settings,
} from '../game/core/settings';

type ToggleKey = 'shadows' | 'carrierCounts' | 'healthBars' | 'pauseOnBlur';

const TOGGLES: readonly (readonly [ToggleKey, string, string])[] = [
  ['shadows', 'Shadows', 'Turn off for a smoother frame rate on slower computers.'],
  ['carrierCounts', 'Carrier counts', 'Show carriers held and needed above each Sunshard.'],
  ['healthBars', 'Health bars', 'Show a wounded enemy’s health.'],
  ['pauseOnBlur', 'Pause when away', 'Pause the day when you switch to another tab or window.'],
];

type RangeKey = 'sfxVolume' | 'musicVolume' | 'zoomSpeed';

interface RangeSetting {
  key: RangeKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;

const RANGES: readonly RangeSetting[] = [
  {
    key: 'sfxVolume',
    label: 'Sound effects',
    hint: 'Throws, whistles, bites and deliveries.',
    min: 0,
    max: 1,
    step: 0.05,
    format: percent,
  },
  {
    key: 'musicVolume',
    label: 'Music',
    hint: 'The tune that plays during a day.',
    min: 0,
    max: 1,
    step: 0.05,
    format: percent,
  },
  {
    key: 'zoomSpeed',
    label: 'Zoom speed',
    hint: 'How far each turn of the mouse wheel zooms.',
    min: ZOOM_SPEED_MIN,
    max: ZOOM_SPEED_MAX,
    step: 0.25,
    format: (value) => `${value.toFixed(2)}×`,
  },
];

/** Game preferences. Changes apply immediately and are remembered in this browser. */
export function SettingsPanel() {
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const isDefault = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).every(
    (key) => settings[key] === DEFAULT_SETTINGS[key],
  );

  return (
    <section className="settings" aria-labelledby="settings-heading">
      <h2 id="settings-heading">Settings</h2>
      {TOGGLES.map(([key, label, hint]) => (
        <label key={key} className="setting" htmlFor={`setting-${key}`}>
          <span className="setting-text">
            <strong>{label}</strong>
            <small>{hint}</small>
          </span>
          <input
            id={`setting-${key}`}
            type="checkbox"
            role="switch"
            checked={settings[key]}
            onChange={(event) => updateSettings({ [key]: event.target.checked })}
          />
        </label>
      ))}
      {RANGES.map(({ key, label, hint, min, max, step, format }) => (
        <label key={key} className="setting" htmlFor={`setting-${key}`}>
          <span className="setting-text">
            <strong>{label}</strong>
            <small>{hint}</small>
          </span>
          <span className="range">
            <input
              id={`setting-${key}`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              onChange={(event) => updateSettings({ [key]: Number(event.target.value) })}
            />
            <output htmlFor={`setting-${key}`}>{format(settings[key])}</output>
          </span>
        </label>
      ))}
      <button
        type="button"
        className="secondary small"
        disabled={isDefault}
        onClick={() => updateSettings(DEFAULT_SETTINGS)}
      >
        Restore default settings
      </button>
    </section>
  );
}
