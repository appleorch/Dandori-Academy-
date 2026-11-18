import { useCallback, useEffect, useMemo, useState } from 'react';
import { DIFFICULTIES, type Difficulty } from '../game/core/difficulty';
import { useGameStore } from '../game/core/gameStore';
import {
  BOARD_REPO,
  fetchBoard,
  runLink,
  standings,
  type BoardEntry,
} from '../game/leaderboard/board';
import { lessonPrint, type RunEntry } from '../game/leaderboard/runCode';
import { splitKey } from '../game/save/saveManager';
import { LEVELS } from '../game/world/level';
import { MenuNav } from './MenuNav';

/** The shared board is read at most this often; GitHub allows 60 anonymous reads an hour. */
const REFRESH_MS = 2 * 60 * 1000;

type Load =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; entries: BoardEntry[]; at: number }
  | { state: 'error'; message: string };

/** Kept between visits to the screen, so flicking tabs does not spend GitHub's rate limit. */
let cached: { entries: BoardEntry[]; at: number } | null = null;

function timeText(run: RunEntry): string {
  const cleared = run.shards === run.shardsTotal;
  return cleared ? `${run.time.toFixed(1)}s` : `${run.shards}/${run.shardsTotal} shards`;
}

function dateText(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

/** A pre-filled, signed link that opens the run as a new GitHub issue. */
export function PostRunLink({
  run,
  label = 'Post to the leaderboard',
}: {
  run: RunEntry;
  label?: string;
}) {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    runLink(run)
      .then((link) => {
        if (live) setHref(link);
      })
      .catch(() => {
        if (live) setHref(null);
      });
    return () => {
      live = false;
    };
  }, [run]);
  if (!href) return null;
  return (
    <a className="link-button" href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

/**
 * The leaderboard: the Academy board, kept as issues on the game's GitHub repository, and
 * the player's own best runs, kept in the save. No server: posting a run opens a pre-filled
 * GitHub issue, and the board reads them back from GitHub's public API.
 */
export function LeaderboardScreen() {
  const save = useGameStore((state) => state.save);
  const lastPlayed = useGameStore((state) => state.levelId);
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

  const refresh = useCallback((force: boolean) => {
    if (!force && cached && Date.now() - cached.at < REFRESH_MS) {
      setLoad({ state: 'ready', ...cached });
      return;
    }
    setLoad({ state: 'loading' });
    fetchBoard()
      .then((entries) => {
        cached = { entries, at: Date.now() };
        setLoad({ state: 'ready', ...cached });
      })
      .catch((error: unknown) => {
        setLoad({
          state: 'error',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'GitHub could not be reached.',
        });
      });
  }, []);

  useEffect(() => refresh(false), [refresh]);

  const level = LEVELS.find((candidate) => candidate.id === levelId) ?? LEVELS[0];
  const board = load.state === 'ready' ? standings(load.entries, levelId, difficulty) : [];
  const print = lessonPrint(levelId, difficulty);
  const mine = save.runs[splitKey(levelId, difficulty)] ?? [];
  const age = load.state === 'ready' ? Math.round((Date.now() - load.at) / 60000) : 0;

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>Leaderboard</h1>
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
          {load.state === 'loading' && <p className="note">Reading the board from GitHub…</p>}
          {load.state === 'error' && (
            <p className="note warn">
              {load.message} Your own runs below are kept on this device either way.
            </p>
          )}
          {load.state === 'ready' &&
            (board.length === 0 ? (
              <p className="note">No runs posted on this lesson yet. Be the first.</p>
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
                    <tr key={entry.player}>
                      <td>{i + 1}</td>
                      <th scope="row">
                        <a href={entry.url} target="_blank" rel="noopener noreferrer">
                          {entry.player}
                        </a>
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
                  <th scope="col">
                    <span className="sr-only">Post</span>
                  </th>
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
                      {run.print === print ? (
                        <PostRunLink run={run} label="Post" />
                      ) : (
                        <small title="This lesson has been rebalanced since">Old version</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <p className="note">
          The Academy board needs no server: posting a run opens a new issue on the game’s GitHub
          repository ({BOARD_REPO}) with the run filled in, and you submit it with your GitHub
          account. Each Warden’s best run per lesson counts. Every run is checked against the
          lesson’s own rules before it is shown, and runs from an older version of a lesson are left
          off.
        </p>
      </div>
    </main>
  );
}
