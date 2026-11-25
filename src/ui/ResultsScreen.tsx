import { useEffect, useState, type ReactNode } from 'react';
import { audio, type SoundName } from '../game/audio/audioManager';
import { useGameStore, type DayResult } from '../game/core/gameStore';
import { rankValue, type Rank } from '../game/dandori/scoring';
import type { RunEntry } from '../game/leaderboard/runCode';
import { RIVAL_NAMES } from '../game/modes/battle';
import { isChallenge, medalGate, medalTargets, MODES } from '../game/modes/modes';
import { findAchievement } from '../game/progression/achievements';
import { hardUnlocked } from '../game/save/saveManager';
import { battleVerdict, evaluation, storyVerdict } from '../game/story/headmaster';
import { LESSON_STORY } from '../game/story/story';
import type { DayEnd } from '../game/simulation/Simulation';
import { LEVELS, MAIN_LEVELS, type LevelDefinition } from '../game/world/level';
import { formatTime } from './format';
import { relicFor } from '../game/story/relics';
import { SPROUT_KINDS, SPROUTS } from '../game/workers/sprouts';
import { runStatus } from './runStatus';
import { ModeTargets } from './ModeTargets';
import { SprocketPortrait } from './Portrait';
import { t } from '../i18n/i18n';
import type { MessageKey } from '../i18n/en';
import { timeMedal } from '../game/modes/timeAttack';
import { ActionPrompt } from './Glyph';

const HEADLINES: Record<DayEnd, string> = {
  allCollected: 'Every Sunshard is home',
  timeUp: 'The day is over',
  captainDown: 'The Warden is down',
  wipedOut: 'No Sproutlings remain',
  endedEarly: 'The day was ended early',
  decided: 'The race is decided',
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

/** One row of a challenge's tally: it counts up in its turn. */
function TallyRow({
  label,
  note,
  value,
  delay,
  total = false,
}: {
  label: string;
  note?: string;
  value: number;
  delay: number;
  total?: boolean;
}) {
  const shown = useCountUp(value, delay);
  return (
    <tr className={total ? 'tally total' : 'tally'} style={{ animationDelay: `${delay}s` }}>
      <th>
        {label}
        {note && <small className="tally-note">{note}</small>}
      </th>
      <td>{shown}</td>
    </tr>
  );
}

/** One row of a Time Attack day's count: no points, just what happened. */
function CountRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <tr className="tally">
      <th>
        {label}
        {note && <small className="tally-note">{note}</small>}
      </th>
      <td>{value}</td>
    </tr>
  );
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
          : 'Not a new personal best here, so the board keeps your earlier run.';
  return <p className="day-stats board-line">{text}</p>;
}

const STINGERS: Record<Rank, SoundName> = {
  Diamond: 'rankDiamond',
  Platinum: 'rankPlatinum',
  Gold: 'rankGold',
  Silver: 'rankSilver',
  Bronze: 'rankBronze',
  Copper: 'rankCopper',
};

/** The fanfare a day ends on: the medal's, the win's, or something more rueful. */
function stingerFor(result: DayResult): SoundName {
  if (result.battle) {
    return result.battle.outcome === 'won'
      ? 'rankPlatinum'
      : result.battle.outcome === 'drawn'
        ? 'rankSilver'
        : 'fail';
  }
  if (result.challenge) {
    const { rank } = result.challenge;
    return rankValue(rank) < rankValue('Bronze') ? 'fail' : STINGERS[rank];
  }
  return result.tally.cleared ? 'rankGold' : 'fail';
}

/** The outcome of a day in one sentence, for screen readers. */
function resultSummary(result: DayResult): string {
  if (result.campaign) {
    const report = result.campaign;
    return `Day ${report.day} over. Clock parts home: ${report.partsHome} of ${report.partsTotal}.`;
  }
  if (result.battle) {
    const word = { won: 'You won', lost: 'You lost', drawn: 'A draw' }[result.battle.outcome];
    return `${word}: ${result.battle.you} to ${result.battle.rival} ${result.battle.unit}.`;
  }
  if (result.challenge) {
    return `${result.challenge.rank} medal, ${result.challenge.total} points.`;
  }
  return result.tally.cleared
    ? `Cleared${result.clearTime !== null ? ` in ${formatTime(result.clearTime)}` : ''}.`
    : 'Not cleared yet.';
}

/** The Headmaster has his say. */
function Verdict({ text, happy }: { text: string; happy: boolean }) {
  return (
    <figure className="speech verdict">
      <SprocketPortrait mood={happy ? 'cheer' : 'muse'} />
      <div>
        <blockquote>{text}</blockquote>
        <figcaption>Headmaster Sprocket</figcaption>
      </div>
    </figure>
  );
}

/** A Time Attack day: cleared or not, the clear time against your best, and the day counted. */
function StoryBody({ result, level }: { result: DayResult; level: LevelDefinition }) {
  const { tally } = result;
  const { twins, dewglass, glowcaps } = tally.optional;
  const bonus = [
    twins.of > 0 ? `twin pairs ${twins.got} of ${twins.of}` : null,
    dewglass.of > 0 ? `Dewglass whole ${dewglass.got} of ${dewglass.of}` : null,
    glowcaps.of > 0 ? `Glowcaps ${glowcaps.got} of ${glowcaps.of}` : null,
  ].filter((part) => part !== null);
  return (
    <>
      <h1 className={`rank stamp ${tally.cleared ? 'rank-gold' : 'rank-copper'}`}>
        {tally.cleared ? 'Cleared' : 'Not yet'}
      </h1>
      <Verdict text={storyVerdict(tally.cleared, level.id)} happy={tally.cleared} />
      <table>
        <tbody>
          <CountRow
            label="Sunshards"
            value={`${tally.required.got} of ${tally.required.of}`}
            note="Every one must come home to clear the lesson"
          />
          {bonus.length > 0 && (
            <CountRow
              label="Optional treasure"
              value={`${twins.got + dewglass.got + glowcaps.got} of ${twins.of + dewglass.of + glowcaps.of}`}
              note={bonus.join(' · ')}
            />
          )}
          <CountRow
            label="Sproutlings"
            value={`${tally.sproutlings.alive} home`}
            note={`Started with ${tally.sproutlings.start}, grew ${tally.sproutlings.grown}, lost ${tally.sproutlings.lost}`}
          />
          <CountRow
            label="Academy pace"
            value={formatTime(level.platinumTime)}
            note={`The Academy’s test player clears it in this; ${formatTime(level.diamondTime)} is a record pace`}
          />
          {result.newRelics > 0 && (
            <CountRow
              label="New relics"
              value={String(result.newRelics)}
              note="Added to the Field Guide"
            />
          )}
        </tbody>
      </table>
      {result.clearTime !== null && (
        <p
          className={
            result.previousBest === null || result.clearTime < result.previousBest ? 'pb new' : 'pb'
          }
        >
          Cleared in <strong>{formatTime(result.clearTime)}</strong>
          {result.previousBest === null
            ? ' · first clear'
            : result.clearTime < result.previousBest
              ? ` · your fastest yet, ${(result.previousBest - result.clearTime).toFixed(1)}s faster`
              : ` · fastest ${formatTime(result.previousBest)} (+${(result.clearTime - result.previousBest).toFixed(1)}s)`}
        </p>
      )}
      {result.clearTime !== null && (
        <p className={`time-medal ${timeMedal(level, result.clearTime).toLowerCase()}`}>
          Time medal: <strong>{timeMedal(level, result.clearTime)}</strong>
        </p>
      )}
      {result.clearTime !== null && result.splits.length > 1 && (
        <table className="splits">
          <thead>
            <tr>
              <th scope="col">Sunshard</th>
              <th scope="col">Today</th>
              <th scope="col">Fastest before</th>
            </tr>
          </thead>
          <tbody>
            {result.splits.map((time, i) => {
              const best = result.previousSplits?.[i];
              const diff = best === undefined ? null : time - best;
              return (
                <tr key={i} className={diff !== null && diff < 0 ? 'met' : undefined}>
                  <th scope="row">{i + 1}</th>
                  <td>{formatTime(time)}</td>
                  <td>
                    {best === undefined
                      ? '–'
                      : `${formatTime(best)} (${diff !== null && diff <= 0 ? '' : '+'}${(diff ?? 0).toFixed(1)}s)`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!tally.cleared && (
        <p className="day-stats">
          Bring every Sunshard home to clear {level.name} and open the next lesson.
        </p>
      )}
    </>
  );
}

/** A challenge: its own tally, the medal, and what the next medal needs. */
function ChallengeBody({ result, level }: { result: DayResult; level: LevelDefinition }) {
  const challenge = result.challenge;
  if (!challenge || !isChallenge(result.mode)) return null;
  const targets = medalTargets(result.mode, level);
  const next = targets.find((target) => rankValue(target.rank) > rankValue(challenge.rank));
  const gate = medalGate(result.mode, level);
  const rows = challenge.rows;
  return (
    <>
      <h1 className={`rank stamp rank-${challenge.rank.toLowerCase()}`}>{challenge.rank}</h1>
      <Verdict
        text={evaluation(challenge.rank, level.id)}
        happy={rankValue(challenge.rank) >= rankValue('Silver')}
      />
      <table>
        <tbody>
          {rows.map((row, i) => (
            <TallyRow
              key={row.label}
              label={row.label}
              note={row.note}
              value={row.value}
              delay={0.1 + i * 0.2}
            />
          ))}
          <TallyRow
            label="Total"
            note={
              challenge.ranked !== challenge.total
                ? `The medal is judged on ${challenge.ranked}, Glowcaps aside`
                : undefined
            }
            value={challenge.total}
            delay={0.1 + rows.length * 0.2}
            total
          />
        </tbody>
      </table>
      {challenge.perfectBloom && (
        <p className="best">Perfect Bloom: every Sunshard home, not one Sproutling lost</p>
      )}
      <section className="next-rank" aria-label="How to do better">
        <h2>
          {next ? (
            <>
              Next: <span className={`rank-${next.rank.toLowerCase()}`}>{next.rank}</span>
            </>
          ) : (
            'Top medal'
          )}
        </h2>
        <p>
          {next
            ? `${next.rank} needs ${next.score} points${challenge.ranked < next.score ? `: ${next.score - challenge.ranked} more` : ''}${
                (next.rank === 'Platinum' || next.rank === 'Diamond') && !challenge.gateMet && gate
                  ? `. ${gate}`
                  : ''
              }${next.finishBy !== null ? `. A perfect day finishes by ${formatTime(next.finishBy)}.` : '.'}`
            : 'Nothing above Diamond. Try the next lesson, or another challenge.'}
        </p>
      </section>
      <p className="day-stats">
        Day finished in {formatTime(result.elapsed)} · {result.workersAlive} Sproutlings home ·{' '}
        {result.enemiesDefeated} {result.enemiesDefeated === 1 ? 'beast' : 'beasts'} defeated
      </p>
      {result.isBestScore && <p className="best">New best score</p>}
      {result.run && <BoardLine run={result.run} />}
    </>
  );
}

/** A battle: who won, by how much, and why it ended. */
function BattleBody({ result, level }: { result: DayResult; level: LevelDefinition }) {
  const rival = useGameStore((state) => state.rival);
  const battle = result.battle;
  if (!battle) return null;
  const stamp = { won: 'Won', lost: 'Lost', drawn: 'Draw' }[battle.outcome];
  return (
    <>
      <h1 className={`rank stamp battle-${battle.outcome}`}>{stamp}</h1>
      <Verdict text={battleVerdict(battle.outcome, level.id)} happy={battle.outcome !== 'lost'} />
      <div className="race-final">
        <span>
          You <strong>{battle.you}</strong>
        </span>
        <span className="race-vs">{battle.unit}</span>
        <span>
          <strong>{battle.rival}</strong> {RIVAL_NAMES[rival]}
        </span>
      </div>
      <p className="day-stats">{battle.reason}</p>
      <p className="day-stats">
        {formatTime(result.elapsed)} played · {result.workersAlive} Sproutlings home
      </p>
    </>
  );
}

/** A story day: what came home, who made it back by sunset, and how the expedition stands. */
function CampaignBody({ result, level }: { result: DayResult; level: LevelDefinition }) {
  const report = result.campaign;
  if (!report) return null;
  const home = SPROUT_KINDS.reduce((sum, kind) => sum + report.survivors[kind], 0);
  const stock = SPROUT_KINDS.reduce((sum, kind) => sum + report.stock[kind], 0);
  const done = [
    report.beasts > 0 && `${report.beasts} ${report.beasts === 1 ? 'beast' : 'beasts'} beaten`,
    report.gates > 0 && `${report.gates} ${report.gates === 1 ? 'gate' : 'gates'} broken`,
    report.bridges > 0 && `${report.bridges} ${report.bridges === 1 ? 'bridge' : 'bridges'} built`,
    report.beacons > 0 && `${report.beacons} ${report.beacons === 1 ? 'beacon' : 'beacons'} lit`,
  ].filter((part): part is string => Boolean(part));
  return (
    <>
      <h1 className="rank stamp story-stamp">
        {report.finishedToday ? 'The Clock is whole' : `Day ${report.day}`}
      </h1>
      {report.finishedToday && (
        <Verdict
          text={`Every part of the Great Clock is home after ${report.day} ${report.day === 1 ? 'day' : 'days'}. Listen: it is ticking again.`}
          happy
        />
      )}
      <table>
        <tbody>
          <tr>
            <th scope="row">Clock parts home</th>
            <td>
              {report.partsHome} of {report.partsTotal}
            </td>
          </tr>
          {report.newParts.map((id) => (
            <tr key={id} className="met">
              <th scope="row">New: {relicFor(level.id, id).name}</th>
              <td>✓</td>
            </tr>
          ))}
          {report.newGifts.map((ability) => (
            <tr key={ability} className="met">
              <th scope="row">
                The Clock’s gift: {t(`gift.${ability}.name` as MessageKey)}.{' '}
                {t(`gift.${ability}.text` as MessageKey)}
              </th>
              <td>★</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Other relics found today</th>
            <td>{report.relics}</td>
          </tr>
          <tr>
            <th scope="row">Sproutlings home by sunset</th>
            <td>{home}</td>
          </tr>
          {report.leftBehind > 0 && (
            <tr className="missed">
              <th scope="row">Left out at sunset</th>
              <td>−{report.leftBehind}</td>
            </tr>
          )}
          {report.lost > 0 && (
            <tr className="missed">
              <th scope="row">Lost during the day</th>
              <td>−{report.lost}</td>
            </tr>
          )}
          <tr>
            <th scope="row">Grown today</th>
            <td>+{report.grown}</td>
          </tr>
        </tbody>
      </table>
      {done.length > 0 && <p className="day-stats">{done.join(' · ')}. They stay that way.</p>}
      <p className="day-stats">
        The Kiln holds {stock} for tomorrow:{' '}
        {SPROUT_KINDS.filter((kind) => report.stock[kind] > 0)
          .map((kind) => `${report.stock[kind]} ${SPROUTS[kind].plural}`)
          .join(', ') || 'nobody'}
        .
      </p>
    </>
  );
}

export function ResultsScreen({ level }: { level: LevelDefinition }) {
  const result = useGameStore((state) => state.result);
  const save = useGameStore((state) => state.save);
  const rival = useGameStore((state) => state.rival);
  const startDay = useGameStore((state) => state.startDay);
  const leaveDay = useGameStore((state) => state.leaveDay);
  const showStory = useGameStore((state) => state.showStory);
  const stinger = result ? stingerFor(result) : null;
  // The fanfare lands with the stamp, after the tally has counted up.
  useEffect(() => {
    if (!stinger) return;
    const fanfare = window.setTimeout(() => audio.play(stinger), 1050);
    const thump = window.setTimeout(() => audio.play('logPlaced'), 1500);
    // An achievement unlocked gets its own chime, once the stamp has landed.
    const unlocked = (result?.achievements.length ?? 0) > 0;
    const chime = window.setTimeout(() => unlocked && audio.play('unlock'), 2100);
    const ticks = [0.1, 0.3, 0.5, 0.7, 0.9, 1.1].map((at) =>
      window.setTimeout(() => audio.play('tick', { gain: 0.5 }), at * 1000),
    );
    return () => [fanfare, thump, chime, ...ticks].forEach((timer) => window.clearTimeout(timer));
  }, [stinger, result]);
  // Focus the main button for keyboard players without scrolling the stamp out of view.
  useEffect(() => {
    document.querySelector<HTMLElement>('.results [data-primary]')?.focus({ preventScroll: true });
  }, [result]);
  if (!result) return null;
  const mode = result.mode;
  const story = mode === 'lessons';
  const hard = level.difficulty === 'hard';
  const next =
    !story || level.side
      ? undefined
      : MAIN_LEVELS.find((candidate) => candidate.stage === level.stage + 1);
  const nextUnlocked =
    next !== undefined && next.stage <= save.stage && (!hard || hardUnlocked(save, next.id));
  const below = story
    ? LEVELS.find(
        (candidate) => candidate.id === level.descent?.to && save.discovered.includes(candidate.id),
      )
    : undefined;

  let body: ReactNode;
  const campaign = result.campaign !== null;
  if (campaign) body = <CampaignBody result={result} level={level} />;
  else if (result.battle) body = <BattleBody result={result} level={level} />;
  else if (result.challenge) body = <ChallengeBody result={result} level={level} />;
  else body = <StoryBody result={result} level={level} />;

  const eyebrow = campaign
    ? `Story · ${level.name}`
    : story
      ? `Time Attack · ${level.stage <= MAIN_LEVELS.length && !level.side ? `Lesson ${level.stage}` : 'Below'}${hard ? ' · Hard' : ''}`
      : `${MODES[mode].name}${result.battle ? ` against ${RIVAL_NAMES[rival]}` : ''}`;

  const headline =
    campaign && result.reason === 'timeUp'
      ? 'The sun has set'
      : campaign && result.reason === 'endedEarly'
        ? 'You called it a day'
        : HEADLINES[result.reason];

  return (
    <div className="screen overlay">
      <div
        className="panel results"
        role="dialog"
        aria-labelledby="results-eyebrow"
        aria-describedby="results-summary"
      >
        <section className="results-main">
          <p className="eyebrow" id="results-eyebrow">
            {eyebrow} · {headline}
          </p>
          {/* Read out once by screen readers: the outcome in one sentence, before the details. */}
          <p className="sr-only" id="results-summary" role="status">
            {resultSummary(result)}
          </p>
          {body}
          {result.bestChain >= 3 && <p className="day-stats">Longest chain: ×{result.bestChain}</p>}
          {result.caveRelics > 0 && (
            <p className="day-stats">
              Relics brought up from below: {result.caveRelics} (added to the Field Guide)
            </p>
          )}
          {result.unlockedNext && next && <p className="best">Opened: {next.name}</p>}
          <div className="results-actions">
            {story && level.id === 'restoration-day' && result.tally.cleared && (
              <button type="button" onClick={() => showStory('epilogue')} data-primary>
                Read the ending
              </button>
            )}
            {next && nextUnlocked && result.tally.cleared && (
              <button type="button" onClick={() => startDay(next.id, 'lessons')} data-primary>
                Next lesson: {next.name}
              </button>
            )}
            <button
              type="button"
              className={next && nextUnlocked && result.tally.cleared ? 'secondary' : undefined}
              onClick={() => startDay(level.id)}
              data-primary={!(next && nextUnlocked && result.tally.cleared) || undefined}
            >
              {campaign
                ? `Start day ${(result.campaign?.day ?? 0) + 1}`
                : result.battle
                  ? 'Rematch'
                  : 'Try again'}{' '}
              <ActionPrompt action="restart" />
            </button>
            {below && (
              <button
                type="button"
                className="secondary"
                onClick={() => startDay(below.id, 'lessons')}
              >
                Go down to {below.name}
              </button>
            )}
            <button type="button" className="secondary" onClick={leaveDay}>
              {campaign
                ? 'Base camp'
                : story
                  ? 'Lesson map'
                  : result.battle
                    ? 'All battles'
                    : 'All challenges'}
            </button>
          </div>
        </section>
        <section className="results-side">
          {story && result.tally.cleared && LESSON_STORY[level.id] && (
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
          {!story && !campaign && (
            <ModeTargets level={level} mode={mode} rival={rival} earned={result.challenge?.rank} />
          )}
        </section>
      </div>
    </div>
  );
}
