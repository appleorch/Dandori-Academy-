import { useGameStore, type MenuScreen } from '../game/core/gameStore';
import { ACHIEVEMENTS } from '../game/progression/achievements';

const TABS: readonly (readonly [MenuScreen, string])[] = [
  ['menu', 'Lessons'],
  ['achievements', 'Achievements'],
  ['settings', 'Settings & save'],
];

/** Tabs across the top of every menu screen. */
export function MenuNav() {
  const phase = useGameStore((state) => state.phase);
  const showScreen = useGameStore((state) => state.showScreen);
  const earned = useGameStore((state) => Object.keys(state.save.achievements).length);

  return (
    <div className="menu-head">
      <p className="eyebrow">Dandori Academy</p>
      <nav className="tabs" aria-label="Menu">
        {TABS.map(([screen, label]) => (
          <button
            key={screen}
            type="button"
            className={screen === phase ? 'tab active' : 'tab'}
            aria-current={screen === phase ? 'page' : undefined}
            onClick={() => showScreen(screen)}
          >
            {label}
            {screen === 'achievements' && (
              <span className="tab-count">
                {earned}/{ACHIEVEMENTS.length}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
