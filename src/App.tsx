import { useEffect, useState } from 'react';
import { audio } from './game/audio/audioManager';
import { InputController } from './game/commands/input';
import { useGameStore } from './game/core/gameStore';
import { GameCanvas } from './game/rendering/GameCanvas';
import { forDifficulty, LEVELS } from './game/world/level';
import { PokerRoom } from './poker/PokerRoom';
import { AchievementsScreen } from './ui/AchievementsScreen';
import { Briefing } from './ui/Briefing';
import { Hud } from './ui/Hud';
import { JournalScreen } from './ui/JournalScreen';
import { LessonSelect } from './ui/LessonSelect';
import { PauseMenu } from './ui/PauseMenu';
import { ResultsScreen } from './ui/ResultsScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { StoryScreen } from './ui/StoryScreen';
import { TouchControls } from './ui/TouchControls';
import { useTouchDevice } from './ui/useTouchDevice';

/** Typing this anywhere outside a day opens the back room. */
const PASSWORD = 'allin';

export function App() {
  const phase = useGameStore((state) => state.phase);
  const paused = useGameStore((state) => state.paused);
  const briefing = useGameStore((state) => state.briefing);
  const pokerOpen = useGameStore((state) => state.pokerOpen);
  const runId = useGameStore((state) => state.runId);
  const levelId = useGameStore((state) => state.levelId);
  const playDifficulty = useGameStore((state) => state.playDifficulty);
  const level = forDifficulty(
    LEVELS.find((candidate) => candidate.id === levelId) ?? LEVELS[0],
    playDifficulty,
  );
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);
  const musicVolume = useGameStore((state) => state.settings.musicVolume);
  const touch = useTouchDevice();
  const [input] = useState(() => InputController.forScreen(window.innerWidth, window.innerHeight));
  const inGame = phase === 'playing' || phase === 'results';
  const { theme } = level;

  useEffect(() => audio.setVolumes(sfxVolume, musicVolume), [sfxVolume, musicVolume]);

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
    <>
      {phase === 'menu' && <LessonSelect />}
      {phase === 'achievements' && <AchievementsScreen />}
      {phase === 'settings' && <SettingsScreen />}
      {phase === 'journal' && <JournalScreen />}
      {phase === 'story' && <StoryScreen />}
      {inGame && (
        <div className="game">
          <GameCanvas key={runId} level={level} input={input} />
          <Hud level={level} touch={touch} />
          {touch && phase === 'playing' && !paused && !briefing && <TouchControls input={input} />}
          {phase === 'playing' && briefing && <Briefing level={level} />}
          {phase === 'playing' && paused && !pokerOpen && <PauseMenu level={level} />}
          {phase === 'results' && <ResultsScreen level={level} />}
        </div>
      )}
      {pokerOpen && <PokerRoom />}
    </>
  );
}
