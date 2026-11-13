import { useGameStore } from '../game/core/gameStore';
import { ACHIEVEMENTS } from '../game/progression/achievements';
import { MenuNav } from './MenuNav';

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AchievementsScreen() {
  const save = useGameStore((state) => state.save);
  const earned = Object.keys(save.achievements).length;

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>Achievements</h1>
        <p>
          {earned} of {ACHIEVEMENTS.length} earned. Days played: {save.totals.days} · Sunshards
          delivered: {save.totals.treasures} · Mossbacks defeated: {save.totals.enemies}
        </p>
        <ul className="achievements">
          {ACHIEVEMENTS.map((achievement) => {
            const when = save.achievements[achievement.id];
            const progress = achievement.progress?.(save);
            return (
              <li key={achievement.id} className={when ? 'achievement done' : 'achievement'}>
                <span className="medal" aria-hidden="true">
                  {when ? '★' : '☆'}
                </span>
                <span className="achievement-text">
                  <strong>{achievement.name}</strong>
                  <span>{achievement.description}</span>
                  {when ? (
                    <small>Earned {formatDate(when)}</small>
                  ) : progress && progress[1] > 1 ? (
                    <span className="meter">
                      <progress
                        value={progress[0]}
                        max={progress[1]}
                        aria-label={`${achievement.name} progress`}
                      />
                      <small>
                        {progress[0]} / {progress[1]}
                      </small>
                    </span>
                  ) : (
                    <small>Not earned yet</small>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
