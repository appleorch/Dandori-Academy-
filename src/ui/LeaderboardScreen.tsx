import { useCallback, useEffect, useMemo, useState } from 'react';
import { DIFFICULTIES, type Difficulty } from '../game/core/difficulty';
import { useGameStore } from '../game/core/gameStore';
import { cleanWardenName, defaultWardenName, WARDEN_NAME_MAX } from '../game/core/settings';
import { BOARD_REPO, fetchBoard, standings, type BoardEntry } from '../game/leaderboard/board';
import { lessonPrint, type RunEntry } from '../game/leaderboard/runCode';
import { runKey, splitKey, type SaveData } from '../game/save/saveManager';
import { LEVELS } from '../game/world/level';
import { MenuNav } from './MenuNav';

/** The board is read at most this often while the screen is open. */
const REFRESH_MS = 2 * 60 * 1000;

type Load =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; entries: BoardEntry[]; at: number; partial: boolean }
  | { state: 'error'; message: string };

/** Kept between visits to the screen, so flicking between tabs does not read it again. */
let cached: { entries: BoardEntry[]; at: number; partial: boolean } | null = null;

function timeText(run: RunEntry): string {
  const cleared = run.shards === run.shardsTotal;
  return cleared ? `${run.time.toFixed(1)}s` : `${run.shards}/${run.shardsTotal} shards`;
}

function dateText(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

/** Where one of the player's own runs stands with the board. */
export function runStatus(save: SaveData, run: RunEntry, postRuns: boolean): string {
  const key = runKey(run);
  if (save.posted.includes(key)) return 'Posted';
  if (save.outbox.some((queued) => runKey(queued) === key)) {
    return postRuns ? 'Posting…' : 'Waiting (posting is off)';
  }
  if (run.print !== lessonPrint(run.level, run.difficulty)) return 'Older version';
  return 'Not posted';
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
  const choices = useMemo(
    () => LEVELS.filter((level) => !level.side || save.discovered.includes(level.id)),
    [save.discovered],
  );
  const [levelId, setLevelId] = useState(
    () => (choices.find((level) => level.id === lastPlayed) ?? choices[0]).id,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
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
    fetchBoard()
      .then((board) => {
        cached = { entries: board.entries, at: Date.now(), partial: !board.file || !board.relay };
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

  const level = LEVELS.find((candidate) => candidate.id === levelId) ?? LEVELS[0];
  const board = load.state === 'ready' ? standings(load.entries, levelId, difficulty) : [];
  const mine = save.runs[splitKey(levelId, difficulty)] ?? [];
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
        <h1>Leaderboard</h1>

        <section className="board-me" aria-label="You on the board">
          <label className="board-name">
            Your Warden name
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
                Letters, digits, spaces and . _ &apos; - only, starting with a letter or digit.
              </small>
            )}
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.postRuns}
              onChange={(event) => updateSettings({ postRuns: event.target.checked })}
            />
            Post my new personal bests to the Academy board automatically
          </label>
          <p className="note">
            Shown as <strong>{shownName}</strong>.{' '}
            {save.outbox.length > 0
              ? settings.postRuns
                ? `${save.outbox.length} waiting to post (they go as soon as the board can be reached).`
                : `${save.outbox.length} waiting until posting is turned back on.`
              : 'Nothing waiting to post.'}
          </p>
        </section>

        <div className="board-pick">
          <label>
            Lesson
            <select value={levelId} onChange={(event) => setLevelId(event.target.value)}>
              {choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.side ? 'Below' : choice.stage}. {choice.name}
                </option>
              ))}
            </select>
          </label>
          <div className="board-difficulty" role="group" aria-label="Difficulty">
            {DIFFICULTIES.map((option) => (
              <button
                key={option}
                type="button"
                className={option === difficulty ? 'tab active' : 'tab'}
                aria-pressed={option === difficulty}
                onClick={() => setDifficulty(option)}
              >
                {option === 'hard' ? 'Hard' : 'Normal'}
              </button>
            ))}
          </div>
        </div>

        <section className="board">
          <h2>
            Academy board <small>{level.name}</small>
          </h2>
          {load.state === 'loading' && <p className="note">Reading the board…</p>}
          {load.state === 'error' && (
            <p className="note warn">
              {load.message} Your own runs below are kept on this device either way.
            </p>
          )}
          {load.state === 'ready' &&
            (board.length === 0 ? (
              <p className="note">No runs on this lesson yet. Be the first.</p>
            ) : (
              <table className="board-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Warden</th>
                    <th scope="col">Score</th>
                    <th scope="col">Rank</th>
                    <th scope="col">Time</th>
                    <th scope="col">Lost</th>
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
                        <small className="board-id" title="Tells Wardens with the same name apart">
                          #{entry.player.slice(0, 4)}
                        </small>
                      </th>
                      <td>{entry.score}</td>
                      <td className={`rank-${entry.rank.toLowerCase()}`}>{entry.rank}</td>
                      <td>{timeText(entry)}</td>
                      <td>{entry.lost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          {load.state === 'ready' && load.partial && (
            <p className="note">
              Part of the board could not be read just now; it may be missing the newest runs.
            </p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="secondary small"
              onClick={() => refresh(true)}
              disabled={load.state === 'loading'}
            >
              Refresh
            </button>
            {load.state === 'ready' && (
              <span className="note">{age < 1 ? 'Just now' : `${age} min ago`}</span>
            )}
          </div>
        </section>

        <section className="board">
          <h2>Your best runs</h2>
          {mine.length === 0 ? (
            <p className="note">Finish a day on this lesson and it is kept here.</p>
          ) : (
            <table className="board-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Score</th>
                  <th scope="col">Rank</th>
                  <th scope="col">Time</th>
                  <th scope="col">Played</th>
                  <th scope="col">Board</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((run, i) => (
                  <tr key={run.at}>
                    <td>{i + 1}</td>
                    <td>{run.score}</td>
                    <td className={`rank-${run.rank.toLowerCase()}`}>{run.rank}</td>
                    <td>{timeText(run)}</td>
                    <td>{dateText(run.at)}</td>
                    <td>
                      {i === 0 && runStatus(save, run, settings.postRuns) === 'Not posted' ? (
                        <button
                          type="button"
                          className="secondary small inline"
                          onClick={() => queueRun(run)}
                          title="Post this best to the board"
                        >
                          Post
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

        <p className="note">
          The Academy board needs no server of its own. Each new personal best is posted by itself
          to a public relay (ntfy.sh), with your Warden name and a random player id and nothing
          else. Every half hour the game&apos;s GitHub repository ({BOARD_REPO}) collects the relay,
          checks every run against the lesson&apos;s own rules, and keeps the best run per Warden
          per lesson. New runs show here at once. Runs from an older version of a lesson are left
          off.
        </p>
      </div>
    </main>
  );
}
