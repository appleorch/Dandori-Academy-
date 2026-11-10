import { useGameStore } from '../game/core/gameStore';
import type { DayEnd } from '../game/simulation/Simulation';

const HEADLINES: Record<DayEnd, string> = {
  allCollected: 'Every Sunshard is home',
  timeUp: 'The day is over',
  captainDown: 'The Warden is down',
  wipedOut: 'No Emberlings remain',
};

export function ResultsScreen() {
  const result = useGameStore((state) => state.result);
  const startDay = useGameStore((state) => state.startDay);
  if (!result) return null;
  const { score } = result;

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
        <button type="button" onClick={startDay} autoFocus>
          Try again
        </button>
      </div>
    </div>
  );
}
