import { useRef } from 'react';
import { audio } from '../game/audio/audioManager';
import { useGameStore, type MenuScreen } from '../game/core/gameStore';
import { ACHIEVEMENTS } from '../game/progression/achievements';
import { t } from '../i18n/i18n';
import type { MessageKey } from '../i18n/en';

/** The four ways to play: the main menu's big choices, and the tabs between them. */
export const MODE_SCREENS: readonly (readonly [MenuScreen, MessageKey])[] = [
  ['camp', 'nav.camp'],
  ['map', 'nav.map'],
  ['challenges', 'nav.challenges'],
  ['battles', 'nav.battles'],
];

/** The Extras: everything that is not a way to play. */
export const EXTRA_SCREENS: readonly (readonly [MenuScreen, MessageKey])[] = [
  ['journal', 'nav.journal'],
  ['guide', 'nav.guide'],
  ['leaderboard', 'nav.leaderboard'],
  ['achievements', 'nav.achievements'],
  ['wardrobe', 'nav.wardrobe'],
  ['settings', 'nav.settings'],
  ['credits', 'nav.credits'],
];

/** Knocks on the crest needed to be let in, and how long the Emberlings wait for them. */
const KNOCKS = 5;
const KNOCK_WINDOW_MS = 4000;

/** The Academy crest, which is also a door: knock on it five times. */
export function Crest() {
  const openPoker = useGameStore((state) => state.openPoker);
  const knocks = useRef<number[]>([]);
  const knock = (): void => {
    const now = performance.now();
    knocks.current = [...knocks.current.filter((time) => now - time < KNOCK_WINDOW_MS), now];
    audio.play('knock');
    if (knocks.current.length >= KNOCKS) {
      knocks.current = [];
      audio.play('doorOpen');
      openPoker();
    }
  };
  return (
    <button type="button" className="crest" onClick={knock} aria-label={t('nav.crest')}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2c5 5 7 9 7 13a7 7 0 0 1-14 0c0-2 1-4 2.5-5.5C8 12 9.5 13 10 14c0-4 0-8 2-12z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

/**
 * The head of every screen off the main menu: back to the menu (Escape, or B on a pad), and
 * tabs across the screen's own group: the four ways to play, or the Extras.
 */
export function MenuNav() {
  const phase = useGameStore((state) => state.phase);
  const showScreen = useGameStore((state) => state.showScreen);
  const openPoker = useGameStore((state) => state.openPoker);
  const earned = useGameStore((state) => Object.keys(state.save.achievements).length);
  const knowsTheRoom = useGameStore((state) => 'back-room' in state.save.achievements);
  const visible = ACHIEVEMENTS.filter((achievement) => !achievement.secret).length;
  const extras = EXTRA_SCREENS.some(([screen]) => screen === phase);
  const tabs = extras ? EXTRA_SCREENS : MODE_SCREENS;

  return (
    <div className="menu-head">
      <p className="eyebrow crest-line">
        <Crest />
        {t('nav.title')}
        <span className="crest-group">{extras ? t('nav.extras') : t('nav.play')}</span>
      </p>
      <nav className="tabs" aria-label={t('nav.label')}>
        <button type="button" className="tab back" onClick={() => showScreen('menu')}>
          ‹ {t('nav.menu')}
        </button>
        {tabs.map(([screen, label]) => (
          <button
            key={screen}
            type="button"
            className={screen === phase ? 'tab active' : 'tab'}
            aria-current={screen === phase ? 'page' : undefined}
            onClick={() => showScreen(screen)}
          >
            {t(label)}
            {screen === 'achievements' && (
              <span className="tab-count">
                {earned}/{Math.max(visible, earned)}
              </span>
            )}
          </button>
        ))}
        {extras && knowsTheRoom && (
          <button type="button" className="tab" onClick={openPoker}>
            {t('nav.backRoom')}
          </button>
        )}
      </nav>
    </div>
  );
}
