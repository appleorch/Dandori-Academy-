import { useGameStore } from '../game/core/gameStore';
import type { LevelDefinition } from '../game/world/level';

function formatTime(seconds: number): string {
  const whole = Math.ceil(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** In-day overlay: clock, treasure progress, where the workforce is, and the pause button. */
export function Hud({ level }: { level: LevelDefinition }) {
  const hud = useGameStore((state) => state.hud);
  const phase = useGameStore((state) => state.phase);
  const pause = useGameStore((state) => state.pause);
  if (!hud) return null;

  return (
    <div className="hud">
      <div className="hud-row">
        <div className="chip">
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
            Pause <kbd>Esc</kbd>
          </button>
        )}
      </div>
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
