import { t } from '../i18n/i18n';
import { useState } from 'react';
import type { Transport } from '../game/net/lockstep';
import { cleanRoomCode, hostRoom, joinRoom, newRoomCode } from '../game/net/rtc';
import { useGameStore } from '../game/core/gameStore';
import {
  battleLevel,
  battleOpen,
  RIVAL_LEVELS,
  RIVAL_NAMES,
  type RivalLevel,
} from '../game/modes/battle';
import { BATTLE_IDS, isBattle, MODES, type BattleId } from '../game/modes/modes';
import { formatTime } from './format';
import { openLessons } from './lessonAccess';
import { MenuNav } from './MenuNav';

const RIVAL_BLURB: Record<RivalLevel, string> = {
  easy: 'Works at seven tenths of your pace.',
  normal: 'Works at a little under your pace.',
  hard: 'Works at your pace and plans like the Proctor.',
};

/**
 * Battles: pick a race, a rival and a lesson. The rival works their own copy of the same field
 * at the same time, shown on a second map in the corner.
 */
type Online =
  | { state: 'off' }
  | { state: 'hosting'; code: string; status: string; cancel: () => void }
  | { state: 'joining'; status: string; cancel: () => void }
  | { state: 'ready'; host: boolean; transport: Transport }
  | { state: 'failed'; message: string };

/**
 * Online: host a room (a code to read out to a friend) or join one. Once joined, the host picks
 * the field below and both go straight in; the guest waits for the host's pick.
 */
function OnlinePanel({
  online,
  setOnline,
}: {
  online: Online;
  setOnline: (online: Online) => void;
}) {
  const startOnline = useGameStore((state) => state.startOnline);
  const [typed, setTyped] = useState('');
  const supported = typeof RTCPeerConnection !== 'undefined';
  const connect = (host: boolean, code: string) => {
    // The status may be reported before the attempt is in hand, so cancelling goes through this.
    let cancelAttempt = (): void => {};
    const cancel = () => cancelAttempt();
    const status = (text: string) =>
      setOnline(
        host
          ? { state: 'hosting', code, status: text, cancel }
          : { state: 'joining', status: text, cancel },
      );
    const attempt = host ? hostRoom(code, status) : joinRoom(code, status);
    cancelAttempt = attempt.cancel;
    status(host ? 'Opening the room…' : 'Looking for the room…');
    attempt.transport.then(
      (transport) => {
        setOnline({ state: 'ready', host, transport });
        if (!host) {
          // The guest waits for the host's pick of race and field.
          transport.onMessage = (message) => {
            if (message.t === 'start' && isBattle(message.mode as BattleId))
              startOnline(transport, false, message.level, message.mode as BattleId);
          };
        }
      },
      (error: unknown) =>
        setOnline({
          state: 'failed',
          message: error instanceof Error ? error.message : 'Could not connect.',
        }),
    );
  };
  return (
    <section className="online-panel">
      <h2>{t('ui.battleSelect.playOnline')}</h2>
      {!supported ? (
        <p className="note">{t('ui.battleSelect.thisBrowserCannotPlay')}</p>
      ) : online.state === 'off' || online.state === 'failed' ? (
        <>
          <p className="note">{t('ui.battleSelect.raceAFriendOn')}</p>
          <div className="button-row">
            <button
              type="button"
              className="secondary small"
              onClick={() => connect(true, newRoomCode())}
            >
              {t('ui.battleSelect.hostARoom')}
            </button>
            <label className="room-code">
              <span className="sr-only">{t('ui.battleSelect.roomCode')}</span>
              <input
                value={typed}
                maxLength={8}
                placeholder={t('ui.battleSelect.roomCode')}
                onChange={(event) => setTyped(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="secondary small"
              disabled={cleanRoomCode(typed) === null}
              onClick={() => {
                const code = cleanRoomCode(typed);
                if (code) connect(false, code);
              }}
            >
              {t('ui.battleSelect.join')}
            </button>
          </div>
          {online.state === 'failed' && <p className="note warn">{online.message}</p>}
        </>
      ) : online.state === 'ready' ? (
        <p className="best" role="status">
          {online.host
            ? t('ui.battleSelect.connectedPickTheRace')
            : t('ui.battleSelect.connectedWaitingForThe')}
        </p>
      ) : (
        <div role="status">
          {online.state === 'hosting' && (
            <p>
              {t('ui.battleSelect.roomCode2')}{' '}
              <strong className="room-code-shown">{online.code}</strong>
            </p>
          )}
          <p className="note">{online.status}</p>
          <button
            type="button"
            className="secondary small"
            onClick={() => {
              online.cancel();
              setOnline({ state: 'off' });
            }}
          >
            {t('ui.battleSelect.cancel')}
          </button>
        </div>
      )}
    </section>
  );
}

export function BattleSelect() {
  const save = useGameStore((state) => state.save);
  const startDay = useGameStore((state) => state.startDay);
  const lastMode = useGameStore((state) => state.playMode);
  const lastRival = useGameStore((state) => state.rival);
  const [mode, setMode] = useState<BattleId>(isBattle(lastMode) ? lastMode : 'marble');
  const [rival, setRival] = useState<RivalLevel>(lastRival);
  const [online, setOnline] = useState<Online>({ state: 'off' });
  const startOnline = useGameStore((state) => state.startOnline);
  const hostReady = online.state === 'ready' && online.host ? online : null;
  const guestWaiting = online.state === 'ready' && !online.host;
  const spec = MODES[mode];
  const lessons = openLessons(save).filter((level) => battleOpen(mode, level));
  const record = save.battles[mode] ?? { won: 0, lost: 0, drawn: 0 };

  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <h1>{t('ui.battleSelect.battles')}</h1>
        <nav className="tabs mode-tabs" aria-label={t('ui.battleSelect.battle')}>
          {BATTLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={id === mode ? 'tab active' : 'tab'}
              aria-pressed={id === mode}
              onClick={() => setMode(id)}
            >
              {MODES[id].name}
            </button>
          ))}
        </nav>
        <section className="mode-rules">
          <p className="mode-summary">{spec.summary}</p>
          <ul>
            {spec.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
            <li>{t('ui.battleSelect.battleDaysAreShort')}</li>
          </ul>
          <p className="note">
            {t('ui.battleSelect.yourRecord')} {record.won} {t('ui.battleSelect.won')} {record.lost}{' '}
            {t('ui.battleSelect.lost')} {record.drawn} {t('ui.battleSelect.drawn')}
          </p>
        </section>
        <OnlinePanel online={online} setOnline={setOnline} />
        {!hostReady && !guestWaiting && (
          <div className="rival-pick" role="radiogroup" aria-label={t('ui.battleSelect.rival')}>
            {RIVAL_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={rival === level}
                className={rival === level ? 'rival-card active' : 'rival-card'}
                onClick={() => setRival(level)}
              >
                <strong>{RIVAL_NAMES[level]}</strong>
                <small>{RIVAL_BLURB[level]}</small>
              </button>
            ))}
          </div>
        )}
        {guestWaiting ? null : lessons.length === 0 ? (
          <p className="note">{t('ui.battleSelect.noLessonTimeAttack')}</p>
        ) : (
          <ol className="lessons">
            {lessons.map((level) => (
              <li key={level.id}>
                <button
                  type="button"
                  className="lesson"
                  onClick={() => {
                    if (hostReady) {
                      hostReady.transport.send({ t: 'start', level: level.id, mode });
                      startOnline(hostReady.transport, true, level.id, mode);
                    } else startDay(level.id, mode, rival);
                  }}
                >
                  <span className="lesson-number">{level.side ? '▼' : level.stage}</span>
                  <span className="lesson-text">
                    <strong>{level.name}</strong>
                    <span>
                      {formatTime(battleLevel(level).dayLength)} {t('ui.battleSelect.onTheClock')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
