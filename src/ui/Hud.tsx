import { useEffect } from 'react';
import { audio } from '../game/audio/audioManager';
import { useGameStore, type BossSnapshot } from '../game/core/gameStore';
import { formatTime } from './format';
import { rankTargets } from '../game/dandori/targets';
import { LEVELS, type LevelDefinition } from '../game/world/level';

const GUARD_TEXT: Record<BossSnapshot['guard'], string> = {
  open: 'Open: full damage!',
  armoured: 'Armoured',
  shielded: 'Shielded: break the root-knots',
  dark: 'In the dark: light a beacon nearby',
};

/** In-day overlay: clock, treasure progress, a day bar marked with each rank's deadline, where
 * the workforce is, and the pause button. */
export function Hud({ level, touch }: { level: LevelDefinition; touch: boolean }) {
  const hud = useGameStore((state) => state.hud);
  const phase = useGameStore((state) => state.phase);
  const pause = useGameStore((state) => state.pause);
  const hint = useGameStore((state) => state.hint);
  const nearSecret = useGameStore((state) => state.nearSecret);
  const openPoker = useGameStore((state) => state.openPoker);
  const nearDescent = useGameStore((state) => state.nearDescent);
  const startDay = useGameStore((state) => state.startDay);
  const below = LEVELS.find((candidate) => candidate.id === nearDescent);
  useEffect(() => {
    if (hint) audio.play('hint');
  }, [hint]);
  if (!hud) return null;
  const elapsed = 1 - hud.timeLeft / level.dayLength;

  return (
    <div className={touch ? 'hud touch' : 'hud'}>
      <div className="hud-row">
        <div className="chip hud-level">
          {level.stage}. {level.name}
        </div>
        {level.difficulty === 'hard' && <div className="chip hard-chip">Hard</div>}
        <div className={hud.timeLeft <= 30 ? 'chip clock urgent' : 'chip clock'}>
          {formatTime(hud.timeLeft)}
        </div>
        <div className="chip">
          Sunshards {hud.treasuresCollected}/{hud.treasuresTotal} · {hud.treasureValue} pts
        </div>
        <div className="chip" aria-label={`Warden health ${hud.captainHp}`}>
          {'♥'.repeat(hud.captainHp) || '0'}
        </div>
        {phase === 'playing' && (
          <button type="button" className="chip quit" onClick={pause}>
            Pause {!touch && <kbd>Esc</kbd>}
          </button>
        )}
      </div>
      {hud.boss && (
        <div
          className={`bossbar ${hud.boss.guard}`}
          role="img"
          aria-label={`${hud.boss.name} health ${Math.round(hud.boss.health * 100)} percent, ${GUARD_TEXT[hud.boss.guard]}`}
        >
          <span className="bossbar-name">
            {hud.boss.name} <small>{GUARD_TEXT[hud.boss.guard]}</small>
          </span>
          <span className="bossbar-track">
            <span className="bossbar-fill" style={{ width: `${hud.boss.health * 100}%` }} />
          </span>
        </div>
      )}
      <div
        className="daybar"
        role="img"
        aria-label={`Day ${Math.round(elapsed * 100)} percent over`}
      >
        <div className="daybar-fill" style={{ width: `${elapsed * 100}%` }} />
        {rankTargets(level).map(
          (target) =>
            target.timeLeft !== null && (
              <span
                key={target.rank}
                className={`daybar-mark rank-${target.rank.toLowerCase()}`}
                style={{ left: `${(1 - target.timeLeft / level.dayLength) * 100}%` }}
                title={`${target.rank} deadline`}
              >
                {target.rank[0]}
              </span>
            ),
        )}
        <span className="daybar-sun" style={{ left: `${elapsed * 100}%` }} />
      </div>
      <div className="hud-spacer" />
      {phase === 'playing' && nearSecret && (
        <button type="button" className="chip knock" onClick={openPoker}>
          Knock on the little door {!touch && <kbd>E</kbd>}
        </button>
      )}
      {phase === 'playing' && below && (
        <button type="button" className="chip knock descend" onClick={() => startDay(below.id)}>
          Go down to {below.name} (leaves this lesson) {!touch && <kbd>E</kbd>}
        </button>
      )}
      {phase === 'playing' && hint && (
        <p className="coach" role="status">
          <strong>Ashwick</strong> {hint}
        </p>
      )}
      <div className="hud-row bottom">
        <div className="chip">
          <span className="dot squad" /> Squad {hud.squad}
        </div>
        <div className="chip">
          <span className="dot working" /> Working {hud.working}
        </div>
        <div className={hud.idle > 0 ? 'chip idle-warning' : 'chip'}>
          <span className="dot idle" /> Idle {hud.idle}
        </div>
        <div className="chip">Field {hud.total}</div>
      </div>
    </div>
  );
}
