import { useGameStore, type MenuScreen } from '../game/core/gameStore';
import { BATTLE_IDS, CHALLENGE_IDS } from '../game/modes/modes';
import { storyCleared } from '../game/save/saveManager';
import { CHALLENGE_LEVELS, MAIN_LEVELS } from '../game/world/level';
import { currentSection, sectionProgress } from '../game/campaign/campaign';
import { hasMedal, nextStoryLesson } from './lessonAccess';
import { MenuNav } from './MenuNav';
import { t } from '../i18n/i18n';
import { fieldName, modeName, modeSummary, sectionName } from '../i18n/gameText';

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
      title: t('menu.card.story'),
      blurb: modeSummary('campaign'),
      detail: t('menu.card.storyDetail', {
        section: sectionName(section),
        day: save.campaign.day + 1,
        parts: progress.parts,
        total: progress.partsTotal,
      }),
      className: 'mode-card campaign',
    },
    {
      screen: 'map',
      title: t('menu.card.timeAttack'),
      blurb: modeSummary('lessons'),
      detail: t('menu.card.timeAttackDetail', { cleared, total: MAIN_LEVELS.length }),
      className: 'mode-card lessons',
    },
    {
      screen: 'challenges',
      title: t('menu.card.challenges'),
      blurb: t('menu.card.challengesBlurb', {
        count: CHALLENGE_IDS.length,
        names: CHALLENGE_IDS.map(modeName).join(', '),
      }),
      detail: t('menu.card.challengesDetail', { medals, total: CHALLENGE_LEVELS.length }),
      className: 'mode-card challenge',
    },
    {
      screen: 'battles',
      title: t('menu.card.battles'),
      blurb: t('menu.card.battlesBlurb', { names: BATTLE_IDS.map(modeName).join(', ') }),
      detail: t('menu.card.battlesDetail', { won: record.won, lost: record.lost }),
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
          <p className="hero-title">{t('menu.title')}</p>
          <p className="hero-sub">
            {fresh ? t('menu.subtitleFirst') : t('menu.subtitle', { day: save.campaign.day + 1 })}
          </p>
          <button
            type="button"
            className="hero-continue"
            onClick={() => showScreen('camp')}
            autoFocus
          >
            {save.campaign.day === 0 ? t('menu.beginStory') : t('menu.continueStory')}
            <small>
              {t('menu.storyWhere', { section: sectionName(section), day: save.campaign.day + 1 })}
            </small>
          </button>
          <button
            type="button"
            className="secondary hero-lesson"
            onClick={() => startDay(next.id, 'lessons')}
          >
            {t('menu.timeAttackNext', { lesson: fieldName(next) })}
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
