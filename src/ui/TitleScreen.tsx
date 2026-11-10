import { useGameStore } from '../game/core/gameStore';
import type { LevelDefinition } from '../game/world/level';
import { Controls } from './Controls';

export function TitleScreen({ level }: { level: LevelDefinition }) {
  const startDay = useGameStore((state) => state.startDay);
  const save = useGameStore((state) => state.save);
  const bestRank = save.bestRanks[level.id];

  return (
    <main className="screen">
      <div className="panel">
        <p className="eyebrow">Dandori Academy</p>
        <h1>{level.name}</h1>
        <p>
          Bring every Sunshard back to the Kiln before the day ends. Throw Emberlings at work, then
          move on: they finish the job without you. Nobody standing idle is good dandori.
        </p>
        <Controls />
        {bestRank && (
          <p className="best">
            Best: <strong>{bestRank}</strong> · {save.score} pts
          </p>
        )}
        <button type="button" onClick={startDay} autoFocus>
          Start the day
        </button>
      </div>
    </main>
  );
}
