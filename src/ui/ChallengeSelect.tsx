import { useState } from 'react';
import { useGameStore } from '../game/core/gameStore';
import {
  CHALLENGE_IDS,
  challengeTimed,
  isChallenge,
  medalTargets,
  MODES,
  trialLosses,
  type ChallengeId,
} from '../game/modes/modes';
import { modeBest, modeRank } from '../game/save/saveManager';
import { formatPoints, formatTime } from './format';
import { challengeFieldsOf, challengeLock, hasMedal } from './lessonAccess';
import { MenuNav } from './MenuNav';

/** One line on what a field's Platinum asks for, by its challenge's rule. */
function paceLine(mode: ChallengeId, level: ReturnType<typeof challengeFieldsOf>[number]): string {
  if (mode === 'growing') return `Platinum: ${level.challenge?.pace} Sproutlings by sunset`;
  if (mode === 'trial') {
    const losses = trialLosses(level);
    return losses === 0 ? 'Platinum: lose nobody' : `Platinum: lose ${losses} or fewer`;
  }
  return challengeTimed(mode, level)
    ? `Platinum pace ${formatTime(level.challenge?.pace ?? 0)}`
    : '';
}

/**
 * The challenges: pick a challenge, then one of its twelve fields. Every field was built for its
 * challenge's own rule. The first few are open from the start; each one after opens with a
 * medal on the one before.
 */
export function ChallengeSelect() {
  const save = useGameStore((state) => state.save);
  const startDay = useGameStore((state) => state.startDay);
  const lastMode = useGameStore((state) => state.playMode);
  const [mode, setMode] = useState<ChallengeId>(isChallenge(lastMode) ? lastMode : 'hunt');
  const spec = MODES[mode];
  const fields = challengeFieldsOf(mode);
  const won = fields.filter((level) => hasMedal(save, mode, level.id)).length;

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
            Twelve fields, each built for this challenge. Medals run Bronze, Silver, Gold, Platinum
            and Diamond; Platinum is set by the Academy’s test player on each field. Glowcaps add to
            a score but are never needed for a medal.
          </p>
          <p className="challenge-progress">
            {won} of {fields.length} fields with a medal
          </p>
        </section>
        <ol className="lessons">
          {fields.map((level) => {
            const locked = challengeLock(save, level);
            const rank = modeRank(save, mode, level.id);
            const best = modeBest(save, mode, level.id);
            const targets = medalTargets(mode, level);
            const platinum = targets.find((target) => target.rank === 'Platinum');
            return (
              <li key={level.id}>
                <button
                  type="button"
                  className={locked ? 'lesson locked' : 'lesson'}
                  disabled={locked !== null}
                  title={locked ?? level.brief}
                  onClick={() => startDay(level.id, mode)}
                >
                  <span className="lesson-number">{level.challenge?.order}</span>
                  <span className="lesson-text">
                    <strong>{level.name}</strong>
                    <span className="targets-line">
                      {locked ? (
                        <span>{locked}</span>
                      ) : (
                        <>
                          {platinum && (
                            <span className="rank-platinum">
                              Platinum {formatPoints(platinum.score)}
                            </span>
                          )}
                          <span>{paceLine(mode, level)}</span>
                        </>
                      )}
                    </span>
                  </span>
                  {rank && rank !== 'Copper' && (
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
      </div>
    </main>
  );
}
