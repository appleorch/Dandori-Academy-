import { useEffect } from 'react';
import { audio } from '../game/audio/audioManager';
import { useGameStore, type BossSnapshot } from '../game/core/gameStore';
import { formatTime } from './format';
import type { InputController } from '../game/commands/input';
import { SPROUT_KINDS, SPROUTS } from '../game/workers/sprouts';
import { SprocketPortrait } from './Portrait';
import { rankTargets } from '../game/dandori/targets';
import { LEVELS, type LevelDefinition } from '../game/world/level';

/** How long a remark of the Headmaster's stays up: it fades out over the end of this. */
const SPROCKET_SECONDS = 5.6;

const GUARD_TEXT: Record<BossSnapshot['guard'], string> = {
  open: 'Open: full damage!',
  armoured: 'Armoured',
  shielded: 'Shielded: break the root-knots',
  dark: 'In the dark: light a beacon nearby',
};

/** In-day overlay: clock, treasure progress, a day bar marked with each rank's deadline, where
 * the workforce is, and the pause button. */
export function Hud({
  level,
  touch,
  input,
}: {
  level: LevelDefinition;
  touch: boolean;
  input?: InputController;
}) {
  const hud = useGameStore((state) => state.hud);
  const phase = useGameStore((state) => state.phase);
  const pause = useGameStore((state) => state.pause);
  const hint = useGameStore((state) => state.hint);
  const sprocket = useGameStore((state) => state.sprocket);
  const nearSecret = useGameStore((state) => state.nearSecret);
  const openPoker = useGameStore((state) => state.openPoker);
  const nearDescent = useGameStore((state) => state.nearDescent);
  const nearAscent = useGameStore((state) => state.nearAscent);
  const below = LEVELS.find((candidate) => candidate.id === nearDescent);
  useEffect(() => {
    if (hint) audio.play('hint');
  }, [hint]);
  // The Headmaster's banner leaves once it has faded, so it never sits in the way unseen.
  const remark = sprocket?.id;
  useEffect(() => {
    if (remark === undefined) return;
    const timer = window.setTimeout(() => {
      useGameStore.setState((state) => (state.sprocket?.id === remark ? { sprocket: null } : {}));
    }, SPROCKET_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [remark]);
  if (!hud) return null;
  const elapsed = 1 - hud.timeLeft / level.dayLength;
  // Where the workforce is: along the bottom on a desktop; on touch, up top, clear of the controls.
  const counts = (
    <div className={touch ? 'hud-row counts' : 'hud-row bottom'}>
      <div className="chip squad-kinds" aria-label="Squad by kind">
        {SPROUT_KINDS.map((kind, i) =>
          hud.squadKinds[kind] > 0 || hud.selected === kind ? (
            <button
              key={kind}
              type="button"
              className={hud.selected === kind ? `kind ${kind} chosen` : `kind ${kind}`}
              onClick={() => input?.queueSelect(kind)}
              title={`${SPROUTS[kind].plural}: ${SPROUTS[kind].knack}${touch ? '' : ` (key ${i + 1})`}`}
            >
              <span className="dot" /> {hud.squadKinds[kind]}
              {hud.selected === kind && <small>{SPROUTS[kind].plural}</small>}
            </button>
          ) : null,
        )}
      </div>
      <div className="chip">
        <span className="dot working" /> Working {hud.working}
      </div>
      <div className={hud.idle > 0 ? 'chip idle-warning' : 'chip'}>
        <span className="dot idle" /> Idle {hud.idle}
      </div>
      <div className="chip">Field {hud.total}</div>
    </div>
  );

  return (
    <div className={touch ? 'hud touch' : 'hud'}>
      <div className="hud-row">
        <div className="chip hud-level">
          {level.stage}. {level.name}
        </div>
        {level.difficulty === 'hard' && <div className="chip hard-chip">Hard</div>}
        <div
          className={
            hud.below
              ? 'chip clock stopped'
              : hud.timeLeft <= 30
                ? 'chip clock urgent'
                : 'chip clock'
          }
          title={hud.below ? 'The day above waits until you come back up' : undefined}
        >
          {formatTime(hud.timeLeft)}
          {hud.below && ' ⏸'}
        </div>
        {hud.below ? (
          <div className="chip below-chip">
            Below: {hud.below} · Relics {hud.treasuresCollected}/{hud.treasuresTotal}
          </div>
        ) : (
          <div className="chip">
            Sunshards {hud.treasuresCollected}/{hud.treasuresTotal} · {hud.treasureValue} pts
          </div>
        )}
        {hud.split !== null && (
          <div
            className={hud.split <= 0 ? 'chip split ahead' : 'chip split behind'}
            title="Compared with your fastest clear, at the same Sunshard"
          >
            PB {hud.split <= 0 ? '−' : '+'}
            {Math.abs(hud.split).toFixed(1)}s
          </div>
        )}
        {hud.chain >= 2 && (
          // Keyed so each new link replays the pop. Prefixed: keys must never collide with a
          // sibling's, or React leaves stale copies behind.
          <div key={`chain-${hud.chain}`} className="chip chain" aria-live="polite">
            Chain <strong>×{hud.chain}</strong>
          </div>
        )}
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
      {!hud.below && (
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
      )}
      {touch && counts}
      {phase === 'playing' && (
        <div className="callouts">
          {nearSecret && (
            <button type="button" className="chip knock" onClick={openPoker}>
              Knock on the little door {!touch && <kbd>E</kbd>}
            </button>
          )}
          {below && (
            <button
              type="button"
              className="chip knock descend"
              onClick={() => input?.queueInteract()}
            >
              Go down to {below.name} (the day above waits) {!touch && <kbd>E</kbd>}
            </button>
          )}
          {nearAscent && (
            <button
              type="button"
              className="chip knock descend"
              onClick={() => input?.queueInteract()}
            >
              Go back up {!touch && <kbd>E</kbd>}
            </button>
          )}
          {hint ? (
            <p className="coach" role="status">
              <strong>Ashwick</strong> {hint}
            </p>
          ) : (
            sprocket && (
              <div
                key={`sprocket-${sprocket.id}`}
                className={`sprocket-banner ${sprocket.mood}`}
                role="status"
              >
                <SprocketPortrait mood={sprocket.mood} />
                <p>
                  <strong>Headmaster Sprocket</strong>
                  {sprocket.text}
                </p>
              </div>
            )
          )}
        </div>
      )}
      <div className="hud-spacer" />
      {!touch && counts}
      {phase === 'playing' && !hud.below && hud.timeLeft <= 30 && hud.timeLeft > 0 && (
        <div className="urgent-vignette" aria-hidden="true" />
      )}
    </div>
  );
}
