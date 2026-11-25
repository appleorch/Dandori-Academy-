import { useState } from 'react';
import { useGameStore } from '../game/core/gameStore';
import {
  CHALLENGE_IDS,
  challengeTimed,
  isChallenge,
  medalTargets,
  trialLosses,
  type ChallengeId,
} from '../game/modes/modes';
import { modeBest, modeRank } from '../game/save/saveManager';
import { formatPoints, formatTime } from './format';
import { challengeFieldsOf, challengeLock, hasMedal } from './lessonAccess';
import { MenuNav } from './MenuNav';
import { CoopSwitch } from './CoopSwitch';
import { dailyId, dailyKey, ensureDaily } from '../game/world/daily';
import { bestRank } from '../game/save/saveManager';
import { t } from '../i18n/i18n';
import { levelBrief, levelName, modeName, modeRules, modeSummary } from '../i18n/gameText';

/** One line on what a field's Platinum asks for, by its challenge's rule. */
function paceLine(mode: ChallengeId, level: ReturnType<typeof challengeFieldsOf>[number]): string {
  if (mode === 'growing')
    return t('challenges.pace.growing', { count: level.challenge?.pace ?? 0 });
  if (mode === 'trial') {
    const losses = trialLosses(level);
    return losses === 0
      ? t('challenges.pace.trialNone')
      : t('challenges.pace.trial', { count: losses });
  }
  return challengeTimed(mode, level)
    ? t('challenges.pace.timed', { time: formatTime(level.challenge?.pace ?? 0) })
    : '';
}

/**
 * The challenges: pick a challenge, then one of its twelve fields. Every field was built for its
 * challenge's own rule. The first few are open from the start; each one after opens with a
 * medal on the one before.
 */
/**
 * The daily challenge: a Treasure Hunt field laid out fresh each day (by the UTC date), the
 * same for everyone, with a board of its own. It is made and played through by the test player
 * on first opening, which takes a moment.
 */
function DailyCard() {
  const startDay = useGameStore((state) => state.startDay);
  const save = useGameStore((state) => state.save);
  const [state, setState] = useState<'idle' | 'making' | 'failed'>('idle');
  const key = dailyKey(new Date());
  const best = bestRank(save, dailyId(key));
  return (
    <section className="daily-card">
      <div>
        <p className="eyebrow">{t('challenges.daily.eyebrow', { date: key })}</p>
        <strong>{t('challenges.daily.title')}</strong>
        <p className="note">
          {best ? t('challenges.daily.best', { rank: best }) : t('challenges.daily.blurb')}
        </p>
      </div>
      <button
        type="button"
        disabled={state === 'making'}
        onClick={() => {
          setState('making');
          void ensureDaily(key).then((level) => {
            if (level) startDay(level.id, 'hunt');
            else setState('failed');
          });
        }}
      >
        {state === 'making'
          ? t('challenges.daily.making')
          : state === 'failed'
            ? t('challenges.daily.failed')
            : t('challenges.daily.play')}
      </button>
    </section>
  );
}

export function ChallengeSelect() {
  const save = useGameStore((state) => state.save);
  const startDay = useGameStore((state) => state.startDay);
  const lastMode = useGameStore((state) => state.playMode);
  const [mode, setMode] = useState<ChallengeId>(isChallenge(lastMode) ? lastMode : 'hunt');
  const fields = challengeFieldsOf(mode);
  const won = fields.filter((level) => hasMedal(save, mode, level.id)).length;

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>{t('challenges.title')}</h1>
        <nav className="tabs mode-tabs" aria-label={t('challenges.label')}>
          {CHALLENGE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={id === mode ? 'tab active' : 'tab'}
              aria-pressed={id === mode}
              onClick={() => setMode(id)}
            >
              {modeName(id)}
            </button>
          ))}
        </nav>
        <DailyCard />
        <CoopSwitch />
        <section className="mode-rules">
          <p className="mode-summary">{modeSummary(mode)}</p>
          <ul>
            {modeRules(mode).map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="note">{t('challenges.note')}</p>
          <p className="challenge-progress">
            {t('challenges.progress', { won, total: fields.length })}
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
                  title={locked ?? levelBrief(level)}
                  onClick={() => startDay(level.id, mode)}
                >
                  <span className="lesson-number">{level.challenge?.order}</span>
                  <span className="lesson-text">
                    <strong>{levelName(level)}</strong>
                    <span className="targets-line">
                      {locked ? (
                        <span>{locked}</span>
                      ) : (
                        <>
                          {platinum && (
                            <span className="rank-platinum">
                              {t('challenges.platinumScore', {
                                score: formatPoints(platinum.score),
                              })}
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
                      <small>{t('challenges.points', { score: formatPoints(best) })}</small>
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
