import { t } from '../i18n/i18n';
import { useState } from 'react';
import { audio } from '../game/audio/audioManager';
import { useGameStore } from '../game/core/gameStore';
import { EPILOGUE, PROLOGUE } from '../game/story/story';

/** The prologue before the first lesson, or the ending after the last: a few pages of text. */
export function StoryScreen() {
  const kind = useGameStore((state) => state.storyKind);
  const showScreen = useGameStore((state) => state.showScreen);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const [page, setPage] = useState(0);
  const pages = kind === 'prologue' ? PROLOGUE : EPILOGUE;
  const last = page === pages.length - 1;

  const finish = (): void => {
    if (kind === 'prologue') updateSettings({ seenIntro: true });
    showScreen(kind === 'prologue' ? 'menu' : 'journal');
  };
  const turn = (): void => {
    audio.play('page');
    if (last) finish();
    else setPage(page + 1);
  };

  return (
    <main className={`screen story ${kind}`}>
      <div className="panel story-panel">
        <p className="eyebrow">
          {kind === 'prologue' ? t('ui.storyScreen.dandoriAcademy') : t('ui.storyScreen.epilogue')}
        </p>
        <h1>
          {kind === 'prologue'
            ? t('ui.storyScreen.theFireIsLow')
            : t('ui.storyScreen.bothFiresBurning')}
        </h1>
        <p key={page} className="story-page">
          {pages[page]}
        </p>
        <p
          className="story-dots"
          aria-label={t('ui.storyScreen.pageOf', { v1: page + 1, length: pages.length })}
        >
          {pages.map((_, i) => (
            <span key={i} className={i === page ? 'dot-on' : undefined} />
          ))}
        </p>
        <button type="button" onClick={turn} autoFocus>
          {last
            ? kind === 'prologue'
              ? t('ui.storyScreen.toTheAcademy')
              : t('ui.storyScreen.closeTheBook')
            : t('ui.storyScreen.next')}
        </button>
        {!last && (
          <button type="button" className="secondary" onClick={finish}>
            {t('ui.storyScreen.skip')}
          </button>
        )}
      </div>
    </main>
  );
}
