import { rankValue, type Rank } from '../game/dandori/scoring';
import { rankTargets } from '../game/dandori/targets';
import type { LevelDefinition } from '../game/world/level';
import { formatPoints, formatTime } from './format';

interface RankTargetsProps {
  level: LevelDefinition;
  /** Rank just earned, to mark which targets were met. */
  earned?: Rank;
}

function timeText(timeLeft: number | null): string {
  return timeLeft === null ? 'Any time' : `${formatTime(timeLeft)} left`;
}

/** Table of the score and clear time each rank needs. */
export function RankTargets({ level, earned }: RankTargetsProps) {
  const targets = rankTargets(level);
  return (
    <div className="targets">
      <table>
        <caption>How to earn each rank</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Score</th>
            <th scope="col">Every shard home with</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => {
            const met = earned !== undefined && rankValue(earned) >= rankValue(target.rank);
            return (
              <tr key={target.rank} className={met ? 'met' : undefined}>
                <th scope="row" className={`rank-${target.rank.toLowerCase()}`}>
                  {met ? '✓ ' : ''}
                  {target.rank}
                </th>
                <td>{formatPoints(target.score)}</td>
                <td>{timeText(target.timeLeft)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">
        Times assume no Emberlings lost. Each extra Emberling alive at the end is worth half a
        second; each one lost costs a second and a half.
      </p>
    </div>
  );
}

/** One-line version for the lesson list. */
export function RankTargetsLine({ level }: { level: LevelDefinition }) {
  return (
    <span className="targets-line">
      {rankTargets(level).map((target) => (
        <span key={target.rank} className={`rank-${target.rank.toLowerCase()}`}>
          {target.rank} {formatPoints(target.score)}
          {target.timeLeft !== null && <small> · {formatTime(target.timeLeft)} left</small>}
        </span>
      ))}
    </span>
  );
}
