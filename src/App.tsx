import { useGameStore } from './game/core/gameStore';
import { GameCanvas } from './game/rendering/GameCanvas';
import { LEVELS } from './game/world/level';
import { Hud } from './ui/Hud';
import { LessonSelect } from './ui/LessonSelect';
import { ResultsScreen } from './ui/ResultsScreen';

export function App() {
  const phase = useGameStore((state) => state.phase);
  const runId = useGameStore((state) => state.runId);
  const levelId = useGameStore((state) => state.levelId);
  const level = LEVELS.find((candidate) => candidate.id === levelId) ?? LEVELS[0];

  if (phase === 'menu') return <LessonSelect />;
  return (
    <div className="game">
      <GameCanvas key={runId} level={level} />
      <Hud level={level} />
      {phase === 'results' && <ResultsScreen level={level} />}
    </div>
  );
}
