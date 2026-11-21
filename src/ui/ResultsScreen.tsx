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
import { runStatus } from './LeaderboardScreen';
import { rankValue, type Rank } from '../game/dandori/scoring';
import type { Advice, DayTally } from '../game/dandori/tally';
import type { RunEntry } from '../game/leaderboard/runCode';
import { SprocketPortrait } from './Portrait';
import { evaluation } from '../game/story/headmaster';

const HEADLINES: Record<DayEnd, string> = {
  allCollected: 'Every Sunshard is home',
  timeUp: 'The day is over',
  captainDown: 'The Warden is down',
  wipedOut: 'No Sproutlings remain',
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
  note,
  value,
  delay,
  negative = false,
  total = false,
}: {
  label: string;
  /** A second line under the label: what the row was made of. */
  note?: string;
  value: number;
  delay: number;
  negative?: boolean;
  total?: boolean;
}) {
  const shown = useCountUp(value, delay);
  return (
    <tr className={total ? 'tally total' : 'tally'} style={{ animationDelay: `${delay}s` }}>
      <th>
        {label}
        {note && <small className="tally-note">{note}</small>}
      </th>
      <td>{negative && value > 0 ? `−${shown}` : shown}</td>
    </tr>
  );
}

/** The ranked bonus a lesson has, as "Twin pairs 0/1 · Dewglass whole 1/1", or null if none. */
function optionalNote(tally: DayTally): string | null {
  const { twins, dewglass } = tally.optional;
  const parts = [
    twins.of > 0 ? `Twin pairs ${twins.got}/${twins.of}` : null,
    dewglass.of > 0 ? `Dewglass whole ${dewglass.got}/${dewglass.of}` : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Whether the day went to the Academy board. */
function BoardLine({ run }: { run: RunEntry }) {
  const save = useGameStore((state) => state.save);
  const postRuns = useGameStore((state) => state.settings.postRuns);
  const status = runStatus(save, run, postRuns);
  const text =
    status === 'Posted'
      ? 'New personal best: posted to the Academy board.'
      : status === 'Posting…'
        ? 'New personal best: posting to the Academy board.'
        : status === 'Waiting (posting is off)'
          ? 'New personal best, kept to post: posting is off on the Leaderboard tab.'
          : 'Not a new personal best on this lesson, so the board keeps your earlier run.';
  return <p className="day-stats board-line">{text}</p>;
}

/** What the next rank would take, and every place the day left points behind. */
function NextRank({ advice }: { advice: Advice }) {
  return (
    <section className="next-rank" aria-label="How to do better">
      <h2>
        {advice.target ? (
          <>
            Next: <span className={`rank-${advice.target.toLowerCase()}`}>{advice.target}</span>
          </>
        ) : (
          'Top rank'
        )}
      </h2>
      <p>{advice.summary}</p>
      {advice.levers.length > 0 && (
        <ul>
          {advice.levers.map((lever) => (
            <li key={lever.kind} className={`lever ${lever.kind}`}>
              <span>{lever.text}</span>
              {lever.kind !== 'time' && <strong>+{lever.points}</strong>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const STINGERS: Record<Rank, SoundName> = {
  Diamond: 'rankDiamond',
  Platinum: 'rankPlatinum',
  Gold: 'rankGold',
  Silver: 'rankSilver',
  Bronze: 'rankBronze',
  Copper: 'rankCopper',
};

export function ResultsScreen({ level }: { level: LevelDefinition }) {
  const result = useGameStore((state) => state.result);
  const save = useGameStore((state) => state.save);
  const startDay = useGameStore((state) => state.startDay);
  const showScreen = useGameStore((state) => state.showScreen);
  const showStory = useGameStore((state) => state.showStory);
  const rank = result?.score.rank;
  const failed =
    result !== null &&
    result.reason !== 'allCollected' &&
    rank !== undefined &&
    rankValue(rank) < rankValue('Silver');
  // The fanfare matches the medal; a day that fell apart gets something more rueful.
  // The medal lands after the tally; its fanfare's first note (0.4s in) lands with it.
  useEffect(() => {
    if (!rank) return;
    const fanfare = window.setTimeout(() => audio.play(failed ? 'fail' : STINGERS[rank]), 1050);
    const thump = window.setTimeout(() => audio.play('logPlaced'), 1500);
    const ticks = [0.1, 0.3, 0.5, 0.7, 0.9, 1.1].map((at) =>
      window.setTimeout(() => audio.play('tick', { gain: 0.5 }), at * 1000),
    );
    return () => [fanfare, thump, ...ticks].forEach((timer) => window.clearTimeout(timer));
  }, [rank, failed]);
  // Focus the main button for keyboard players without scrolling the medal out of view.
  useEffect(() => {
    document.querySelector<HTMLElement>('.results [data-primary]')?.focus({ preventScroll: true });
  }, [result]);
  if (!result) return null;
  const { score, tally } = result;
  const bonusNote = optionalNote(tally);
  const { glowcaps, twins, dewglass } = tally.optional;
  const bonusGot = twins.got + dewglass.got;
  const bonusOf = twins.of + dewglass.of;
  const bonusPoints = twins.points + dewglass.points;
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
            <SprocketPortrait
              mood={rankValue(score.rank) < rankValue('Silver') ? 'muse' : 'cheer'}
            />
            <div>
              <blockquote>{evaluation(score.rank, level.id)}</blockquote>
              <figcaption>Headmaster Sprocket</figcaption>
            </div>
          </figure>
          <table>
            <tbody>
              <TallyRow
                label={`Sunshards ${tally.required.got} of ${tally.required.of}`}
                note="Required: every one must come home to clear the lesson"
                value={tally.required.points}
                delay={0.1}
              />
              <TallyRow
                label={
                  bonusNote
                    ? `Bonus treasure ${bonusGot} of ${bonusOf}`
                    : 'Bonus treasure: none in this lesson'
                }
                note={bonusNote ? `Optional: ${bonusNote}` : undefined}
                value={bonusPoints}
                delay={0.3}
              />
              <TallyRow
                label={tally.cleared ? `Time bonus (${tally.timeLeft}s left)` : 'Time bonus'}
                note={tally.cleared ? undefined : 'Only counts once every Sunshard is home'}
                value={score.timeBonus}
                delay={0.5}
              />
              <TallyRow
                label={`Sproutlings: ended with ${tally.sproutlings.alive}`}
                note={`Started with ${tally.sproutlings.start}, grew ${tally.sproutlings.grown}; this lesson can end with up to ${tally.sproutlings.possible}`}
                value={score.workerBonus}
                delay={0.7}
              />
              <TallyRow
                label={`Sproutlings lost: ${tally.sproutlings.lost}`}
                value={score.lossPenalty}
                delay={0.9}
                negative
              />
              {glowcaps.of > 0 ? (
                <>
                  <TallyRow
                    label="Ranked score"
                    note="What your rank is judged on"
                    value={score.ranked}
                    delay={1.1}
                    total
                  />
                  <TallyRow
                    label={`Glowcaps ${glowcaps.got} of ${glowcaps.of}`}
                    note="Extra: they add to your score, never to your rank"
                    value={score.glowcaps}
                    delay={1.3}
                  />
                  <TallyRow label="Total" value={score.total} delay={1.5} total />
                </>
              ) : (
                <TallyRow label="Total" value={score.total} delay={1.1} total />
              )}
            </tbody>
          </table>
          <NextRank advice={result.advice} />
          <p className="day-stats">
            Day finished in {formatTime(result.elapsed)} · {result.workersAlive} Sproutlings home ·{' '}
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
          {result.caveRelics > 0 && (
            <p className="day-stats">
              Relics brought up from below: {result.caveRelics} (added to the Field Guide)
            </p>
          )}
          {result.isBestScore && <p className="best">New best score</p>}
          {result.run && <BoardLine run={result.run} />}
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
