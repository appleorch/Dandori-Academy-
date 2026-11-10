import { useGameStore } from './game/core/gameStore';
import { GameCanvas } from './game/rendering/GameCanvas';
import { LESSON_1 } from './game/world/level';
import { Hud } from './ui/Hud';
import { ResultsScreen } from './ui/ResultsScreen';
import { TitleScreen } from './ui/TitleScreen';

export function App() {
  const phase = useGameStore((state) => state.phase);
  const runId = useGameStore((state) => state.runId);

  if (phase === 'title') return <TitleScreen level={LESSON_1} />;
  return (
    <div className="game">
      <GameCanvas key={runId} level={LESSON_1} />
      <Hud />
      {phase === 'results' && <ResultsScreen />}
    </div>
  );
}
