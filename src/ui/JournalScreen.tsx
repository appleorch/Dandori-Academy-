import { useGameStore } from '../game/core/gameStore';
import { rankValue } from '../game/dandori/scoring';
import { bestRank, UNLOCK_RANK, type SaveData } from '../game/save/saveManager';
import { CHAPTERS, LESSON_STORY } from '../game/story/story';
import { LEVELS } from '../game/world/level';
import { MenuNav } from './MenuNav';
import { TindlePortrait } from './Portrait';

/** A lesson is written up once it has been passed on either difficulty. */
function passed(save: SaveData, levelId: string): boolean {
  return (['normal', 'hard'] as const).some((difficulty) => {
    const rank = bestRank(save, levelId, difficulty);
    return rank !== null && rankValue(rank) >= rankValue(UNLOCK_RANK);
  });
}

/** The cadet's journal: the story so far, one entry per lesson passed, with Tindle's notes in the margin. */
export function JournalScreen() {
  const save = useGameStore((state) => state.save);
  const showStory = useGameStore((state) => state.showStory);
  const written = LEVELS.filter((level) => passed(save, level.id)).length;
  const finished = passed(save, 'the-undercroft');

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>Journal</h1>
        <p>
          {written} of {LEVELS.length} entries written. An entry is added each time a lesson is
          passed at {UNLOCK_RANK} or better.
        </p>
        <div className="button-row">
          <button type="button" className="secondary small" onClick={() => showStory('prologue')}>
            Read the prologue
          </button>
          {finished && (
            <button type="button" className="secondary small" onClick={() => showStory('epilogue')}>
              Read the ending
            </button>
          )}
        </div>
        {CHAPTERS.map((chapter) => {
          const lessons = LEVELS.filter(
            (level) => level.stage >= chapter.from && level.stage <= chapter.to,
          );
          const open = save.stage >= chapter.from;
          const complete = lessons.every((level) => passed(save, level.id));
          return (
            <section key={chapter.id} className="journal-chapter">
              <h2>
                <small>{chapter.label}</small> {open ? chapter.title : 'Not yet reached'}
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
                          : 'This page is still blank.'}
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
