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
  ['healthBars', 'Health bars', 'Show a wounded Mossback’s health.'],
  ['pauseOnBlur', 'Pause when away', 'Pause the day when you switch to another tab or window.'],
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
      <label className="setting" htmlFor="setting-zoomSpeed">
        <span className="setting-text">
          <strong>Zoom speed</strong>
          <small>How far each turn of the mouse wheel zooms.</small>
        </span>
        <span className="range">
          <input
            id="setting-zoomSpeed"
            type="range"
            min={ZOOM_SPEED_MIN}
            max={ZOOM_SPEED_MAX}
            step={0.25}
            value={settings.zoomSpeed}
            onChange={(event) => updateSettings({ zoomSpeed: Number(event.target.value) })}
          />
          <output htmlFor="setting-zoomSpeed">{settings.zoomSpeed.toFixed(2)}×</output>
        </span>
      </label>
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
