import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { audio } from './game/audio/audioManager';
import { initPhysics } from './game/simulation/physics';
import { recordError } from './game/core/errorLog';
import { GAME_VERSION } from './game/core/changelog';
import './ui/ui.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// Anything uncaught goes in the local error log, for the player to copy into a bug report.
window.addEventListener('error', (event) =>
  recordError('uncaught', event.error ?? event.message, GAME_VERSION),
);
window.addEventListener('unhandledrejection', (event) =>
  recordError('unhandled promise', event.reason, GAME_VERSION),
);

// Browsers only allow sound after the player has interacted with the page.
// iOS only counts the end of a touch, so every kind of press is listened for.
for (const gesture of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const) {
  window.addEventListener(gesture, () => audio.unlock());
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The physics engine and the 3D scene are large and only needed in a day: fetch them once the
// menus are up, so the first day still starts at once.
const preload = (): void => {
  void initPhysics();
  void import('./game/rendering/GameCanvas');
};
if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 4000 });
else setTimeout(preload, 1500);

// Installable and playable offline once opened (see public/sw.js). Production builds only: the
// development server serves fresh files on every reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // No offline play then; the game itself works the same.
    });
  });
}
