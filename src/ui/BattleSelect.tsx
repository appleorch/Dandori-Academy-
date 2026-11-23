import { useState } from 'react';
import { useGameStore } from '../game/core/gameStore';
import {
  battleLevel,
  battleOpen,
  RIVAL_LEVELS,
  RIVAL_NAMES,
  type RivalLevel,
} from '../game/modes/battle';
import { BATTLE_IDS, isBattle, MODES, type BattleId } from '../game/modes/modes';
import { formatTime } from './format';
import { openLessons } from './lessonAccess';
import { MenuNav } from './MenuNav';

const RIVAL_BLURB: Record<RivalLevel, string> = {
  easy: 'Works at seven tenths of your pace.',
  normal: 'Works at a little under your pace.',
  hard: 'Works at your pace and plans like the Proctor.',
};

/**
 * Battles: pick a race, a rival and a lesson. The rival works their own copy of the same field
 * at the same time, shown on a second map in the corner.
 */
export function BattleSelect() {
  const save = useGameStore((state) => state.save);
  const startDay = useGameStore((state) => state.startDay);
  const lastMode = useGameStore((state) => state.playMode);
  const lastRival = useGameStore((state) => state.rival);
  const [mode, setMode] = useState<BattleId>(isBattle(lastMode) ? lastMode : 'marble');
  const [rival, setRival] = useState<RivalLevel>(lastRival);
  const spec = MODES[mode];
  const lessons = openLessons(save).filter((level) => battleOpen(mode, level));
  const record = save.battles[mode] ?? { won: 0, lost: 0, drawn: 0 };

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>Battles</h1>
        <nav className="tabs mode-tabs" aria-label="Battle">
          {BATTLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={id === mode ? 'tab active' : 'tab'}
              aria-pressed={id === mode}
              onClick={() => setMode(id)}
            >
              {MODES[id].name}
            </button>
          ))}
        </nav>
        <section className="mode-rules">
          <p className="mode-summary">{spec.summary}</p>
          <ul>
            {spec.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
            <li>Battle days are short. Ending the day early from the pause menu concedes.</li>
          </ul>
          <p className="note">
            Your record: {record.won} won, {record.lost} lost, {record.drawn} drawn.
          </p>
        </section>
        <div className="rival-pick" role="radiogroup" aria-label="Rival">
          {RIVAL_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={rival === level}
              className={rival === level ? 'rival-card active' : 'rival-card'}
              onClick={() => setRival(level)}
            >
              <strong>{RIVAL_NAMES[level]}</strong>
              <small>{RIVAL_BLURB[level]}</small>
            </button>
          ))}
        </div>
        {lessons.length === 0 ? (
          <p className="note">No lesson the story has opened suits this race yet.</p>
        ) : (
          <ol className="lessons">
            {lessons.map((level) => (
              <li key={level.id}>
                <button
                  type="button"
                  className="lesson"
                  onClick={() => startDay(level.id, mode, rival)}
                >
                  <span className="lesson-number">{level.side ? '▼' : level.stage}</span>
                  <span className="lesson-text">
                    <strong>{level.name}</strong>
                    <span>{formatTime(battleLevel(level).dayLength)} on the clock</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
