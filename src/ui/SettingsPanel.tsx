import { useGameStore } from '../game/core/gameStore';
import {
  DEFAULT_SETTINGS,
  GRAPHICS_LEVELS,
  ZOOM_SPEED_MAX,
  ZOOM_SPEED_MIN,
  type GraphicsLevel,
  type Settings,
} from '../game/core/settings';

type ToggleKey =
  'carrierCounts' | 'healthBars' | 'pauseOnBlur' | 'hints' | 'commentary' | 'briefings';

const TOGGLES: readonly (readonly [ToggleKey, string, string])[] = [
  ['carrierCounts', 'Carrier counts', 'Show carriers held and needed above each Sunshard.'],
  ['healthBars', 'Health bars', 'Show a wounded enemy’s health.'],
  ['pauseOnBlur', 'Pause when away', 'Pause the day when you switch to another tab or window.'],
  ['hints', 'Advice from Ashwick', 'Short tips during a day about what you may be missing.'],
  [
    'commentary',
    'Headmaster\u2019s commentary',
    'Professor Sprocket\u2019s remarks on chains, relics and emergencies.',
  ],
  ['briefings', 'Briefings', 'Show the story and the lesson\u2019s goals before each day begins.'],
];

const GRAPHICS_HINTS: Record<GraphicsLevel, string> = {
  auto: 'Picks a level for this device, and lowers it if the game runs slowly.',
  low: 'No shadows or effects. Smoothest on slow phones.',
  medium: 'Shadows, glow and the miniature depth-of-field look.',
  high: 'Adds soft ambient shadows in creases and full resolution.',
};

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
    hint: 'Throws, whistles, Sproutling voices and the sounds of each setting.',
    min: 0,
    max: 1,
    step: 0.05,
    format: percent,
  },
  {
    key: 'musicVolume',
    label: 'Music',
    hint: 'A different tune for each term, the bosses and the menus.',
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
  // Having read the prologue is remembered, not a preference to restore.
  const isDefault = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).every(
    (key) => key === 'seenIntro' || settings[key] === DEFAULT_SETTINGS[key],
  );

  return (
    <section className="settings" aria-labelledby="settings-heading">
      <h2 id="settings-heading">Settings</h2>
      <div className="setting">
        <span className="setting-text">
          <strong id="graphics-label">Graphics</strong>
          <small>{GRAPHICS_HINTS[settings.graphics]}</small>
        </span>
        <span className="segmented" role="radiogroup" aria-labelledby="graphics-label">
          {GRAPHICS_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={settings.graphics === level}
              className={settings.graphics === level ? 'segment active' : 'segment'}
              onClick={() => updateSettings({ graphics: level })}
            >
              {level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
        </span>
      </div>
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
        onClick={() => updateSettings({ ...DEFAULT_SETTINGS, seenIntro: settings.seenIntro })}
      >
        Restore default settings
      </button>
    </section>
  );
}
