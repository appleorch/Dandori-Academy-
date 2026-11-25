import { t } from '../i18n/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DIFFICULTIES, type Difficulty } from '../game/core/difficulty';
import { useGameStore } from '../game/core/gameStore';
import { cleanWardenName, defaultWardenName, WARDEN_NAME_MAX } from '../game/core/settings';
import {
  fetchBoard,
  fetchLog,
  type Board,
  standings,
  type BoardEntry,
  type BoardMode,
} from '../game/leaderboard/board';
import { CHALLENGE_IDS, challengeOpen, isChallenge, MODES, type ModeId } from '../game/modes/modes';
import { challengeFieldsOf } from './lessonAccess';
import { fieldTitle } from './format';
import type { RunEntry } from '../game/leaderboard/runCode';
import { runStatus } from './runStatus';
import { runsKey } from '../game/save/saveManager';
import { LEVELS, levelById } from '../game/world/level';
import { MenuNav } from './MenuNav';
import { dailyId, dailyKey, ensureDaily } from '../game/world/daily';
import type { DayLog } from '../game/replay/replay';
import { bestKey, getReplay } from '../game/replay/replayStore';

/** Watches your own best run on a field again, if its replay is kept in this browser. */
function WatchBest({
  level,
  difficulty,
  mode,
  title,
}: {
  level: string;
  difficulty: Difficulty;
  mode: ModeId;
  title: string;
}) {
  const watchReplay = useGameStore((state) => state.watchReplay);
  const [log, setLog] = useState<DayLog | null>(null);
  useEffect(() => {
    let live = true;
    void getReplay(bestKey(level, difficulty, mode)).then((found) => live && setLog(found));
    return () => {
      live = false;
    };
  }, [level, difficulty, mode]);
  if (!log) return null;
  return (
    <button
      type="button"
      className="secondary small"
      onClick={() => watchReplay(log, `Your best on ${title}`)}
    >
      {t('ui.leaderboardScreen.watchYourBestRun')}
    </button>
  );
}

/** Watch a board run's replay, or race its ghost on the same field. */
function RunReplayButtons({
  entry,
  replays,
}: {
  entry: BoardEntry;
  replays: Pick<Board, 'logs' | 'kept'>;
}) {
  const watchReplay = useGameStore((state) => state.watchReplay);
  const raceGhost = useGameStore((state) => state.raceGhost);
  const [busy, setBusy] = useState<string | null>(null);
  const field = levelById(entry.level);
  const title = `${entry.name} on ${field ? fieldTitle(field) : entry.level}`;
  const withLog = async (act: (log: DayLog) => Promise<void> | void) => {
    if (!entry.logHash) return;
    setBusy('Fetching…');
    const log = await fetchLog(entry.logHash, replays);
    if (!log) {
      setBusy('Replay not found');
      return;
    }
    await act(log);
    setBusy(null);
  };
  return (
    <span className="replay-buttons">
      <button
        type="button"
        className="secondary small"
        disabled={busy === 'Fetching…'}
        onClick={() => void withLog((log) => watchReplay(log, title))}
      >
        {t('ui.leaderboardScreen.watch')}
      </button>
      {entry.mode && (
        <button
          type="button"
          className="secondary small"
          disabled={busy === 'Fetching…'}
          onClick={() =>
            void withLog(async (log) => {
              setBusy('Preparing the ghost…');
              // The ghost is the Warden's path through the run, replayed here (headless).
              const { replayToEnd } = await import('../game/replay/replay');
              const run = await replayToEnd(log);
              if (!run) {
                setBusy('This replay is from another version');
                return;
              }
              const track = [...run.expedition.surface.track];
              run.dispose();
              raceGhost(
                { level: entry.level, difficulty: entry.difficulty, track, name: entry.name },
                entry.mode ?? 'hunt',
              );
            })
          }
        >
          {t('ui.leaderboardScreen.race')}
        </button>
      )}
      {busy && <small className="note">{busy}</small>}
    </span>
  );
}

/** The board is read at most this often while the screen is open. */
const REFRESH_MS = 2 * 60 * 1000;

type Load =
  | { state: 'idle' }
  | { state: 'loading' }
  | {
      state: 'ready';
      entries: BoardEntry[];
      at: number;
      partial: boolean;
      replays: Pick<Board, 'logs' | 'kept'>;
    }
  | { state: 'error'; message: string };

/** Kept between visits to the screen, so flicking between tabs does not read it again. */
let cached: {
  entries: BoardEntry[];
  at: number;
  partial: boolean;
  replays: Pick<Board, 'logs' | 'kept'>;
} | null = null;

function timeText(run: RunEntry): string {
  if (run.mode === 'lessons') return `${run.time.toFixed(2)}s`;
  if (run.mode === 'growing') return `${run.alive} at sunset`;
  // A Trial on its own field has no clock: what it is judged by is who was lost.
  if (run.mode === 'trial' && levelById(run.level)?.untimed) {
    return run.shards === run.shardsTotal
      ? `${run.lost} lost`
      : `${run.shards}/${run.shardsTotal} shards`;
  }
  if (run.mode === 'mission' || run.mode === 'dandori' || run.mode === 'trial') {
    return run.everything
      ? `${run.time.toFixed(1)}s, all`
      : `${run.shards}/${run.shardsTotal} shards`;
  }
  const cleared = run.shards === run.shardsTotal;
  return cleared ? `${run.time.toFixed(1)}s` : `${run.shards}/${run.shardsTotal} shards`;
}

const BOARD_MODES: readonly BoardMode[] = [...CHALLENGE_IDS, 'lessons', 'classic'];

function boardName(mode: BoardMode): string {
  return mode === 'classic' ? 'Classic' : MODES[mode].name;
}

/** Boards kept on the lessons alone: Time Attack, and the closed Classic board. */
const onLessons = (mode: BoardMode) => mode === 'classic' || mode === 'lessons';

function dateText(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

/**
 * The leaderboard: the Academy board, which every new personal best is posted to by itself,
 * and the player's own best runs, kept in the save.
 */
export function LeaderboardScreen() {
  const save = useGameStore((state) => state.save);
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const lastPlayed = useGameStore((state) => state.levelId);
  const queueRun = useGameStore((state) => state.queueRun);
  const lessons = useMemo(
    () => LEVELS.filter((level) => !level.side || save.discovered.includes(level.id)),
    [save.discovered],
  );
  const lastMode = useGameStore((state) => state.playMode);
  const [mode, setMode] = useState<BoardMode>(() =>
    isChallenge(lastMode) || lastMode === 'lessons' ? lastMode : 'hunt',
  );
  const timed = mode === 'lessons';
  // A challenge's board is per field; its runs on the lessons from 0.18.0 are kept as well.
  const daily = levelById(dailyId(dailyKey(new Date())));
  const fields =
    mode === 'classic' || mode === 'lessons'
      ? []
      : [...(mode === 'hunt' && daily ? [daily] : []), ...challengeFieldsOf(mode)];
  const choices = onLessons(mode) ? lessons : [...fields, ...lessons];
  const [picked, setLevelId] = useState(
    () => (choices.find((level) => level.id === lastPlayed) ?? choices[0]).id,
  );
  // Switching boards keeps the field if the new board has it, or starts at its first.
  const levelId = choices.some((level) => level.id === picked) ? picked : choices[0].id;
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [coopBoard, setCoopBoard] = useState(false);
  const [load, setLoad] = useState<Load>(() =>
    cached ? { state: 'ready', ...cached } : { state: 'idle' },
  );
  const [nameDraft, setNameDraft] = useState(settings.wardenName);

  const refresh = useCallback((force: boolean) => {
    if (!force && cached && Date.now() - cached.at < REFRESH_MS) {
      setLoad({ state: 'ready', ...cached });
      return;
    }
    setLoad({ state: 'loading' });
    // Today's daily field is made (and checked) first, so its runs can be read.
    void ensureDaily(dailyKey(new Date()))
      .catch(() => null)
      .then(() => fetchBoard())
      .then((board) => {
        cached = {
          entries: board.entries,
          at: Date.now(),
          partial: !board.server && (!board.file || !board.relay),
          replays: { logs: board.logs, kept: board.kept },
        };
        setLoad({ state: 'ready', ...cached });
      })
      .catch((error: unknown) => {
        setLoad({
          state: 'error',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'The board could not be read.',
        });
      });
  }, []);

  useEffect(() => refresh(false), [refresh]);

  const level = levelById(levelId) ?? LEVELS[0];
  // Challenges are played on the Normal day; Time Attack and Classic have Hard runs too.
  const shownDifficulty: Difficulty = onLessons(mode) ? difficulty : 'normal';
  // Time Attack is played alone.
  const coopShown = coopBoard && !onLessons(mode);
  const board =
    load.state === 'ready'
      ? standings(load.entries, levelId, shownDifficulty, mode, coopShown)
      : [];
  const mine =
    save.runs[
      runsKey({
        mode: mode === 'classic' ? undefined : mode,
        level: levelId,
        difficulty: shownDifficulty,
        coop: coopShown,
      })
    ] ?? [];
  const offered = onLessons(mode) || challengeOpen(mode, level);
  const age = load.state === 'ready' ? Math.round((Date.now() - load.at) / 60000) : 0;
  const shownName = cleanWardenName(settings.wardenName) ?? defaultWardenName(settings.playerId);
  const nameOk = nameDraft.trim() === '' || cleanWardenName(nameDraft) !== null;

  const saveName = (): void => {
    const cleaned = cleanWardenName(nameDraft);
    updateSettings({ wardenName: cleaned ?? '' });
    setNameDraft(cleaned ?? '');
  };

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>{t('ui.leaderboardScreen.leaderboard')}</h1>

        <section className="board-me" aria-label={t('ui.leaderboardScreen.youOnTheBoard')}>
          <label className="board-name">
            {t('ui.leaderboardScreen.yourWardenName')}
            <span className="board-name-row">
              <input
                type="text"
                value={nameDraft}
                maxLength={WARDEN_NAME_MAX}
                placeholder={defaultWardenName(settings.playerId)}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={saveName}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveName();
                }}
                aria-invalid={!nameOk}
              />
            </span>
            {!nameOk && (
              <small className="note warn">
                {t('ui.leaderboardScreen.lettersDigitsSpacesAnd')}
              </small>
            )}
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.postRuns}
              onChange={(event) => updateSettings({ postRuns: event.target.checked })}
            />
            {t('ui.leaderboardScreen.postMyNewPersonal')}
          </label>
          <p className="note">
            {t('ui.leaderboardScreen.shownAs')} <strong>{shownName}</strong>.{' '}
            {save.outbox.length > 0
              ? settings.postRuns
                ? t('ui.leaderboardScreen.waitingToPostThey', { length: save.outbox.length })
                : t('ui.leaderboardScreen.waitingUntilPostingIs', { length: save.outbox.length })
              : t('ui.leaderboardScreen.nothingWaitingToPost')}
          </p>
        </section>

        <nav className="tabs mode-tabs" aria-label={t('ui.leaderboardScreen.board')}>
          {BOARD_MODES.map((option) => (
            <button
              key={option}
              type="button"
              className={option === mode ? 'tab active' : 'tab'}
              aria-pressed={option === mode}
              onClick={() => setMode(option)}
            >
              {boardName(option)}
            </button>
          ))}
        </nav>
        {mode === 'classic' ? (
          <p className="note">{t('ui.leaderboardScreen.classicKeepsTheRuns')}</p>
        ) : timed ? (
          <p className="note">{t('ui.leaderboardScreen.eachLessonHasIts')}</p>
        ) : (
          <p className="note">{t('ui.leaderboardScreen.eachFieldHasIts')}</p>
        )}
        <div className="board-pick">
          <label>
            {onLessons(mode) ? t('ui.leaderboardScreen.lesson') : t('ui.leaderboardScreen.field')}
            <select value={levelId} onChange={(event) => setLevelId(event.target.value)}>
              {fields.length > 0 && (
                <optgroup label={t('ui.leaderboardScreen.fields', { v1: boardName(mode) })}>
                  {fields.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {fieldTitle(choice)}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup
                label={
                  onLessons(mode)
                    ? t('ui.leaderboardScreen.lessons')
                    : t('ui.leaderboardScreen.lessonsClosed')
                }
              >
                {lessons.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.side
                      ? t('ui.leaderboardScreen.below', { name: choice.name })
                      : fieldTitle(choice)}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          {!onLessons(mode) && (
            <div
              className="board-difficulty"
              role="group"
              aria-label={t('ui.leaderboardScreen.players')}
            >
              {[false, true].map((option) => (
                <button
                  key={String(option)}
                  type="button"
                  className={option === coopBoard ? 'tab active' : 'tab'}
                  aria-pressed={option === coopBoard}
                  onClick={() => setCoopBoard(option)}
                >
                  {option ? t('ui.leaderboardScreen.coOp') : t('ui.leaderboardScreen.solo')}
                </button>
              ))}
            </div>
          )}
          {onLessons(mode) && (
            <div
              className="board-difficulty"
              role="group"
              aria-label={t('ui.leaderboardScreen.difficulty')}
            >
              {DIFFICULTIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === difficulty ? 'tab active' : 'tab'}
                  aria-pressed={option === difficulty}
                  onClick={() => setDifficulty(option)}
                >
                  {option === 'hard'
                    ? t('ui.leaderboardScreen.hard')
                    : t('ui.leaderboardScreen.normal')}
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="board">
          <h2>
            {boardName(mode)} {coopShown ? 'co-op ' : ''}
            {t('ui.leaderboardScreen.board2')} <small>{level.name}</small>
          </h2>
          {load.state === 'loading' && (
            <p className="note">{t('ui.leaderboardScreen.readingTheBoard')}</p>
          )}
          {load.state === 'error' && (
            <p className="note warn">
              {load.message} {t('ui.leaderboardScreen.yourOwnRunsBelow')}
            </p>
          )}
          {load.state === 'ready' &&
            (board.length === 0 ? (
              <p className="note">
                {offered && (level.challenge || timed)
                  ? t('ui.leaderboardScreen.noRunsOnThis')
                  : offered
                    ? t('ui.leaderboardScreen.noRunsFromOn')
                    : t('ui.leaderboardScreen.isNotOfferedOn', { v1: boardName(mode) })}
              </p>
            ) : (
              <table className="board-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">{t('ui.leaderboardScreen.warden')}</th>
                    <th scope="col">
                      {timed ? t('ui.leaderboardScreen.clear') : t('ui.leaderboardScreen.score')}
                    </th>
                    <th scope="col">
                      {timed ? t('ui.leaderboardScreen.medal') : t('ui.leaderboardScreen.rank')}
                    </th>
                    {!timed && <th scope="col">{t('ui.leaderboardScreen.time')}</th>}
                    <th scope="col">{t('ui.leaderboardScreen.lost')}</th>
                    <th scope="col">
                      <span className="sr-only">{t('ui.leaderboardScreen.replay')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((entry, i) => (
                    <tr
                      key={`${entry.player}-${entry.at}`}
                      className={entry.player === settings.playerId ? 'me' : undefined}
                    >
                      <td>{i + 1}</td>
                      <th scope="row">
                        {entry.name}{' '}
                        <small
                          className="board-id"
                          title={t('ui.leaderboardScreen.tellsWardensWithThe')}
                        >
                          #{entry.player.slice(0, 4)}
                        </small>
                      </th>
                      <td>{timed ? timeText(entry) : entry.score}</td>
                      <td className={`rank-${entry.rank.toLowerCase()}`}>{entry.rank}</td>
                      {!timed && <td>{timeText(entry)}</td>}
                      <td>{entry.lost}</td>
                      <td className="board-replay">
                        {entry.verified && (
                          <span
                            className="verified"
                            title={t('ui.leaderboardScreen.verifiedTheBoardReplayed')}
                          >
                            ✓
                          </span>
                        )}
                        {entry.logHash &&
                          (load.replays.logs.has(entry.logHash) ||
                            load.replays.kept.has(entry.logHash)) && (
                            <RunReplayButtons entry={entry} replays={load.replays} />
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          {load.state === 'ready' && load.partial && (
            <p className="note">{t('ui.leaderboardScreen.partOfTheBoard')}</p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="secondary small"
              onClick={() => refresh(true)}
              disabled={load.state === 'loading'}
            >
              {t('ui.leaderboardScreen.refresh')}
            </button>
            {load.state === 'ready' && (
              <span className="note">
                {age < 1
                  ? t('ui.leaderboardScreen.justNow')
                  : t('ui.leaderboardScreen.minAgo', { age: age })}
              </span>
            )}
          </div>
        </section>

        <section className="board">
          <h2>{t('ui.leaderboardScreen.yourBestRuns')}</h2>
          {mode !== 'classic' && (
            <WatchBest
              level={level.id}
              difficulty={shownDifficulty}
              mode={mode}
              title={fieldTitle(level)}
            />
          )}
          {mine.length === 0 ? (
            <p className="note">
              {mode === 'classic'
                ? t('ui.leaderboardScreen.noRunsFromBefore')
                : timed
                  ? t('ui.leaderboardScreen.clearThisLessonIn')
                  : t('ui.leaderboardScreen.playOnThisLesson', { v1: boardName(mode) })}
            </p>
          ) : (
            <table className="board-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  {!timed && <th scope="col">{t('ui.leaderboardScreen.score')}</th>}
                  <th scope="col">
                    {timed ? t('ui.leaderboardScreen.medal') : t('ui.leaderboardScreen.rank')}
                  </th>
                  <th scope="col">
                    {timed ? t('ui.leaderboardScreen.clear') : t('ui.leaderboardScreen.time')}
                  </th>
                  <th scope="col">{t('ui.leaderboardScreen.played')}</th>
                  <th scope="col">{t('ui.leaderboardScreen.board')}</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((run, i) => (
                  <tr key={run.at}>
                    <td>{i + 1}</td>
                    {!timed && <td>{run.score}</td>}
                    <td className={`rank-${run.rank.toLowerCase()}`}>{run.rank}</td>
                    <td>{timeText(run)}</td>
                    <td>{dateText(run.at)}</td>
                    <td>
                      {i === 0 && runStatus(save, run, settings.postRuns) === 'Not posted' ? (
                        <button
                          type="button"
                          className="secondary small inline"
                          onClick={() => queueRun(run)}
                          title={t('ui.leaderboardScreen.postThisBestTo')}
                        >
                          {t('ui.leaderboardScreen.post')}
                        </button>
                      ) : (
                        <small>{runStatus(save, run, settings.postRuns)}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <p className="note">{t('ui.leaderboardScreen.eachChallengeAndTime')}</p>
      </div>
    </main>
  );
}
