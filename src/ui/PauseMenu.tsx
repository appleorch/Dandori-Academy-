import { useState } from 'react';
import { useGameStore } from '../game/core/gameStore';
import type { LevelDefinition } from '../game/world/level';
import { isBattle } from '../game/modes/modes';
import { ModeTargets } from './ModeTargets';
import { SettingsPanel } from './SettingsPanel';
import { t } from '../i18n/i18n';
import { fieldName } from '../i18n/gameText';
import { ActionPrompt } from './Glyph';
import { Manual } from './Manual';

/** Shown over a paused day: resume, restart, change settings or leave the lesson. */
export function PauseMenu({ level }: { level: LevelDefinition }) {
  const resume = useGameStore((state) => state.resume);
  const startDay = useGameStore((state) => state.startDay);
  const leaveDay = useGameStore((state) => state.leaveDay);
  const endDay = useGameStore((state) => state.endDay);
  const mode = useGameStore((state) => state.playMode);
  const setPhoto = useGameStore((state) => state.setPhoto);
  const [view, setView] = useState<'main' | 'settings' | 'manual'>('main');

  return (
    <div className="screen overlay">
      <div
        className={view === 'manual' ? 'panel wide' : 'panel'}
        role="dialog"
        aria-labelledby="pause-title"
      >
        <p className="eyebrow" id="pause-title">
          {t('pause.title')}
        </p>
        {view === 'main' ? (
          <>
            <h1>{fieldName(level)}</h1>
            <ModeTargets level={level} mode={mode} />
            <button type="button" onClick={resume} autoFocus>
              {t('pause.resume')}
            </button>
            {mode === 'campaign' ? (
              // A story day is never thrown away: it can only be brought to an end.
              <button type="button" className="secondary" onClick={endDay}>
                {t('pause.callItADay')}
                <small> {t('pause.callItADayNote')}</small>
              </button>
            ) : (
              mode !== 'lessons' && (
                <button type="button" className="secondary" onClick={endDay}>
                  {isBattle(mode) ? t('pause.concede') : t('pause.endNow')}
                </button>
              )
            )}
            {mode !== 'campaign' && (
              <button type="button" className="secondary" onClick={() => startDay(level.id)}>
                {t('pause.restart')} <ActionPrompt action="restart" />
              </button>
            )}
            <button
              type="button"
              className="secondary"
              onClick={() => setPhoto({ filter: 'none', depth: false, cheer: false })}
            >
              {t('pause.photo')}
            </button>
            <button type="button" className="secondary" onClick={() => setView('manual')}>
              {t('pause.manual')}
            </button>
            <button type="button" className="secondary" onClick={() => setView('settings')}>
              {t('pause.settings')}
            </button>
            {mode !== 'campaign' && (
              <button type="button" className="secondary" onClick={leaveDay}>
                {t('pause.quit')}
              </button>
            )}
          </>
        ) : view === 'manual' ? (
          <Manual onClose={() => setView('main')} />
        ) : (
          <>
            <SettingsPanel />
            <button type="button" onClick={() => setView('main')} autoFocus>
              {t('pause.back')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
