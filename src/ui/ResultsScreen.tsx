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
import { DayGraphs } from './DayGraphs';
import { replayable } from '../game/replay/replay';
import { bestKey, getReplay, LAST_KEY } from '../game/replay/replayStore';
import { splitKey } from '../game/save/saveManager';
import { SIM_DT } from '../game/core/config';
import { awardFor, MedalCeremony, ShareCardButton } from './ResultCeremony';

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

/**
 * Practice from here: start a lesson at the moment a Sunshard came home on your fastest clear,
 * replayed up to there, and play on from that point. Practice runs are never kept.
 */
function PracticePanel({ level }: { level: LevelDefinition }) {
  const save = useGameStore((state) => state.save);
  const practising = useGameStore((state) => state.practice);
  const startPractice = useGameStore((state) => state.startPractice);
  const [note, setNote] = useState<string | null>(null);
  const splits = save.bestSplits[splitKey(level.id, level.difficulty)] ?? [];
  if (practising) {
    return (
      <p className="note">
        {t('ui.resultsScreen.practiceRunFromSunshard')} {practising.shard}
        {t('ui.resultsScreen.nothingWasKept')}
      </p>
    );
  }
  if (splits.length < 2) return null;
  return (
    <section className="practice">
      <p className="eyebrow">{t('ui.resultsScreen.practiceFromYourFastest')}</p>
      <div className="button-row">
        {splits.slice(0, -1).map((time, i) => (
          <button
            key={i}
            type="button"
            className="secondary small"
            onClick={() =>
              void getReplay(bestKey(level.id, level.difficulty, 'lessons')).then(async (log) => {
                if (!log) return setNote('Your fastest clear has no replay kept in this browser.');
                const ok = await startPractice(log, i + 1, Math.round(time / SIM_DT) + 1);
                if (!ok) setNote('That replay is from another version of the game.');
              })
            }
          >
            {t('ui.resultsScreen.afterSunshard')} {i + 1} ({formatTime(time)})
          </button>
        ))}
      </div>
      {note && <p className="note">{note}</p>}
    </section>
  );
}

/** Watches the day just played again, from the replay kept of it. */
function WatchReplayButton({ title }: { title: string }) {
  const watchReplay = useGameStore((state) => state.watchReplay);
  const [missing, setMissing] = useState(false);
  return (
    <button
      type="button"
      className="secondary small share-card"
      onClick={() =>
        void getReplay(LAST_KEY).then((log) => (log ? watchReplay(log, title) : setMissing(true)))
      }
    >
      {missing ? t('ui.resultsScreen.noReplayKept') : t('ui.resultsScreen.watchTheReplay')}
    </button>
  );
}

/** The Headmaster has his say. */
function Verdict({ text, happy }: { text: string; happy: boolean }) {
  return (
    <figure className="speech verdict">
      <SprocketPortrait mood={happy ? 'cheer' : 'muse'} />
      <div>
        <blockquote>{text}</blockquote>
        <figcaption>{t('ui.resultsScreen.headmasterSprocket')}</figcaption>
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
        {tally.cleared ? t('ui.resultsScreen.cleared') : t('ui.resultsScreen.notYet')}
      </h1>
      <Verdict text={storyVerdict(tally.cleared, level.id)} happy={tally.cleared} />
      <table>
        <tbody>
          <CountRow
            label={t('ui.resultsScreen.sunshards')}
            value={`${tally.required.got} of ${tally.required.of}`}
            note="Every one must come home to clear the lesson"
          />
          {bonus.length > 0 && (
            <CountRow
              label={t('ui.resultsScreen.optionalTreasure')}
              value={`${twins.got + dewglass.got + glowcaps.got} of ${twins.of + dewglass.of + glowcaps.of}`}
              note={bonus.join(' · ')}
            />
          )}
          <CountRow
            label={t('ui.resultsScreen.sproutlings')}
            value={`${tally.sproutlings.alive} home`}
            note={`Started with ${tally.sproutlings.start}, grew ${tally.sproutlings.grown}, lost ${tally.sproutlings.lost}`}
          />
          <CountRow
            label={t('ui.resultsScreen.academyPace')}
            value={formatTime(level.platinumTime)}
            note={`The Academy’s test player clears it in this; ${formatTime(level.diamondTime)} is a record pace`}
          />
          {result.newRelics > 0 && (
            <CountRow
              label={t('ui.resultsScreen.newRelics')}
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
          {t('ui.resultsScreen.clearedIn')} <strong>{formatTime(result.clearTime)}</strong>
          {result.previousBest === null
            ? ` ${t('ui.resultsScreen.firstClear')}`
            : result.clearTime < result.previousBest
              ? ` ${t('ui.resultsScreen.yourFastestYetS', {
                  v1: (result.previousBest - result.clearTime).toFixed(1),
                })}`
              : ` ${t('ui.resultsScreen.fastestS', {
                  v1: formatTime(result.previousBest),
                  v2: (result.clearTime - result.previousBest).toFixed(1),
                })}`}
        </p>
      )}
      {result.clearTime !== null && (
        <p className={`time-medal ${timeMedal(level, result.clearTime).toLowerCase()}`}>
          {t('ui.resultsScreen.timeMedal')} <strong>{timeMedal(level, result.clearTime)}</strong>
        </p>
      )}
      {result.clearTime !== null && result.splits.length > 1 && (
        <table className="splits">
          <thead>
            <tr>
              <th scope="col">{t('ui.resultsScreen.sunshard')}</th>
              <th scope="col">{t('ui.resultsScreen.today')}</th>
              <th scope="col">{t('ui.resultsScreen.fastestBefore')}</th>
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
          {t('ui.resultsScreen.bringEverySunshardHome')} {level.name}{' '}
          {t('ui.resultsScreen.andOpenTheNext')}
        </p>
      )}
      <PracticePanel level={level} />
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
            label={t('ui.resultsScreen.total')}
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
        <p className="best">{t('ui.resultsScreen.perfectBloomEverySunshard')}</p>
      )}
      <section className="next-rank" aria-label={t('ui.resultsScreen.howToDoBetter')}>
        <h2>
          {next ? (
            <>
              {t('ui.resultsScreen.next')}{' '}
              <span className={`rank-${next.rank.toLowerCase()}`}>{next.rank}</span>
            </>
          ) : (
            t('ui.resultsScreen.topMedal')
          )}
        </h2>
        <p>
          {next
            ? t('ui.resultsScreen.needsPoints', {
                rank: next.rank,
                score: next.score,
                v3: challenge.ranked < next.score ? `: ${next.score - challenge.ranked} more` : '',
                v4:
                  (next.rank === 'Platinum' || next.rank === 'Diamond') &&
                  !challenge.gateMet &&
                  gate
                    ? `. ${gate}`
                    : '',
                v5:
                  next.finishBy !== null
                    ? `. A perfect day finishes by ${formatTime(next.finishBy)}.`
                    : '.',
              })
            : t('ui.resultsScreen.nothingAboveDiamondTry')}
        </p>
      </section>
      <p className="day-stats">
        {t('ui.resultsScreen.dayFinishedIn')} {formatTime(result.elapsed)} · {result.workersAlive}{' '}
        {t('ui.resultsScreen.sproutlingsHome')} {result.enemiesDefeated}{' '}
        {result.enemiesDefeated === 1 ? 'beast' : 'beasts'} {t('ui.resultsScreen.defeated')}
      </p>
      {result.isBestScore && <p className="best">{t('ui.resultsScreen.newBestScore')}</p>}
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
          {t('ui.resultsScreen.you')} <strong>{battle.you}</strong>
        </span>
        <span className="race-vs">{battle.unit}</span>
        <span>
          <strong>{battle.rival}</strong> {RIVAL_NAMES[rival]}
        </span>
      </div>
      <p className="day-stats">{battle.reason}</p>
      <p className="day-stats">
        {formatTime(result.elapsed)} {t('ui.resultsScreen.played')} {result.workersAlive}{' '}
        {t('ui.resultsScreen.sproutlingsHome2')}
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
        {report.finishedToday
          ? t('ui.resultsScreen.theClockIsWhole')
          : t('ui.resultsScreen.day', { day: report.day })}
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
            <th scope="row">{t('ui.resultsScreen.clockPartsHome')}</th>
            <td>
              {report.partsHome} {t('ui.resultsScreen.of')} {report.partsTotal}
            </td>
          </tr>
          {report.newParts.map((id) => (
            <tr key={id} className="met">
              <th scope="row">
                {t('ui.resultsScreen.new')} {relicFor(level.id, id).name}
              </th>
              <td>✓</td>
            </tr>
          ))}
          {report.newGifts.map((ability) => (
            <tr key={ability} className="met">
              <th scope="row">
                {t('ui.resultsScreen.theClockSGift')} {t(`gift.${ability}.name` as MessageKey)}.{' '}
                {t(`gift.${ability}.text` as MessageKey)}
              </th>
              <td>★</td>
            </tr>
          ))}
          <tr>
            <th scope="row">{t('ui.resultsScreen.otherRelicsFoundToday')}</th>
            <td>{report.relics}</td>
          </tr>
          <tr>
            <th scope="row">{t('ui.resultsScreen.sproutlingsHomeBySunset')}</th>
            <td>{home}</td>
          </tr>
          {report.leftBehind > 0 && (
            <tr className="missed">
              <th scope="row">{t('ui.resultsScreen.leftOutAtSunset')}</th>
              <td>−{report.leftBehind}</td>
            </tr>
          )}
          {report.lost > 0 && (
            <tr className="missed">
              <th scope="row">{t('ui.resultsScreen.lostDuringTheDay')}</th>
              <td>−{report.lost}</td>
            </tr>
          )}
          <tr>
            <th scope="row">{t('ui.resultsScreen.grownToday')}</th>
            <td>+{report.grown}</td>
          </tr>
        </tbody>
      </table>
      {done.length > 0 && (
        <p className="day-stats">
          {done.join(' · ')}
          {t('ui.resultsScreen.theyStayThatWay')}
        </p>
      )}
      <p className="day-stats">
        {t('ui.resultsScreen.theKilnHolds')} {stock} {t('ui.resultsScreen.forTomorrow')}{' '}
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
  const online = useGameStore((state) => state.online !== null);
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

  const award = awardFor(result, level);

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
          {award && <MedalCeremony award={award} />}
          {body}
          {result.bestChain >= 3 && (
            <p className="day-stats">
              {t('ui.resultsScreen.longestChain')}
              {result.bestChain}
            </p>
          )}
          {result.caveRelics > 0 && (
            <p className="day-stats">
              {t('ui.resultsScreen.relicsBroughtUpFrom')} {result.caveRelics}{' '}
              {t('ui.resultsScreen.addedToTheField')}
            </p>
          )}
          {result.unlockedNext && next && (
            <p className="best">
              {t('ui.resultsScreen.opened')} {next.name}
            </p>
          )}
          <div className="results-actions">
            {story && level.id === 'restoration-day' && result.tally.cleared && (
              <button type="button" onClick={() => showStory('epilogue')} data-primary>
                {t('ui.resultsScreen.readTheEnding')}
              </button>
            )}
            {next && nextUnlocked && result.tally.cleared && (
              <button type="button" onClick={() => startDay(next.id, 'lessons')} data-primary>
                {t('ui.resultsScreen.nextLesson')} {next.name}
              </button>
            )}
            {!online && (
              <button
                type="button"
                className={next && nextUnlocked && result.tally.cleared ? 'secondary' : undefined}
                onClick={() => startDay(level.id)}
                data-primary={!(next && nextUnlocked && result.tally.cleared) || undefined}
              >
                {campaign
                  ? t('ui.resultsScreen.startDay', { v1: (result.campaign?.day ?? 0) + 1 })
                  : result.battle
                    ? t('ui.resultsScreen.rematch')
                    : t('ui.resultsScreen.tryAgain')}{' '}
                <ActionPrompt action="restart" />
              </button>
            )}
            {below && (
              <button
                type="button"
                className="secondary"
                onClick={() => startDay(below.id, 'lessons')}
              >
                {t('ui.resultsScreen.goDownTo')} {below.name}
              </button>
            )}
            <button type="button" className="secondary" onClick={leaveDay}>
              {campaign
                ? t('ui.resultsScreen.baseCamp')
                : story
                  ? t('ui.resultsScreen.lessonMap')
                  : result.battle
                    ? t('ui.resultsScreen.allBattles')
                    : t('ui.resultsScreen.allChallenges')}
            </button>
          </div>
        </section>
        <section className="results-side">
          <DayGraphs timeline={result.timeline} />
          <ShareCardButton result={result} level={level} fieldName={level.name} />
          {replayable(mode) && (
            <WatchReplayButton title={t('ui.resultsScreen.justNow', { name: level.name })} />
          )}
          {story && result.tally.cleared && LESSON_STORY[level.id] && (
            <blockquote className="journal-note">
              <small>
                {result.firstClear
                  ? t('ui.resultsScreen.newJournalEntry')
                  : t('ui.resultsScreen.fromTheJournal')}
              </small>
              {LESSON_STORY[level.id].journal}
            </blockquote>
          )}
          {result.achievements.length > 0 && (
            <div className="unlocks">
              <p className="eyebrow">
                {result.achievements.length === 1
                  ? t('ui.resultsScreen.achievementUnlocked')
                  : t('ui.resultsScreen.achievementsUnlocked', {
                      length: result.achievements.length,
                    })}
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
