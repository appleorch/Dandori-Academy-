import { useGameStore } from '../game/core/gameStore';
import { bestRank, UNLOCK_RANK } from '../game/save/saveManager';
import { LEVELS } from '../game/world/level';
import { Controls } from './Controls';
import { MenuNav } from './MenuNav';

/** Front page: how to play, the list of lessons and the player's best result on each. */
export function LessonSelect() {
  const startDay = useGameStore((state) => state.startDay);
  const save = useGameStore((state) => state.save);
  const lastPlayed = useGameStore((state) => state.levelId);

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>Choose a lesson</h1>
        <p>
          Bring every Sunshard back to the Kiln before the day ends. Throw Emberlings at work, then
          move on: they finish the job without you. Earn {UNLOCK_RANK} or better to open the next
          lesson.
        </p>
        <Controls />
        <ol className="lessons">
          {LEVELS.map((level) => {
            const unlocked = level.stage <= save.stage;
            const rank = bestRank(save, level.id);
            return (
              <li key={level.id}>
                <button
                  type="button"
                  className="lesson"
                  disabled={!unlocked}
                  autoFocus={level.id === lastPlayed}
                  onClick={() => startDay(level.id)}
                >
                  <span className="lesson-number">{level.stage}</span>
                  <span className="lesson-text">
                    <strong>{level.name}</strong>
                    <span>
                      {unlocked
                        ? level.brief
                        : `Locked. Earn ${UNLOCK_RANK} in lesson ${level.stage - 1}.`}
                    </span>
                  </span>
                  {rank && (
                    <span className={`badge rank-${rank.toLowerCase()}`}>
                      {rank}
                      <small>{save.bestScores[level.id] ?? 0} pts</small>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        {save.score > 0 && <p className="best">Academy total: {save.score} pts</p>}
      </div>
    </main>
  );
}
