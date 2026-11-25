import { t } from '../i18n/i18n';
import { rankValue, type Rank } from '../game/dandori/scoring';
import { RIVAL_NAMES, type RivalLevel } from '../game/modes/battle';
import {
  isBattle,
  challengeTimed,
  isChallenge,
  medalGate,
  medalTargets,
  MODES,
  type ModeId,
} from '../game/modes/modes';
import type { LevelDefinition } from '../game/world/level';
import { formatPoints, formatTime } from './format';

interface ModeTargetsProps {
  level: LevelDefinition;
  mode: ModeId;
  rival?: RivalLevel;
  /** Medal just earned, to mark which targets were met. */
  earned?: Rank;
}

/**
 * What the day asks for, by mode: the rules, and in a challenge the score each medal needs
 * and the pace a perfect day must keep for Platinum and Diamond.
 */
export function ModeTargets({ level, mode, rival, earned }: ModeTargetsProps) {
  const spec = MODES[mode];
  return (
    <div className="targets">
      <p className="mode-name">
        <strong>{spec.name}</strong>
        {isBattle(mode) && rival && (
          <>
            {' '}
            {t('ui.modeTargets.against')} {RIVAL_NAMES[rival]}
          </>
        )}
      </p>
      <ul className="mode-rule-list">
        {spec.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      {isChallenge(mode) && (
        <>
          <table>
            <caption>{t('ui.modeTargets.medals')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('ui.modeTargets.medal')}</th>
                <th scope="col">{t('ui.modeTargets.score')}</th>
                <th scope="col">
                  {challengeTimed(mode, level)
                    ? t('ui.modeTargets.pace')
                    : t('ui.modeTargets.needs')}
                </th>
              </tr>
            </thead>
            <tbody>
              {medalTargets(mode, level).map((target) => {
                const met = earned !== undefined && rankValue(earned) >= rankValue(target.rank);
                return (
                  <tr key={target.rank} className={met ? 'met' : undefined}>
                    <th scope="row" className={`rank-${target.rank.toLowerCase()}`}>
                      {met ? '✓ ' : ''}
                      {target.rank}
                    </th>
                    <td>{formatPoints(target.score)}</td>
                    <td>
                      {target.finishBy === null
                        ? (target.note ?? '')
                        : t('ui.modeTargets.doneByLeft', {
                            v1: formatTime(target.finishBy),
                            v2: formatTime(level.dayLength - target.finishBy),
                          })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="note">
            {medalGate(mode, level) ?? ''}{' '}
            {challengeTimed(mode, level) ? t('ui.modeTargets.pacesAssumeAPerfect') : ''}{' '}
            {t('ui.modeTargets.glowcapsAddToYour')}
          </p>
        </>
      )}
    </div>
  );
}
