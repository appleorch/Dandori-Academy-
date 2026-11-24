import { useGameStore, type MenuScreen } from '../game/core/gameStore';
import { BATTLE_IDS, CHALLENGE_IDS, MODES } from '../game/modes/modes';
import { storyCleared } from '../game/save/saveManager';
import { CHALLENGE_LEVELS, MAIN_LEVELS } from '../game/world/level';
import { currentSection, sectionProgress } from '../game/campaign/campaign';
import { hasMedal, nextStoryLesson } from './lessonAccess';
import { MenuNav } from './MenuNav';

interface ModeCard {
  screen: MenuScreen;
  title: string;
  blurb: string;
  detail: string;
  className: string;
}

/**
 * The front page: carry on with the story, or pick one of the other ways to play. The story is
 * played from its base camp, Time Attack from the lesson map; challenges and battles each have a
 * screen of their own.
 */
export function MainMenu() {
  const save = useGameStore((state) => state.save);
  const lastPlayed = useGameStore((state) => state.levelId);
  const startDay = useGameStore((state) => state.startDay);
  const showScreen = useGameStore((state) => state.showScreen);
  const next = nextStoryLesson(save, lastPlayed);
  const fresh = save.campaign.day === 0 && save.totals.days === 0;
  const cleared = MAIN_LEVELS.filter((level) => storyCleared(save, level.id)).length;
  const section = currentSection(save.campaign);
  const progress = sectionProgress(save.campaign);
  const medals = CHALLENGE_LEVELS.filter(
    (level) => level.challenge && hasMedal(save, level.challenge.mode, level.id),
  ).length;
  const record = Object.values(save.battles).reduce(
    (sum, entry) => ({ won: sum.won + entry.won, lost: sum.lost + entry.lost }),
    { won: 0, lost: 0 },
  );

  const cards: ModeCard[] = [
    {
      screen: 'camp',
      title: 'Story',
      blurb: MODES.campaign.summary,
      detail: `${section.name} · day ${save.campaign.day + 1} · ${progress.parts} of ${progress.partsTotal} Clock parts`,
      className: 'mode-card campaign',
    },
    {
      screen: 'map',
      title: 'Time Attack',
      blurb: MODES.lessons.summary,
      detail: `${cleared} of ${MAIN_LEVELS.length} lessons cleared`,
      className: 'mode-card lessons',
    },
    {
      screen: 'challenges',
      title: 'Challenges',
      blurb: `${CHALLENGE_IDS.length} challenges with twelve fields each, built for their own rules: ${CHALLENGE_IDS.map((id) => MODES[id].name).join(', ')}.`,
      detail: `${medals} of ${CHALLENGE_LEVELS.length} fields with a medal`,
      className: 'mode-card challenge',
    },
    {
      screen: 'battles',
      title: 'Battles',
      blurb: `Race a rival Warden on a copy of a lesson: ${BATTLE_IDS.map((id) => MODES[id].name).join(', ')}.`,
      detail: `${record.won} won · ${record.lost} lost`,
      className: 'mode-card battle',
    },
  ];

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
            {fresh
              ? 'The Grand Botanical & Clockwork Academy. Your first day.'
              : `The Grand Botanical & Clockwork Academy · Story day ${save.campaign.day + 1}`}
          </p>
          <button
            type="button"
            className="hero-continue"
            onClick={() => showScreen('camp')}
            autoFocus
          >
            {save.campaign.day === 0 ? 'Begin the story' : 'Continue the story'}
            <small>
              {section.name} · day {save.campaign.day + 1}
            </small>
          </button>
          <button
            type="button"
            className="secondary hero-lesson"
            onClick={() => startDay(next.id, 'lessons')}
          >
            Time Attack: {next.stage}. {next.name}
          </button>
        </header>
        <div className="mode-cards">
          {cards.map((card) => (
            <button
              key={card.screen}
              type="button"
              className={card.className}
              onClick={() => showScreen(card.screen)}
            >
              <strong>{card.title}</strong>
              <span>{card.blurb}</span>
              <small>{card.detail}</small>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
