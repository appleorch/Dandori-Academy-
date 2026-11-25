import { t } from '../i18n/i18n';
import { useGameStore } from '../game/core/gameStore';
import { storyCleared, type SaveData } from '../game/save/saveManager';
import { CHAPTERS, LESSON_STORY } from '../game/story/story';
import { LEVELS } from '../game/world/level';
import { MenuNav } from './MenuNav';
import { TindlePortrait } from './Portrait';

/** A lesson is written up once it has been cleared in the story, on either difficulty. */
function passed(save: SaveData, levelId: string): boolean {
  return storyCleared(save, levelId, 'normal') || storyCleared(save, levelId, 'hard');
}

/** The cadet's journal: the story so far, one entry per lesson passed, with Tindle's notes in the margin. */
export function JournalScreen() {
  const save = useGameStore((state) => state.save);
  const showStory = useGameStore((state) => state.showStory);
  const written = LEVELS.filter((level) => passed(save, level.id)).length;
  const finished = passed(save, 'restoration-day');

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>{t('ui.journalScreen.journal')}</h1>
        <p>
          {written} {t('ui.journalScreen.of')} {LEVELS.length}{' '}
          {t('ui.journalScreen.entriesWrittenAnEntry')}
        </p>
        <div className="button-row">
          <button type="button" className="secondary small" onClick={() => showStory('prologue')}>
            {t('ui.journalScreen.readThePrologue')}
          </button>
          {finished && (
            <button type="button" className="secondary small" onClick={() => showStory('epilogue')}>
              {t('ui.journalScreen.readTheEnding')}
            </button>
          )}
        </div>
        {save.campaign.log.length > 0 && (
          <section className="warden-log">
            <h2>{t('ui.journalScreen.theWardenSLog')}</h2>
            <ol reversed>
              {[...save.campaign.log].reverse().map((entry) => (
                <li key={entry.day}>{entry.text}</li>
              ))}
            </ol>
          </section>
        )}
        {CHAPTERS.map((chapter) => {
          const lessons = LEVELS.filter(
            (level) => level.stage >= chapter.from && level.stage <= chapter.to,
          );
          const open = lessons.every((level) => level.side)
            ? lessons.some((level) => save.discovered.includes(level.id))
            : save.stage >= chapter.from;
          const complete = lessons.every((level) => passed(save, level.id));
          return (
            <section key={chapter.id} className="journal-chapter">
              <h2>
                <small>{chapter.label}</small>{' '}
                {open ? chapter.title : t('ui.journalScreen.notYetReached')}
              </h2>
              {open && <p className="chapter-intro">{chapter.intro}</p>}
              {open && (
                <ol className="journal-entries" start={chapter.from}>
                  {lessons.map((level) => (
                    <li key={level.id} className={passed(save, level.id) ? undefined : 'blank'}>
                      <strong>{level.name}</strong>
                      <span>
                        {passed(save, level.id)
                          ? LESSON_STORY[level.id]?.journal
                          : t('ui.journalScreen.thisPageIsStill')}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {complete && (
                <aside className="margin-note">
                  <TindlePortrait />
                  <p>{chapter.margin}</p>
                </aside>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
