import { useGameStore } from '../game/core/gameStore';
import { chapterOf, LESSON_STORY } from '../game/story/story';
import type { LevelDefinition } from '../game/world/level';
import { AshwickPortrait } from './Portrait';
import { RankTargets } from './RankTargets';
import { SquadRoster } from './SquadRoster';

/**
 * Shown over the waiting field before a day starts: where the story has got to, what
 * Proctor Ashwick has to say about today, and what the lesson asks for.
 */
export function Briefing({ level }: { level: LevelDefinition }) {
  const beginDay = useGameStore((state) => state.beginDay);
  const showScreen = useGameStore((state) => state.showScreen);
  const chapter = chapterOf(level.stage);
  const story = LESSON_STORY[level.id];

  return (
    <div className="screen overlay briefing">
      <div className="panel">
        <p className="eyebrow">
          {chapter.label} · {chapter.title}
          {level.difficulty === 'hard' ? ' · Hard' : ''}
        </p>
        <h1>
          {level.stage}. {level.name}
        </h1>
        {story && (
          <figure className="speech">
            <AshwickPortrait />
            <div>
              <blockquote>{story.briefing}</blockquote>
              <figcaption>Proctor Ashwick</figcaption>
            </div>
          </figure>
        )}
        <p className="brief">{level.brief}</p>
        <SquadRoster level={level} />
        <RankTargets level={level} />
        <button type="button" onClick={beginDay} autoFocus>
          Begin the day <kbd>Enter</kbd>
        </button>
        <button type="button" className="secondary" onClick={() => showScreen('menu')}>
          Back to lessons
        </button>
      </div>
    </div>
  );
}
