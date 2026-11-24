import { useRef } from 'react';
import { audio } from '../game/audio/audioManager';
import { useGameStore, type MenuScreen } from '../game/core/gameStore';
import { ACHIEVEMENTS } from '../game/progression/achievements';
import { t } from '../i18n/i18n';
import type { MessageKey } from '../i18n/en';

const TABS: readonly (readonly [MenuScreen, MessageKey])[] = [
  ['menu', 'nav.menu'],
  ['camp', 'nav.camp'],
  ['map', 'nav.map'],
  ['challenges', 'nav.challenges'],
  ['battles', 'nav.battles'],
  ['journal', 'nav.journal'],
  ['guide', 'nav.guide'],
  ['leaderboard', 'nav.leaderboard'],
  ['achievements', 'nav.achievements'],
  ['settings', 'nav.settings'],
  ['credits', 'nav.credits'],
];

/** Knocks on the crest needed to be let in, and how long the Emberlings wait for them. */
const KNOCKS = 5;
const KNOCK_WINDOW_MS = 4000;

/** Tabs across the top of every menu screen, and the crest, which is also a door. */
export function MenuNav() {
  const phase = useGameStore((state) => state.phase);
  const showScreen = useGameStore((state) => state.showScreen);
  const openPoker = useGameStore((state) => state.openPoker);
  const earned = useGameStore((state) => Object.keys(state.save.achievements).length);
  const knowsTheRoom = useGameStore((state) => 'back-room' in state.save.achievements);
  const visible = ACHIEVEMENTS.filter((achievement) => !achievement.secret).length;
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
    <div className="menu-head">
      <p className="eyebrow crest-line">
        <button type="button" className="crest" onClick={knock} aria-label={t('nav.crest')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2c5 5 7 9 7 13a7 7 0 0 1-14 0c0-2 1-4 2.5-5.5C8 12 9.5 13 10 14c0-4 0-8 2-12z"
              fill="currentColor"
            />
          </svg>
        </button>
        {t('nav.title')}
      </p>
      <nav className="tabs" aria-label={t('nav.label')}>
        {TABS.map(([screen, label]) => (
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
        {knowsTheRoom && (
          <button type="button" className="tab" onClick={openPoker}>
            {t('nav.backRoom')}
          </button>
        )}
      </nav>
    </div>
  );
}
