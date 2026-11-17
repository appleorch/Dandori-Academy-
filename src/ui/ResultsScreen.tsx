import { useEffect } from 'react';
import { audio, type SoundName } from '../game/audio/audioManager';
import { useGameStore } from '../game/core/gameStore';
import { LESSON_STORY } from '../game/story/story';
import { formatTime } from './format';
import { findAchievement } from '../game/progression/achievements';
import { HARD_UNLOCK_RANK, hardUnlocked, UNLOCK_RANK } from '../game/save/saveManager';
import type { DayEnd } from '../game/simulation/Simulation';
import { LEVELS, type LevelDefinition } from '../game/world/level';
import { RankTargets } from './RankTargets';

const HEADLINES: Record<DayEnd, string> = {
  allCollected: 'Every Sunshard is home',
  timeUp: 'The day is over',
  captainDown: 'The Warden is down',
  wipedOut: 'No Emberlings remain',
};

const STINGERS: Record<string, SoundName> = {
  Platinum: 'rankPlatinum',
  Gold: 'rankGold',
  Silver: 'rankSilver',
  Bronze: 'rankBronze',
};

export function ResultsScreen({ level }: { level: LevelDefinition }) {
  const result = useGameStore((state) => state.result);
  const save = useGameStore((state) => state.save);
  const startDay = useGameStore((state) => state.startDay);
  const showScreen = useGameStore((state) => state.showScreen);
  const showStory = useGameStore((state) => state.showStory);
  const rank = result?.score.rank;
  const failed = result !== null && result.reason !== 'allCollected' && rank === 'Bronze';
  // The fanfare matches the medal; a day that fell apart gets something more rueful.
  useEffect(() => {
    if (rank) audio.play(failed ? 'fail' : STINGERS[rank]);
  }, [rank, failed]);
  if (!result) return null;
  const { score } = result;
  const hard = level.difficulty === 'hard';
  const next = LEVELS.find((candidate) => candidate.stage === level.stage + 1);
  const nextUnlocked =
    next !== undefined && next.stage <= save.stage && (!hard || hardUnlocked(save, next.id));

  return (
    <div className="screen overlay">
      <div className="panel">
        <p className="eyebrow">
          {hard ? 'Hard · ' : ''}
          {HEADLINES[result.reason]}
        </p>
        <h1 className={`rank rank-${score.rank.toLowerCase()}`}>{score.rank}</h1>
        <table>
          <tbody>
            <tr>
              <th>
                Sunshards ({result.treasuresCollected}/{result.treasuresTotal})
              </th>
              <td>{score.treasure}</td>
            </tr>
            <tr>
              <th>Time bonus</th>
              <td>{score.timeBonus}</td>
            </tr>
            <tr>
              <th>Emberlings alive</th>
              <td>{score.workerBonus}</td>
            </tr>
            <tr>
              <th>Emberlings lost</th>
              <td>{score.lossPenalty > 0 ? `−${score.lossPenalty}` : 0}</td>
            </tr>
            <tr className="total">
              <th>Total</th>
              <td>{score.total}</td>
            </tr>
          </tbody>
        </table>
        <p className="day-stats">
          Day finished in {formatTime(result.elapsed)} · {result.workersAlive} Emberlings home ·{' '}
          {result.enemiesDefeated} {result.enemiesDefeated === 1 ? 'enemy' : 'enemies'} defeated
        </p>
        {result.isBestScore && <p className="best">New best score</p>}
        {result.reason === 'allCollected' && LESSON_STORY[level.id] && (
          <blockquote className="journal-note">
            <small>{result.firstClear ? 'New journal entry' : 'From the journal'}</small>
            {LESSON_STORY[level.id].journal}
          </blockquote>
        )}
        {result.unlockedNext && next && <p className="best">Unlocked: {next.name}</p>}
        {result.achievements.length > 0 && (
          <div className="unlocks">
            <p className="eyebrow">
              {result.achievements.length === 1
                ? 'Achievement unlocked'
                : `${result.achievements.length} achievements unlocked`}
            </p>
            <ul>
              {result.achievements.map((id) => {
                const achievement = findAchievement(id);
                return (
                  achievement && (
                    <li key={id}>
                      <strong>{achievement.name}</strong> {achievement.description}
                    </li>
                  )
                );
              })}
            </ul>
          </div>
        )}
        <RankTargets level={level} earned={score.rank} />
        {next && !nextUnlocked && (
          <p>
            {hard
              ? `${next.name} opens on Hard after ${HARD_UNLOCK_RANK} on Normal.`
              : `Earn ${UNLOCK_RANK} or better to open the next lesson.`}
          </p>
        )}
        {!next && result.reason === 'allCollected' && (
          <button type="button" onClick={() => showStory('epilogue')} autoFocus>
            Read the ending
          </button>
        )}
        {next && nextUnlocked && (
          <button type="button" onClick={() => startDay(next.id)} autoFocus>
            Next lesson: {next.name}
          </button>
        )}
        <button
          type="button"
          className={nextUnlocked ? 'secondary' : undefined}
          onClick={() => startDay(level.id)}
          autoFocus={!nextUnlocked}
        >
          Try again <kbd>R</kbd>
        </button>
        <button type="button" className="secondary" onClick={() => showScreen('menu')}>
          All lessons
        </button>
      </div>
    </div>
  );
}
