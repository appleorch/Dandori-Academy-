import { useEffect, useState } from 'react';
import { audio, type SoundName } from '../game/audio/audioManager';
import { useGameStore } from '../game/core/gameStore';
import { LESSON_STORY } from '../game/story/story';
import { formatTime } from './format';
import { findAchievement } from '../game/progression/achievements';
import { HARD_UNLOCK_RANK, hardUnlocked, UNLOCK_RANK } from '../game/save/saveManager';
import type { DayEnd } from '../game/simulation/Simulation';
import { LEVELS, MAIN_LEVELS, type LevelDefinition } from '../game/world/level';
import { RankTargets } from './RankTargets';
import { SprocketPortrait } from './Portrait';
import { evaluation } from '../game/story/headmaster';

const HEADLINES: Record<DayEnd, string> = {
  allCollected: 'Every Sunshard is home',
  timeUp: 'The day is over',
  captainDown: 'The Warden is down',
  wipedOut: 'No Emberlings remain',
};

/** Counts from 0 up to `target` once `delay` seconds have passed, easing out. */
function useCountUp(target: number, delay: number, seconds = 0.7): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now() + delay * 1000;
    const tick = (now: number): void => {
      const t = Math.min(1, Math.max(0, (now - start) / (seconds * 1000)));
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, delay, seconds]);
  return value;
}

/** One row of the tally: it counts up in its turn. */
function TallyRow({
  label,
  value,
  delay,
  negative = false,
  total = false,
}: {
  label: string;
  value: number;
  delay: number;
  negative?: boolean;
  total?: boolean;
}) {
  const shown = useCountUp(value, delay);
  return (
    <tr className={total ? 'tally total' : 'tally'} style={{ animationDelay: `${delay}s` }}>
      <th>{label}</th>
      <td>{negative && value > 0 ? `−${shown}` : shown}</td>
    </tr>
  );
}

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
  // The medal lands after the tally; its fanfare's first note (0.4s in) lands with it.
  useEffect(() => {
    if (!rank) return;
    const fanfare = window.setTimeout(() => audio.play(failed ? 'fail' : STINGERS[rank]), 1050);
    const thump = window.setTimeout(() => audio.play('logPlaced'), 1500);
    const ticks = [0.1, 0.35, 0.6, 0.85, 1.1].map((at) =>
      window.setTimeout(() => audio.play('tick', { gain: 0.5 }), at * 1000),
    );
    return () => [fanfare, thump, ...ticks].forEach((timer) => window.clearTimeout(timer));
  }, [rank, failed]);
  // Focus the main button for keyboard players without scrolling the medal out of view.
  useEffect(() => {
    document.querySelector<HTMLElement>('.results [data-primary]')?.focus({ preventScroll: true });
  }, [result]);
  if (!result) return null;
  const { score } = result;
  const hard = level.difficulty === 'hard';
  const next = level.side
    ? undefined
    : MAIN_LEVELS.find((candidate) => candidate.stage === level.stage + 1);
  const below = LEVELS.find(
    (candidate) => candidate.id === level.descent?.to && save.discovered.includes(candidate.id),
  );
  const nextUnlocked =
    next !== undefined && next.stage <= save.stage && (!hard || hardUnlocked(save, next.id));

  return (
    <div className="screen overlay">
      <div className="panel results">
        <section className="results-main">
          <p className="eyebrow">
            {hard ? 'Hard · ' : ''}
            {HEADLINES[result.reason]}
          </p>
          <h1 className={`rank stamp rank-${score.rank.toLowerCase()}`}>{score.rank}</h1>
          <figure className="speech verdict">
            <SprocketPortrait mood={score.rank === 'Bronze' ? 'muse' : 'cheer'} />
            <div>
              <blockquote>{evaluation(score.rank, level.id)}</blockquote>
              <figcaption>Headmaster Sprocket</figcaption>
            </div>
          </figure>
          <table>
            <tbody>
              <TallyRow
                label={`Sunshards (${result.treasuresCollected}/${result.treasuresTotal})`}
                value={score.treasure}
                delay={0.1}
              />
              <TallyRow label="Time bonus" value={score.timeBonus} delay={0.35} />
              <TallyRow label="Emberlings alive" value={score.workerBonus} delay={0.6} />
              <TallyRow label="Emberlings lost" value={score.lossPenalty} delay={0.85} negative />
              <TallyRow label="Total" value={score.total} delay={1.1} total />
            </tbody>
          </table>
          <p className="day-stats">
            Day finished in {formatTime(result.elapsed)} · {result.workersAlive} Emberlings home ·{' '}
            {result.enemiesDefeated} {result.enemiesDefeated === 1 ? 'enemy' : 'enemies'} defeated
          </p>
          {result.clearTime !== null && (
            <p
              className={
                result.previousBest === null || result.clearTime < result.previousBest
                  ? 'pb new'
                  : 'pb'
              }
            >
              Cleared in <strong>{formatTime(result.clearTime)}</strong>
              {result.previousBest === null
                ? ' · first clear'
                : result.clearTime < result.previousBest
                  ? ` · new personal best, ${(result.previousBest - result.clearTime).toFixed(1)}s faster`
                  : ` · best ${formatTime(result.previousBest)} (+${(result.clearTime - result.previousBest).toFixed(1)}s)`}
            </p>
          )}
          {result.bestChain >= 3 && <p className="day-stats">Longest chain: ×{result.bestChain}</p>}
          {result.isBestScore && <p className="best">New best score</p>}
          {result.unlockedNext && next && <p className="best">Unlocked: {next.name}</p>}
          <div className="results-actions">
            {next && !nextUnlocked && (
              <p>
                {hard
                  ? `${next.name} opens on Hard after ${HARD_UNLOCK_RANK} on Normal.`
                  : `Earn ${UNLOCK_RANK} or better to open the next lesson.`}
              </p>
            )}
            {level.id === 'restoration-day' && result.reason === 'allCollected' && (
              <button type="button" onClick={() => showStory('epilogue')} data-primary>
                Read the ending
              </button>
            )}
            {next && nextUnlocked && (
              <button type="button" onClick={() => startDay(next.id)} data-primary>
                Next lesson: {next.name}
              </button>
            )}
            <button
              type="button"
              className={nextUnlocked ? 'secondary' : undefined}
              onClick={() => startDay(level.id)}
              data-primary={!nextUnlocked || undefined}
            >
              Try again <kbd>R</kbd>
            </button>
            {below && (
              <button type="button" className="secondary" onClick={() => startDay(below.id)}>
                Go down to {below.name}
              </button>
            )}
            <button type="button" className="secondary" onClick={() => showScreen('menu')}>
              All lessons
            </button>
          </div>
        </section>
        <section className="results-side">
          {result.reason === 'allCollected' && LESSON_STORY[level.id] && (
            <blockquote className="journal-note">
              <small>{result.firstClear ? 'New journal entry' : 'From the journal'}</small>
              {LESSON_STORY[level.id].journal}
            </blockquote>
          )}
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
        </section>
      </div>
    </div>
  );
}
