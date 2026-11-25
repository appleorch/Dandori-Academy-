import { useEffect } from 'react';
import { audio } from '../game/audio/audioManager';
import { useGameStore, type BossSnapshot } from '../game/core/gameStore';
import { fieldTitle, formatTime } from './format';
import { currentSection } from '../game/campaign/campaign';
import type { InputController } from '../game/commands/input';
import { SPROUT_KINDS, SPROUTS } from '../game/workers/sprouts';
import { isChallenge, medalTargets, MODES } from '../game/modes/modes';
import { levelById, type LevelDefinition } from '../game/world/level';
import { RacePanel } from './RacePanel';
import { KindGlyph } from './KindGlyph';
import { ActionPrompt } from './Glyph';
import { SPEAKER_NAMES, type Speaker } from '../game/story/scenes';
import { AshwickPortrait, QuillPortrait, SprocketPortrait, TindlePortrait } from './Portrait';

/** The portrait for whoever is speaking in a scene (the Warden has none: it is you). */
function speakerPortrait(who: Speaker) {
  if (who === 'sprocket') return <SprocketPortrait mood="muse" />;
  if (who === 'ashwick') return <AshwickPortrait />;
  if (who === 'tindle') return <TindlePortrait />;
  if (who === 'quill') return <QuillPortrait />;
  return null;
}
import { keyLabel, type Action } from '../game/commands/bindings';

const KIND_ACTIONS: readonly Action[] = ['kind1', 'kind2', 'kind3', 'kind4'];

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
  const bindings = useGameStore((state) => state.settings.bindings);
  const mode = useGameStore((state) => state.playMode);
  const race = useGameStore((state) => state.race);
  const phase = useGameStore((state) => state.phase);
  const pause = useGameStore((state) => state.pause);
  const hint = useGameStore((state) => state.hint);
  const sprocket = useGameStore((state) => state.sprocket);
  const nearSecret = useGameStore((state) => state.nearSecret);
  const nearSprout = useGameStore((state) => state.nearSprout);
  const nearTelescope = useGameStore((state) => state.nearTelescope);
  const bossIntro = useGameStore((state) => state.bossIntro);
  const showBossIntro = useGameStore((state) => state.showBossIntro);
  const openPoker = useGameStore((state) => state.openPoker);
  const nearDescent = useGameStore((state) => state.nearDescent);
  const nearAscent = useGameStore((state) => state.nearAscent);
  const below = nearDescent ? levelById(nearDescent) : undefined;
  const campaign = useGameStore((state) => state.save.campaign);
  useEffect(() => {
    if (!hint) return;
    audio.play('hint');
    audio.speak('ashwick', hint);
  }, [hint]);
  // The Headmaster's remarks are spoken as well as shown.
  useEffect(() => {
    if (sprocket) audio.speak('sprocket', sprocket.text);
  }, [sprocket]);

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
  const elapsed = level.dayLength > 0 ? 1 - hud.timeLeft / level.dayLength : 0;
  const story = mode === 'campaign';
  const untimed = level.untimed === true;
  // The story counts Great Clock parts: those home before today, and those brought home today.
  const section = story ? currentSection(campaign) : null;
  const partsHome = section
    ? section.parts.filter((id) => campaign.parts[id] !== undefined || hud.treasureIds.includes(id))
        .length
    : 0;
  const sunset = story && hud.timeLeft <= 60;
  // The day bar marks the pace Platinum and Diamond need, in challenges that time the day.
  const marks = isChallenge(mode)
    ? medalTargets(mode, level).flatMap((target) =>
        target.finishBy === null ? [] : [{ rank: target.rank, at: target.finishBy }],
      )
    : [];
  const live = hud.challenge;
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
              aria-label={`${hud.squadKinds[kind]} ${SPROUTS[kind].plural}${hud.selected === kind ? ', chosen to throw' : ''}`}
              aria-pressed={hud.selected === kind}
              title={`${SPROUTS[kind].plural}: ${SPROUTS[kind].knack}${
                touch || !keyLabel(bindings, KIND_ACTIONS[i])
                  ? ''
                  : ` (${keyLabel(bindings, KIND_ACTIONS[i])})`
              }`}
            >
              <KindGlyph kind={kind} /> {hud.squadKinds[kind]}
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
          {story
            ? `Day ${campaign.day + (phase === 'results' ? 0 : 1)} · ${level.name}`
            : mode === 'lessons'
              ? fieldTitle(level)
              : `${MODES[mode].name} · ${fieldTitle(level)}`}
        </div>
        {level.difficulty === 'hard' && <div className="chip hard-chip">Hard</div>}
        <div
          className={
            hud.below
              ? 'chip clock stopped'
              : hud.timeLeft <= 30 && !untimed
                ? 'chip clock urgent'
                : 'chip clock'
          }
          title={
            hud.below
              ? 'The day above waits until you come back up'
              : untimed
                ? 'No clock today: time taken, for your own interest'
                : story
                  ? 'Daylight left. At sunset everyone away from the Kiln and the lit beacons is lost'
                  : undefined
          }
        >
          {untimed ? `⏱ ${formatTime(hud.elapsed)}` : formatTime(hud.timeLeft)}
          {hud.below && ' ⏸'}
        </div>
        {sunset && (
          <div className="chip sunset" role="status">
            Sunset: back to the Kiln or a lit beacon!
          </div>
        )}
        {hud.below ? (
          <div className="chip below-chip">
            Below: {hud.below} · Relics {hud.treasuresCollected}/{hud.treasuresTotal}
          </div>
        ) : (
          <>
            {section ? (
              <div
                className="chip"
                title="Parts of the Great Clock home, today and on earlier days"
              >
                Clock parts {partsHome}/{section.parts.length}
              </div>
            ) : (
              <div
                className="chip"
                title={
                  mode === 'lessons'
                    ? 'Bring every Sunshard home to clear the lesson'
                    : 'Sunshards home'
                }
              >
                Sunshards {hud.treasuresCollected}/{hud.treasuresTotal}
              </div>
            )}
            {live && (
              <div
                className="chip score-chip"
                title="Points banked so far; any time bonus is added when the day ends"
              >
                Score <strong>{live.total}</strong>
                {live.next ? (
                  <small className={`rank-${live.next.rank.toLowerCase()}`}>
                    {' '}
                    · {live.next.rank} at {live.next.score}
                  </small>
                ) : (
                  <small className="rank-diamond"> · Diamond pace</small>
                )}
              </div>
            )}
            {hud.bonusOf > 0 && (
              <div
                className="chip bonus-chip"
                title="Bonus treasure: twin pairs home on time and Dewglass kept whole"
              >
                Bonus {hud.bonusGot}/{hud.bonusOf}
              </div>
            )}
            {hud.glowcapsOf > 0 && (
              <div
                className="chip bonus-chip"
                title="Glowcaps: extra points in challenges, never needed for a medal"
              >
                Glowcaps {hud.glowcapsGot}/{hud.glowcapsOf}
              </div>
            )}
          </>
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
            Pause {!touch && <ActionPrompt action="pause" />}
          </button>
        )}
      </div>
      {bossIntro && (
        <button type="button" className="boss-intro" onClick={() => showBossIntro(null)}>
          <strong>{bossIntro.name}</strong>
          <em>{bossIntro.title}</em>
          <small>Click to skip</small>
        </button>
      )}
      {hud.boss && !bossIntro && (
        <div
          className={`bossbar ${hud.boss.guard}`}
          role="img"
          aria-label={`${hud.boss.name} health ${Math.round(hud.boss.health * 100)} percent, ${GUARD_TEXT[hud.boss.guard]}`}
        >
          <span className="bossbar-name">
            {hud.boss.name} <small>{GUARD_TEXT[hud.boss.guard]}</small>
            {hud.boss.weakTo && (
              <small> · only {SPROUTS[hud.boss.weakTo].plural} hurt it now</small>
            )}
          </span>
          <span className="bossbar-track">
            <span className="bossbar-fill" style={{ width: `${hud.boss.health * 100}%` }} />
            {/* Where each phase begins: the fight changes when the bar crosses a mark. */}
            {hud.boss.phases.map((at) => (
              <span key={at} className="bossbar-phase" style={{ left: `${at * 100}%` }} />
            ))}
          </span>
        </div>
      )}
      {hud.twins.length > 0 && (
        <div className="twin-timers" role="status">
          {hud.twins.map((twin) => (
            <div
              key={`twin-${twin.letter}`}
              className="chip twin-timer"
              style={{ borderColor: twin.colour, color: twin.colour }}
            >
              Twin {twin.letter} ({twin.shape}): bring its other half home in{' '}
              <strong>{Math.ceil(twin.left)}s</strong>
            </div>
          ))}
        </div>
      )}
      {race && phase === 'playing' && <RacePanel race={race} />}
      {!hud.below && !untimed && (
        <div
          className="daybar"
          role="img"
          aria-label={`Day ${Math.round(elapsed * 100)} percent over`}
        >
          <div className="daybar-fill" style={{ width: `${elapsed * 100}%` }} />
          {marks.map((mark) => (
            <span
              key={mark.rank}
              className={`daybar-mark rank-${mark.rank.toLowerCase()}`}
              style={{ left: `${(mark.at / level.dayLength) * 100}%` }}
              title={`${mark.rank} pace: everything done by here`}
            >
              {mark.rank[0]}
            </span>
          ))}
          <span className="daybar-sun" style={{ left: `${elapsed * 100}%` }} />
        </div>
      )}
      {touch && counts}
      {phase === 'playing' && (
        <div className="callouts">
          {(hud.items.emberbrew > 0 || hud.items.stillwater > 0 || hud.warden !== null) && (
            <p className="chip story-kit" role="status">
              {hud.warden !== null && (
                <span>
                  Warden {hud.warden + 1} of 2 <ActionPrompt action="switchWarden" />
                </span>
              )}
              {hud.items.emberbrew > 0 && (
                <span>
                  {' '}
                  Emberbrew ×{hud.items.emberbrew} <ActionPrompt action="emberbrew" />
                </span>
              )}
              {hud.items.stillwater > 0 && (
                <span>
                  {' '}
                  Stillwater ×{hud.items.stillwater} <ActionPrompt action="stillwater" />
                </span>
              )}
              {hud.brew > 0 && <span> · brewed up {Math.ceil(hud.brew)}s</span>}
            </p>
          )}
          {nearTelescope && (
            <button type="button" className="chip knock" onClick={() => input?.queueInteract()}>
              Look through the telescope {!touch && <ActionPrompt action="interact" />}
            </button>
          )}
          {nearSprout && !nearSecret && !nearTelescope && (
            <button type="button" className="chip knock" onClick={() => input?.queueInteract()}>
              Pluck (hold to sweep) {!touch && <ActionPrompt action="interact" />}
            </button>
          )}
          {nearSecret && (
            <button type="button" className="chip knock" onClick={openPoker}>
              Knock on the little door {!touch && <ActionPrompt action="interact" />}
            </button>
          )}
          {below && (
            <button
              type="button"
              className="chip knock descend"
              onClick={() => input?.queueInteract()}
            >
              Go down to {below.name} (the day above waits){' '}
              {!touch && <ActionPrompt action="interact" />}
            </button>
          )}
          {nearAscent && (
            <button
              type="button"
              className="chip knock descend"
              onClick={() => input?.queueInteract()}
            >
              Go back up {!touch && <ActionPrompt action="interact" />}
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
      {phase === 'playing' && !hud.below && !untimed && hud.timeLeft <= 30 && hud.timeLeft > 0 && (
        <div className="urgent-vignette" aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * A story scene's current line: who is speaking, with their portrait, along the bottom of the
 * screen. Click it for the next line, or Skip. Shown even before the day's HUD has anything to
 * show, as the first morning's scene plays before the day begins.
 */
export function ScenePanel() {
  const scene = useGameStore((state) => state.scene);
  const nextSceneLine = useGameStore((state) => state.nextSceneLine);
  const endScene = useGameStore((state) => state.endScene);
  if (!scene) return null;
  const line = scene.scene.lines[scene.line];
  return (
    <div className="scene-line" role="dialog" aria-label="Story scene">
      <button type="button" className="scene-say" onClick={nextSceneLine}>
        {speakerPortrait(line.who)}
        <span>
          <strong>{SPEAKER_NAMES[line.who]}</strong>
          {line.text}
        </span>
      </button>
      <button type="button" className="secondary small scene-skip" onClick={endScene}>
        Skip
      </button>
    </div>
  );
}
