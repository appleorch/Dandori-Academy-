import { useGameStore } from '../game/core/gameStore';
import { chapterOf, LESSON_STORY } from '../game/story/story';
import type { LevelDefinition } from '../game/world/level';
import { AshwickPortrait } from './Portrait';
import { MODES } from '../game/modes/modes';
import { ModeTargets } from './ModeTargets';
import { OptionalTreasure, SquadRoster } from './SquadRoster';
import { fieldTitle } from './format';
import { CAMPAIGN_INTRO } from '../game/story/story';
import { currentSection, sectionProgress } from '../game/campaign/campaign';

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
  const story = mode === 'lessons' ? LESSON_STORY[level.id] : undefined;
  const campaign = useGameStore((state) => state.save.campaign);
  if (mode === 'campaign') {
    const section = currentSection(campaign);
    const progress = sectionProgress(campaign);
    return (
      <div className="screen overlay briefing">
        <div className="panel">
          <p className="eyebrow">Story · Day {campaign.day + 1}</p>
          <h1>{section.name}</h1>
          {campaign.day === 0 && (
            <figure className="speech">
              <AshwickPortrait />
              <div>
                <blockquote>{CAMPAIGN_INTRO}</blockquote>
                <figcaption>Proctor Ashwick</figcaption>
              </div>
            </figure>
          )}
          <p className="brief">{section.brief}</p>
          <p className="day-stats">
            Clock parts home: {progress.parts} of {progress.partsTotal} · Relics: {progress.relics}{' '}
            of {progress.relicsTotal} · Beasts beaten: {progress.beasts} of {progress.beastsTotal}
          </p>
          <SquadRoster level={level} />
          <ModeTargets level={level} mode={mode} />
          <button type="button" onClick={beginDay} autoFocus>
            Begin the day <kbd>Enter</kbd>
          </button>
          <button type="button" className="secondary" onClick={leaveDay}>
            Back to base camp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen overlay briefing">
      <div className="panel">
        <p className="eyebrow">
          {mode === 'lessons' ? `${chapter.label} · ${chapter.title}` : MODES[mode].name}
          {level.difficulty === 'hard' ? ' · Hard' : ''}
        </p>
        <h1>{fieldTitle(level)}</h1>
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
