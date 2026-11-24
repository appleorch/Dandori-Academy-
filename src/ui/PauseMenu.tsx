import { useState } from 'react';
import { useGameStore } from '../game/core/gameStore';
import type { LevelDefinition } from '../game/world/level';
import { isBattle } from '../game/modes/modes';
import { ModeTargets } from './ModeTargets';
import { SettingsPanel } from './SettingsPanel';
import { fieldTitle } from './format';

/** Shown over a paused day: resume, restart, change settings or leave the lesson. */
export function PauseMenu({ level }: { level: LevelDefinition }) {
  const resume = useGameStore((state) => state.resume);
  const startDay = useGameStore((state) => state.startDay);
  const leaveDay = useGameStore((state) => state.leaveDay);
  const endDay = useGameStore((state) => state.endDay);
  const mode = useGameStore((state) => state.playMode);
  const [view, setView] = useState<'main' | 'settings'>('main');

  return (
    <div className="screen overlay">
      <div className="panel">
        <p className="eyebrow">Paused</p>
        {view === 'main' ? (
          <>
            <h1>{fieldTitle(level)}</h1>
            <ModeTargets level={level} mode={mode} />
            <button type="button" onClick={resume} autoFocus>
              Resume
            </button>
            {mode === 'campaign' ? (
              // A story day is never thrown away: it can only be brought to an end.
              <button type="button" className="secondary" onClick={endDay}>
                Call it a day
                <small> Sproutlings away from the Kiln and the lit beacons are lost</small>
              </button>
            ) : (
              mode !== 'lessons' && (
                <button type="button" className="secondary" onClick={endDay}>
                  {isBattle(mode) ? 'Concede the battle' : 'End the day now'}
                </button>
              )
            )}
            {mode !== 'campaign' && (
              <button type="button" className="secondary" onClick={() => startDay(level.id)}>
                Restart <kbd>R</kbd>
              </button>
            )}
            <button type="button" className="secondary" onClick={() => setView('settings')}>
              Settings
            </button>
            {mode !== 'campaign' && (
              <button type="button" className="secondary" onClick={leaveDay}>
                Quit
              </button>
            )}
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
