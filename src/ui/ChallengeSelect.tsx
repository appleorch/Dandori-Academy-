import { useState } from 'react';
import { useGameStore } from '../game/core/gameStore';
import {
  CHALLENGE_IDS,
  challengeOpen,
  isChallenge,
  medalTargets,
  MODES,
  type ChallengeId,
} from '../game/modes/modes';
import { modeBest, modeRank } from '../game/save/saveManager';
import { formatPoints } from './format';
import { openLessons } from './lessonAccess';
import { MenuNav } from './MenuNav';

/**
 * The challenges: pick a way of scoring, then a lesson. Every lesson the story has opened can be
 * played as a challenge, for a medal and a place on the Academy board.
 */
export function ChallengeSelect() {
  const save = useGameStore((state) => state.save);
  const startDay = useGameStore((state) => state.startDay);
  const lastMode = useGameStore((state) => state.playMode);
  const [mode, setMode] = useState<ChallengeId>(isChallenge(lastMode) ? lastMode : 'hunt');
  const spec = MODES[mode];
  const lessons = openLessons(save).filter((level) => challengeOpen(mode, level));

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>Challenges</h1>
        <nav className="tabs mode-tabs" aria-label="Challenge">
          {CHALLENGE_IDS.map((id) => (
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
          </ul>
          <p className="note">
            Medals run Bronze, Silver, Gold, Platinum and Diamond. Glowcaps add to a score but are
            never needed for a medal. Challenges are played on the Normal day.
          </p>
        </section>
        {lessons.length === 0 ? (
          <p className="note">
            {mode === 'trial'
              ? 'No lesson the story has opened can be finished by its starting squad alone yet.'
              : 'Open lessons in the story to play them here.'}
          </p>
        ) : (
          <ol className="lessons">
            {lessons.map((level) => {
              const rank = modeRank(save, mode, level.id);
              const best = modeBest(save, mode, level.id);
              const targets = medalTargets(mode, level);
              const platinum = targets.find((target) => target.rank === 'Platinum');
              const diamond = targets.find((target) => target.rank === 'Diamond');
              return (
                <li key={level.id}>
                  <button type="button" className="lesson" onClick={() => startDay(level.id, mode)}>
                    <span className="lesson-number">{level.side ? '▼' : level.stage}</span>
                    <span className="lesson-text">
                      <strong>{level.name}</strong>
                      <span className="targets-line">
                        {platinum && (
                          <span className="rank-platinum">
                            Platinum {formatPoints(platinum.score)}
                          </span>
                        )}
                        {diamond && (
                          <span className="rank-diamond">
                            Diamond {formatPoints(diamond.score)}
                          </span>
                        )}
                      </span>
                    </span>
                    {rank && (
                      <span className={`badge rank-${rank.toLowerCase()}`}>
                        {rank}
                        <small>{formatPoints(best)} pts</small>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
