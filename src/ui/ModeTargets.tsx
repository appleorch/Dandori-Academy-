import { rankValue, type Rank } from '../game/dandori/scoring';
import { RIVAL_NAMES, type RivalLevel } from '../game/modes/battle';
import {
  isBattle,
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
        {isBattle(mode) && rival && <> against {RIVAL_NAMES[rival]}</>}
      </p>
      <ul className="mode-rule-list">
        {spec.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      {isChallenge(mode) && (
        <>
          <table>
            <caption>Medals</caption>
            <thead>
              <tr>
                <th scope="col">Medal</th>
                <th scope="col">Score</th>
                <th scope="col">Pace</th>
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
                        ? ''
                        : `Done by ${formatTime(target.finishBy)} (${formatTime(level.dayLength - target.finishBy)} left)`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="note">
            {medalGate(mode) ?? ''} Paces assume a perfect day otherwise. Glowcaps add to your score
            but never count for a medal.
          </p>
        </>
      )}
    </div>
  );
}
