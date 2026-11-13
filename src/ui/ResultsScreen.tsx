import { useGameStore } from '../game/core/gameStore';
import { findAchievement } from '../game/progression/achievements';
import { UNLOCK_RANK } from '../game/save/saveManager';
import type { DayEnd } from '../game/simulation/Simulation';
import { LEVELS, type LevelDefinition } from '../game/world/level';
import { RankTargets } from './RankTargets';

const HEADLINES: Record<DayEnd, string> = {
  allCollected: 'Every Sunshard is home',
  timeUp: 'The day is over',
  captainDown: 'The Warden is down',
  wipedOut: 'No Emberlings remain',
};

export function ResultsScreen({ level }: { level: LevelDefinition }) {
  const result = useGameStore((state) => state.result);
  const save = useGameStore((state) => state.save);
  const startDay = useGameStore((state) => state.startDay);
  const showScreen = useGameStore((state) => state.showScreen);
  if (!result) return null;
  const { score } = result;
  const next = LEVELS.find((candidate) => candidate.stage === level.stage + 1);
  const nextUnlocked = next !== undefined && next.stage <= save.stage;

  return (
    <div className="screen overlay">
      <div className="panel">
        <p className="eyebrow">{HEADLINES[result.reason]}</p>
        <h1 className={`rank rank-${score.rank.toLowerCase()}`}>{score.rank}</h1>
        <table>
          <tbody>
            <tr>
              <th>
                Sunshards ({result.treasuresCollected}/{result.treasuresTotal})
              </th>
              <td>{score.treasure}</td>
            </tr>
            <tr>
              <th>Time bonus</th>
              <td>{score.timeBonus}</td>
            </tr>
            <tr>
              <th>Emberlings alive</th>
              <td>{score.workerBonus}</td>
            </tr>
            <tr>
              <th>Emberlings lost</th>
              <td>{score.lossPenalty > 0 ? `−${score.lossPenalty}` : 0}</td>
            </tr>
            <tr className="total">
              <th>Total</th>
              <td>{score.total}</td>
            </tr>
          </tbody>
        </table>
        {result.isBestScore && <p className="best">New best score</p>}
        {result.unlockedNext && next && <p className="best">Unlocked: {next.name}</p>}
        {result.achievements.length > 0 && (
          <div className="unlocks">
            <p className="eyebrow">
              {result.achievements.length === 1
                ? 'Achievement unlocked'
                : `${result.achievements.length} achievements unlocked`}
            </p>
            <ul>
              {result.achievements.map((id) => {
                const achievement = findAchievement(id);
                return (
                  achievement && (
                    <li key={id}>
                      <strong>{achievement.name}</strong> {achievement.description}
                    </li>
                  )
                );
              })}
            </ul>
          </div>
        )}
        <RankTargets level={level} earned={score.rank} />
        {next && !nextUnlocked && <p>Earn {UNLOCK_RANK} or better to open the next lesson.</p>}
        {next && nextUnlocked && (
          <button type="button" onClick={() => startDay(next.id)} autoFocus>
            Next lesson: {next.name}
          </button>
        )}
        <button
          type="button"
          className={nextUnlocked ? 'secondary' : undefined}
          onClick={() => startDay(level.id)}
          autoFocus={!nextUnlocked}
        >
          Try again
        </button>
        <button type="button" className="secondary" onClick={() => showScreen('menu')}>
          All lessons
        </button>
      </div>
    </div>
  );
}
