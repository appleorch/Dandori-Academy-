import { DIFFICULTIES, HARD } from '../game/core/difficulty';
import { useGameStore } from '../game/core/gameStore';
import {
  bestRank,
  bestScore,
  HARD_UNLOCK_RANK,
  hardUnlocked,
  UNLOCK_RANK,
} from '../game/save/saveManager';
import { CHAPTERS } from '../game/story/story';
import {
  entranceTo,
  forDifficulty,
  LEVELS,
  MAIN_LEVELS,
  type LevelDefinition,
} from '../game/world/level';
import { Controls } from './Controls';
import { MenuNav } from './MenuNav';
import { RankTargetsLine } from './RankTargets';

const HARD_SUMMARY = `Enemies have ${Math.round((HARD.enemyHp - 1) * 100)}% more health and strike sooner, the Warden has ${HARD.captainHp} hearts, drips are deadly, every loss costs double and the day is ${Math.round((1 - HARD.dayLength) * 100)}% shorter.`;

/** Front page: how to play, the mode, and the lessons, term by term, with the best result on each. */
export function LessonSelect() {
  const startDay = useGameStore((state) => state.startDay);
  const save = useGameStore((state) => state.save);
  const lastPlayed = useGameStore((state) => state.levelId);
  const difficulty = useGameStore((state) => state.settings.difficulty);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const hard = difficulty === 'hard';
  const lastStage = LEVELS.find((level) => level.id === lastPlayed)?.stage ?? 1;

  // Continue: the first open lesson not yet passed, or the last one played once everything is.
  const next =
    MAIN_LEVELS.find((level) => {
      if (level.stage > save.stage) return false;
      const rank = bestRank(save, level.id);
      return rank === null || rank === 'Bronze';
    }) ??
    LEVELS.find((level) => level.id === lastPlayed) ??
    MAIN_LEVELS[0];
  const fresh = save.totals.days === 0;

  const lockReason = (level: LevelDefinition): string | null => {
    if (level.side) {
      if (!save.discovered.includes(level.id)) {
        const above = entranceTo(level.id);
        return `Not found yet. There is a way down somewhere in lesson ${above?.stage ?? '?'}.`;
      }
    } else if (level.stage > save.stage) {
      return `Locked. Earn ${UNLOCK_RANK} in lesson ${level.stage - 1}.`;
    }
    if (hard && !hardUnlocked(save, level.id)) {
      return `Hard opens after ${HARD_UNLOCK_RANK} on Normal.`;
    }
    return null;
  };

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <header className="hero">
          <span className="hero-embers" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <i
                key={i}
                style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.53) % 4}s` }}
              />
            ))}
          </span>
          <p className="hero-title">Dandori Academy</p>
          <p className="hero-sub">
            {fresh ? 'Your first day at the Academy.' : `Academy total ${save.score} pts`}
          </p>
          <button
            type="button"
            className="hero-continue"
            onClick={() => startDay(next.id)}
            autoFocus
          >
            {fresh ? 'Begin the first lesson' : 'Continue'}
            <small>
              {next.stage}. {next.name}
            </small>
          </button>
        </header>
        <div className="lesson-head">
          <h1>Choose a lesson</h1>
          <span className="segmented" role="radiogroup" aria-label="Mode">
            {DIFFICULTIES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={difficulty === mode}
                className={difficulty === mode ? `segment active ${mode}` : 'segment'}
                onClick={() => updateSettings({ difficulty: mode })}
              >
                {mode === 'hard' ? 'Hard' : 'Normal'}
              </button>
            ))}
          </span>
        </div>
        <p>
          {hard
            ? HARD_SUMMARY
            : `Bring every Sunshard back to the Kiln before the day ends. Throw Emberlings at work, then move on: they finish the job without you. Earn ${UNLOCK_RANK} or better to open the next lesson, and ${HARD_UNLOCK_RANK} to open its Hard mode.`}
        </p>
        {!hard && (
          <details className="how-to" open={save.totals.days === 0}>
            <summary>Controls</summary>
            <Controls />
          </details>
        )}
        {CHAPTERS.map((chapter) => {
          const lessons = LEVELS.filter(
            (level) => level.stage >= chapter.from && level.stage <= chapter.to,
          );
          const side = lessons.every((level) => level.side);
          const reached = side ? save.stage >= 19 : save.stage >= chapter.from;
          // The term being worked on, and the one last played, start open.
          const current =
            (save.stage >= chapter.from && save.stage <= chapter.to) ||
            (lastStage >= chapter.from && lastStage <= chapter.to) ||
            (save.stage > MAIN_LEVELS.length && chapter.to === MAIN_LEVELS.length) ||
            (side && lessons.some((level) => save.discovered.includes(level.id)));
          const done = lessons.filter((level) => bestRank(save, level.id, difficulty)).length;
          return (
            <details key={chapter.id} className="chapter" open={current}>
              <summary>
                <span className="chapter-label">{chapter.label}</span>
                <strong>{reached ? chapter.title : 'Locked'}</strong>
                <span className="chapter-count">
                  {done}/{lessons.length}
                </span>
              </summary>
              {reached && <p className="chapter-intro">{chapter.intro}</p>}
              <ol className={hard ? 'lessons hard' : 'lessons'}>
                {lessons.map((base) => {
                  const level = forDifficulty(base, difficulty);
                  const locked = lockReason(level);
                  const rank = bestRank(save, level.id, difficulty);
                  return (
                    <li key={level.id}>
                      <button
                        type="button"
                        className="lesson"
                        disabled={locked !== null}
                        onClick={() => startDay(level.id)}
                      >
                        <span className="lesson-number">{level.stage}</span>
                        <span className="lesson-text">
                          <strong>{level.name}</strong>
                          <span>{locked ?? level.brief}</span>
                          {!locked && <RankTargetsLine level={level} />}
                        </span>
                        {rank && (
                          <span className={`badge rank-${rank.toLowerCase()}`}>
                            {rank}
                            <small>{bestScore(save, level.id, difficulty)} pts</small>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </details>
          );
        })}
        {save.score > 0 && <p className="best">Academy total: {save.score} pts</p>}
      </div>
    </main>
  );
}
