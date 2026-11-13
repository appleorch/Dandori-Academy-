import { useState } from 'react';
import { useGameStore } from '../game/core/gameStore';
import type { LevelDefinition } from '../game/world/level';
import { SettingsPanel } from './SettingsPanel';

/** Shown over a paused day: resume, restart, change settings or leave the lesson. */
export function PauseMenu({ level }: { level: LevelDefinition }) {
  const resume = useGameStore((state) => state.resume);
  const startDay = useGameStore((state) => state.startDay);
  const showScreen = useGameStore((state) => state.showScreen);
  const [view, setView] = useState<'main' | 'settings'>('main');

  return (
    <div className="screen overlay">
      <div className="panel">
        <p className="eyebrow">Paused</p>
        {view === 'main' ? (
          <>
            <h1>
              {level.stage}. {level.name}
            </h1>
            <button type="button" onClick={resume} autoFocus>
              Resume
            </button>
            <button type="button" className="secondary" onClick={() => startDay(level.id)}>
              Restart lesson
            </button>
            <button type="button" className="secondary" onClick={() => setView('settings')}>
              Settings
            </button>
            <button type="button" className="secondary" onClick={() => showScreen('menu')}>
              Quit to lessons
            </button>
          </>
        ) : (
          <>
            <SettingsPanel />
            <button type="button" onClick={() => setView('main')} autoFocus>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
