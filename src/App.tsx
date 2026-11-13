import { useGameStore } from './game/core/gameStore';
import { GameCanvas } from './game/rendering/GameCanvas';
import { LEVELS } from './game/world/level';
import { AchievementsScreen } from './ui/AchievementsScreen';
import { Hud } from './ui/Hud';
import { LessonSelect } from './ui/LessonSelect';
import { PauseMenu } from './ui/PauseMenu';
import { ResultsScreen } from './ui/ResultsScreen';
import { SettingsScreen } from './ui/SettingsScreen';

export function App() {
  const phase = useGameStore((state) => state.phase);
  const paused = useGameStore((state) => state.paused);
  const runId = useGameStore((state) => state.runId);
  const levelId = useGameStore((state) => state.levelId);
  const level = LEVELS.find((candidate) => candidate.id === levelId) ?? LEVELS[0];

  if (phase === 'menu') return <LessonSelect />;
  if (phase === 'achievements') return <AchievementsScreen />;
  if (phase === 'settings') return <SettingsScreen />;
  return (
    <div className="game">
      <GameCanvas key={runId} level={level} />
      <Hud level={level} />
      {phase === 'playing' && paused && <PauseMenu level={level} />}
      {phase === 'results' && <ResultsScreen level={level} />}
    </div>
  );
}
