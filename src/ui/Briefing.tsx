import { useGameStore } from '../game/core/gameStore';
import { chapterOf, LESSON_STORY } from '../game/story/story';
import type { LevelDefinition } from '../game/world/level';
import { AshwickPortrait } from './Portrait';
import { MODES } from '../game/modes/modes';
import { ModeTargets } from './ModeTargets';
import { OptionalTreasure, SquadRoster } from './SquadRoster';

/**
 * Shown over the waiting field before a day starts: where the story has got to, what
 * Proctor Ashwick has to say about today, and what the lesson asks for.
 */
export function Briefing({ level }: { level: LevelDefinition }) {
  const beginDay = useGameStore((state) => state.beginDay);
  const leaveDay = useGameStore((state) => state.leaveDay);
  const mode = useGameStore((state) => state.playMode);
  const rival = useGameStore((state) => state.rival);
  const chapter = chapterOf(level.stage);
  // Ashwick's word on the lesson belongs to the story; the other modes open on their rules.
  const story = mode === 'story' ? LESSON_STORY[level.id] : undefined;

  return (
    <div className="screen overlay briefing">
      <div className="panel">
        <p className="eyebrow">
          {mode === 'story' ? `${chapter.label} · ${chapter.title}` : MODES[mode].name}
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
        <OptionalTreasure level={level} />
        <SquadRoster level={level} />
        <ModeTargets level={level} mode={mode} rival={rival} />
        <button type="button" onClick={beginDay} autoFocus>
          Begin the day <kbd>Enter</kbd>
        </button>
        <button type="button" className="secondary" onClick={leaveDay}>
          Back
        </button>
      </div>
    </div>
  );
}
