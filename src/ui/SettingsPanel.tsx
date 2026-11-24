import { LOCALES, LOCALE_NAMES, t } from '../i18n/i18n';
import { sameBindings } from '../game/commands/bindings';
import { useGameStore } from '../game/core/gameStore';
import {
  DEFAULT_SETTINGS,
  GRAPHICS_LEVELS,
  PALETTES,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  ZOOM_SPEED_MAX,
  ZOOM_SPEED_MIN,
  type GraphicsLevel,
  type PaletteName,
  type Settings,
} from '../game/core/settings';
import { ControlsSettings } from './ControlsSettings';
import { KindGlyph } from './KindGlyph';
import { SPROUT_KINDS } from '../game/workers/sprouts';

type ToggleKey =
  | 'carrierCounts'
  | 'healthBars'
  | 'pauseOnBlur'
  | 'hints'
  | 'commentary'
  | 'briefings'
  | 'reducedMotion'
  | 'highContrast'
  | 'whistleToggle'
  | 'fastToggle'
  | 'alwaysShowArc'
  | 'aimAssist'
  | 'tiltShift';

type Toggle = readonly [ToggleKey, string, string];

const PLAY_TOGGLES: readonly Toggle[] = [
  ['carrierCounts', 'Carrier counts', 'Show carriers held and needed above each Sunshard.'],
  ['healthBars', 'Health bars', 'Show a wounded enemy’s health.'],
  ['pauseOnBlur', 'Pause when away', 'Pause the day when you switch to another tab or window.'],
  ['hints', 'Advice from Ashwick', 'Short tips during a day about what you may be missing.'],
  [
    'commentary',
    'Headmaster’s commentary',
    'Professor Sprocket’s remarks on chains, relics and emergencies.',
  ],
  [
    'briefings',
    'Briefings',
    'Show the briefing and the day’s goals before each story and Time Attack day begins.',
  ],
];

const COMFORT_TOGGLES: readonly Toggle[] = [
  [
    'tiltShift',
    'Miniature blur',
    'Blur the top and bottom of the view, as a close-up camera does, on medium and high graphics.',
  ],
  [
    'reducedMotion',
    'Reduced motion',
    'No camera shake, punch or freeze-frames, calmer bursts, and no pulsing or sliding menus.',
  ],
  ['highContrast', 'High-contrast HUD', 'Solid black panels with bright outlines over the field.'],
  [
    'whistleToggle',
    'Toggle the whistle',
    'Press once to start whistling and again to stop, instead of holding.',
  ],
  [
    'fastToggle',
    'Toggle fast-forward',
    'Press once to hurry the day along and again to stop, instead of holding.',
  ],
  [
    'alwaysShowArc',
    'Always show the throw arc',
    'Keep the arc on screen while whistling and with nobody in the squad.',
  ],
  [
    'aimAssist',
    'Aim assist on sticks',
    'A gamepad’s aim snaps onto the nearest job close to where the stick points.',
  ],
];

const GRAPHICS_HINTS: Record<GraphicsLevel, string> = {
  low: 'No shadows or effects. Smoothest on slow phones.',
  medium: 'Shadows, glow and the miniature depth-of-field look.',
  high: 'Adds soft ambient shadows in creases and full resolution.',
};

const PALETTE_NAMES: Record<PaletteName, string> = {
  default: 'Standard',
  deuteranopia: 'Red-green',
  tritanopia: 'Blue-yellow',
};

const PALETTE_HINTS: Record<PaletteName, string> = {
  default: 'The Academy’s own colours.',
  deuteranopia:
    'For red-green colour blindness (deuteranopia and protanopia): kinds, warning rings and medals recoloured to stay apart.',
  tritanopia:
    'For blue-yellow colour blindness (tritanopia): kinds, warning rings and medals recoloured to stay apart.',
};

type RangeKey = 'sfxVolume' | 'musicVolume' | 'zoomSpeed' | 'uiScale';

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

const SOUND_RANGES: readonly RangeSetting[] = [
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
];

const ZOOM_RANGE: RangeSetting = {
  key: 'zoomSpeed',
  label: 'Zoom speed',
  hint: 'How far each turn of the mouse wheel, or a held zoom key, zooms.',
  min: ZOOM_SPEED_MIN,
  max: ZOOM_SPEED_MAX,
  step: 0.25,
  format: (value) => `${value.toFixed(2)}×`,
};

const SCALE_RANGE: RangeSetting = {
  key: 'uiScale',
  label: 'Text and menu size',
  hint: 'Makes every menu, the HUD and their text larger or smaller.',
  min: UI_SCALE_MIN,
  max: UI_SCALE_MAX,
  step: 0.05,
  format: percent,
};

/**
 * Settings that are about who the player is, not how they like to play: "Restore defaults"
 * keeps them, as it keeps the outfit (chosen in the Wardrobe) and having read the prologue.
 */
const KEPT: readonly (keyof Settings)[] = [
  'seenIntro',
  'playerId',
  'wardenName',
  'postRuns',
  'outfit',
];

function isDefault(settings: Settings): boolean {
  return (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).every(
    (key) =>
      KEPT.includes(key) ||
      (key === 'bindings'
        ? sameBindings(settings.bindings, DEFAULT_SETTINGS.bindings)
        : settings[key] === DEFAULT_SETTINGS[key]),
  );
}

function ToggleRow({ toggle: [key, label, hint] }: { toggle: Toggle }) {
  const checked = useGameStore((state) => state.settings[key]);
  const updateSettings = useGameStore((state) => state.updateSettings);
  return (
    <label className="setting" htmlFor={`setting-${key}`}>
      <span className="setting-text">
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <input
        id={`setting-${key}`}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => updateSettings({ [key]: event.target.checked })}
      />
    </label>
  );
}

function RangeRow({
  range: { key, label, hint, min, max, step, format },
}: {
  range: RangeSetting;
}) {
  const value = useGameStore((state) => state.settings[key]);
  const updateSettings = useGameStore((state) => state.updateSettings);
  return (
    <label className="setting" htmlFor={`setting-${key}`}>
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
          value={value}
          aria-valuetext={format(value)}
          onChange={(event) => updateSettings({ [key]: Number(event.target.value) })}
        />
        <output htmlFor={`setting-${key}`}>{format(value)}</output>
      </span>
    </label>
  );
}

/** Game preferences. Changes apply immediately and are remembered in this browser. */
export function SettingsPanel() {
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);

  return (
    <section className="settings" aria-labelledby="settings-heading">
      <h2 id="settings-heading">Settings</h2>

      <h3>Picture and sound</h3>
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
              onClick={() => updateSettings({ graphics: level, graphicsTuned: true })}
            >
              {level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
        </span>
      </div>
      {SOUND_RANGES.map((range) => (
        <RangeRow key={range.key} range={range} />
      ))}
      <div className="setting">
        <span className="setting-text">
          <strong id="language-label">{t('language.title')}</strong>
          <small>{t('language.hint')}</small>
        </span>
        <span className="segmented" role="radiogroup" aria-labelledby="language-label">
          {LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              role="radio"
              aria-checked={settings.locale === locale}
              className={settings.locale === locale ? 'segment active' : 'segment'}
              onClick={() => updateSettings({ locale })}
            >
              {LOCALE_NAMES[locale]}
            </button>
          ))}
        </span>
      </div>

      <h3>Playing</h3>
      {PLAY_TOGGLES.map((toggle) => (
        <ToggleRow key={toggle[0]} toggle={toggle} />
      ))}
      <RangeRow range={ZOOM_RANGE} />

      <h3>Accessibility and comfort</h3>
      <div className="setting">
        <span className="setting-text">
          <strong id="palette-label">Colours</strong>
          <small>{PALETTE_HINTS[settings.palette]}</small>
          <span className="palette-preview" aria-hidden="true">
            {SPROUT_KINDS.map((kind) => (
              <KindGlyph key={kind} kind={kind} />
            ))}
            <span className="swatch danger" />
            <span className="rank-gold">Gold</span>
            <span className="rank-silver">Silver</span>
            <span className="rank-bronze">Bronze</span>
          </span>
        </span>
        <span className="segmented" role="radiogroup" aria-labelledby="palette-label">
          {PALETTES.map((palette) => (
            <button
              key={palette}
              type="button"
              role="radio"
              aria-checked={settings.palette === palette}
              className={settings.palette === palette ? 'segment active' : 'segment'}
              onClick={() => updateSettings({ palette })}
            >
              {PALETTE_NAMES[palette]}
            </button>
          ))}
        </span>
      </div>
      <RangeRow range={SCALE_RANGE} />
      {COMFORT_TOGGLES.map((toggle) => (
        <ToggleRow key={toggle[0]} toggle={toggle} />
      ))}

      <ControlsSettings />

      <button
        type="button"
        className="secondary small"
        disabled={isDefault(settings)}
        onClick={() => {
          const kept = Object.fromEntries(KEPT.map((key) => [key, settings[key]]));
          updateSettings({ ...DEFAULT_SETTINGS, ...kept });
        }}
      >
        Restore default settings
      </button>
    </section>
  );
}
