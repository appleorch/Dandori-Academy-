import { Fragment, lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { audio } from './game/audio/audioManager';
import { InputController } from './game/commands/input';
import { useGameStore } from './game/core/gameStore';
import { levelForMode } from './game/modes/battle';
import { forDifficulty, LEVELS, levelById } from './game/world/level';
import { dayField } from './game/campaign/campaign';
import { CampScreen } from './ui/CampScreen';
import { SaveRecoveryNotice } from './ui/SaveRecoveryNotice';
import { CanvasErrorBoundary } from './ui/CanvasErrorBoundary';
import { setLocale, t } from './i18n/i18n';
import { CreditsScreen } from './ui/CreditsScreen';
import { Briefing } from './ui/Briefing';
import { Hud } from './ui/Hud';
import { BattleSelect } from './ui/BattleSelect';
import { ChallengeSelect } from './ui/ChallengeSelect';
import { MainMenu } from './ui/MainMenu';
import { StoryMap } from './ui/StoryMap';
import { useBoardPoster } from './ui/useBoardPoster';
import { PauseMenu } from './ui/PauseMenu';
import { ResultsScreen } from './ui/ResultsScreen';
import { StoryScreen } from './ui/StoryScreen';
import { TouchControls } from './ui/TouchControls';
import { useTouchDevice } from './ui/useTouchDevice';
import { usePadNavigation } from './ui/usePadNavigation';
import { useInputDevice } from './game/commands/device';
import { applyPalette } from './game/rendering/palette';

// Screens and scenes that are not needed to reach the main menu load when first opened. The 3D
// scene (three.js and the renderer) is the biggest: it loads when a day starts.
const GameCanvas = lazy(() =>
  import('./game/rendering/GameCanvas').then((m) => ({ default: m.GameCanvas })),
);
const PokerRoom = lazy(() => import('./poker/PokerRoom').then((m) => ({ default: m.PokerRoom })));
const AchievementsScreen = lazy(() =>
  import('./ui/AchievementsScreen').then((m) => ({ default: m.AchievementsScreen })),
);
const FieldGuide = lazy(() => import('./ui/FieldGuide').then((m) => ({ default: m.FieldGuide })));
const JournalScreen = lazy(() =>
  import('./ui/JournalScreen').then((m) => ({ default: m.JournalScreen })),
);
const LeaderboardScreen = lazy(() =>
  import('./ui/LeaderboardScreen').then((m) => ({ default: m.LeaderboardScreen })),
);
const SettingsScreen = lazy(() =>
  import('./ui/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
);
/** Shown while a lazily loaded screen arrives; it fades in late, so quick loads never flash it. */
function ScreenLoading() {
  return (
    <div className="loading-kiln" role="status">
      <span className="loading-kiln-glow" aria-hidden="true" />
      {t('loading.screen')}
    </div>
  );
}

/** Typing this anywhere outside a day opens the back room. */
const PASSWORD = 'allin';

export function App() {
  // The language is set before anything renders, and changing it redraws every screen.
  const locale = useGameStore((state) => state.settings.locale);
  setLocale(locale);
  const phase = useGameStore((state) => state.phase);
  const paused = useGameStore((state) => state.paused);
  const briefing = useGameStore((state) => state.briefing);
  const pokerOpen = useGameStore((state) => state.pokerOpen);
  const runId = useGameStore((state) => state.runId);
  const levelId = useGameStore((state) => state.levelId);
  const playDifficulty = useGameStore((state) => state.playDifficulty);
  const playMode = useGameStore((state) => state.playMode);
  // A story day's field depends on everything done on earlier days, read when the day starts.
  const storyRun = playMode === 'campaign' ? runId : -1;
  // Kept while the day lasts: a new object here would start the day over.
  const level = useMemo(
    () =>
      storyRun >= 0
        ? dayField(useGameStore.getState().save.campaign).level
        : levelForMode(forDifficulty(levelById(levelId) ?? LEVELS[0], playDifficulty), playMode),
    [levelId, playDifficulty, playMode, storyRun],
  );
  const palette = useGameStore((state) => state.settings.palette);
  const uiScale = useGameStore((state) => state.settings.uiScale);
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);
  const highContrast = useGameStore((state) => state.settings.highContrast);
  const device = useInputDevice((state) => state.device);
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);
  const musicVolume = useGameStore((state) => state.settings.musicVolume);
  const touch = useTouchDevice();
  const [input] = useState(() => InputController.forScreen(window.innerWidth, window.innerHeight));
  const inGame = phase === 'playing' || phase === 'results';
  const { theme } = level;

  useEffect(() => audio.setVolumes(sfxVolume, musicVolume), [sfxVolume, musicVolume]);
  // Accessibility settings reach every screen through the page root: the palette's colours,
  // the text size (the stylesheet sizes text in rem), and classes for motion and contrast.
  useEffect(() => {
    const root = document.documentElement;
    applyPalette(palette, root);
    root.style.fontSize = `${Math.round(uiScale * 100)}%`;
    root.classList.toggle('reduced-motion', reducedMotion);
    root.classList.toggle('high-contrast', highContrast);
  }, [palette, uiScale, reducedMotion, highContrast]);
  // Focus rings show while a gamepad is driving the menus.
  useEffect(() => {
    document.documentElement.classList.toggle('pad-nav', device === 'pad');
  }, [device]);
  usePadNavigation();
  // New personal bests go to the Academy board by themselves.
  useBoardPoster();

  // The soundtrack follows where the player is: the back room, a lesson's setting, or the menus.
  // During a day the game loop moves between the setting's tune and the boss tune by itself.
  useEffect(() => {
    audio.stopAmbience();
    if (pokerOpen) {
      audio.setScene('room');
      audio.playMusic('poker');
      audio.setMusicMood(1, false);
      audio.startAmbience();
    } else if (inGame) {
      audio.setScene(theme);
      audio.playMusic(theme);
      if (phase === 'results' || paused || briefing) audio.setMusicMood(0, false);
      audio.startAmbience();
    } else {
      audio.setScene('menu');
      audio.playMusic('menu');
      audio.setMusicMood(1, false);
    }
  }, [pokerOpen, inGame, phase, theme, paused, briefing]);

  // Every button clicks, and the password is listened for on the menus.
  useEffect(() => {
    let typed = '';
    const onClick = (event: MouseEvent): void => {
      if (event.target instanceof Element && event.target.closest('button')) audio.play('uiClick');
    };
    const onKey = (event: KeyboardEvent): void => {
      const store = useGameStore.getState();
      if (store.phase === 'playing' || store.pokerOpen || event.key.length !== 1) return;
      typed = (typed + event.key.toLowerCase()).slice(-PASSWORD.length);
      if (typed === PASSWORD) {
        audio.play('doorOpen');
        store.openPoker();
      }
    };
    document.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <Fragment key={locale}>
      <SaveRecoveryNotice />
      {phase === 'menu' && <MainMenu />}
      {phase === 'camp' && <CampScreen />}
      {phase === 'map' && <StoryMap />}
      {phase === 'challenges' && <ChallengeSelect />}
      {phase === 'battles' && <BattleSelect />}
      <Suspense fallback={<ScreenLoading />}>
        {phase === 'achievements' && <AchievementsScreen />}
        {phase === 'settings' && <SettingsScreen />}
        {phase === 'journal' && <JournalScreen />}
        {phase === 'leaderboard' && <LeaderboardScreen />}
        {phase === 'guide' && <FieldGuide />}
      </Suspense>
      {phase === 'credits' && <CreditsScreen />}
      {phase === 'story' && <StoryScreen />}
      {inGame && (
        <div className="game">
          <CanvasErrorBoundary onLeave={() => useGameStore.getState().leaveDay()}>
            <Suspense fallback={<ScreenLoading />}>
              <GameCanvas key={runId} level={level} input={input} />
            </Suspense>
          </CanvasErrorBoundary>
          <Hud level={level} touch={touch} input={input} />
          {touch && phase === 'playing' && !paused && !briefing && <TouchControls input={input} />}
          {phase === 'playing' && briefing && <Briefing level={level} />}
          {phase === 'playing' && paused && !pokerOpen && <PauseMenu level={level} />}
          {phase === 'results' && <ResultsScreen level={level} />}
        </div>
      )}
      {pokerOpen && (
        <Suspense fallback={<ScreenLoading />}>
          <PokerRoom />
        </Suspense>
      )}
    </Fragment>
  );
}
