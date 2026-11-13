import { useGameStore } from '../game/core/gameStore';
import { formatTime } from './format';
import { rankTargets } from '../game/dandori/targets';
import type { LevelDefinition } from '../game/world/level';

/** In-day overlay: clock, treasure progress, a day bar marked with each rank's deadline, where
 * the workforce is, and the pause button. */
export function Hud({ level, touch }: { level: LevelDefinition; touch: boolean }) {
  const hud = useGameStore((state) => state.hud);
  const phase = useGameStore((state) => state.phase);
  const pause = useGameStore((state) => state.pause);
  if (!hud) return null;
  const elapsed = 1 - hud.timeLeft / level.dayLength;

  return (
    <div className={touch ? 'hud touch' : 'hud'}>
      <div className="hud-row">
        <div className="chip hud-level">
          {level.stage}. {level.name}
        </div>
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
