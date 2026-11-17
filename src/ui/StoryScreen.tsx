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
        <p className="eyebrow">{kind === 'prologue' ? 'Dandori Academy' : 'Epilogue'}</p>
        <h1>{kind === 'prologue' ? 'The fire is low' : 'Both fires burning'}</h1>
        <p key={page} className="story-page">
          {pages[page]}
        </p>
        <p className="story-dots" aria-label={`Page ${page + 1} of ${pages.length}`}>
          {pages.map((_, i) => (
            <span key={i} className={i === page ? 'dot-on' : undefined} />
          ))}
        </p>
        <button type="button" onClick={turn} autoFocus>
          {last ? (kind === 'prologue' ? 'To the lessons' : 'Close the book') : 'Next'}
        </button>
        {!last && (
          <button type="button" className="secondary" onClick={finish}>
            Skip
          </button>
        )}
      </div>
    </main>
  );
}
