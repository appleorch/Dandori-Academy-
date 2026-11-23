import { useGameStore, type MenuScreen } from '../game/core/gameStore';
import { BATTLE_IDS, CHALLENGE_IDS, MODES } from '../game/modes/modes';
import { storyCleared } from '../game/save/saveManager';
import { MAIN_LEVELS } from '../game/world/level';
import { nextStoryLesson, openLessons } from './lessonAccess';
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
 * played from its map; challenges and battles each have a screen of their own.
 */
export function MainMenu() {
  const save = useGameStore((state) => state.save);
  const lastPlayed = useGameStore((state) => state.levelId);
  const startDay = useGameStore((state) => state.startDay);
  const showScreen = useGameStore((state) => state.showScreen);
  const next = nextStoryLesson(save, lastPlayed);
  const fresh = save.story.day === 0 && save.totals.days === 0;
  const cleared = MAIN_LEVELS.filter((level) => storyCleared(save, level.id)).length;
  const open = openLessons(save).length;
  const medals = Object.keys(save.medals).length;
  const record = Object.values(save.battles).reduce(
    (sum, entry) => ({ won: sum.won + entry.won, lost: sum.lost + entry.lost }),
    { won: 0, lost: 0 },
  );

  const cards: ModeCard[] = [
    {
      screen: 'map',
      title: 'Story',
      blurb: MODES.story.summary,
      detail: `${cleared} of ${MAIN_LEVELS.length} lessons cleared · day ${save.story.day + 1}`,
      className: 'mode-card story',
    },
    {
      screen: 'challenges',
      title: 'Challenges',
      blurb: `${CHALLENGE_IDS.length} ways to score a lesson for medals and the leaderboard: ${CHALLENGE_IDS.map((id) => MODES[id].name).join(', ')}.`,
      detail: `${open} ${open === 1 ? 'lesson' : 'lessons'} open · ${medals} ${medals === 1 ? 'medal' : 'medals'} won`,
      className: 'mode-card challenge',
    },
    {
      screen: 'battles',
      title: 'Battles',
      blurb: `Race a rival Warden on a copy of the same field: ${BATTLE_IDS.map((id) => MODES[id].name).join(', ')}.`,
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
              : `The Grand Botanical & Clockwork Academy · Day ${save.story.day + 1}`}
          </p>
          <button
            type="button"
            className="hero-continue"
            onClick={() => startDay(next.id, 'story')}
            autoFocus
          >
            {fresh ? 'Begin the first lesson' : 'Continue the story'}
            <small>
              {next.stage}. {next.name}
            </small>
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
