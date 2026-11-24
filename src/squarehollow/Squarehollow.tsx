import { Canvas } from '@react-three/fiber';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { audio } from '../game/audio/audioManager';
import { useGameStore } from '../game/core/gameStore';
import { useTouchDevice } from '../ui/useTouchDevice';
import { blockIcon } from './atlas';
import { BLOCKS, PLACEABLE } from './blocks';
import { Session, type Daypart } from './session';
import { loadIsland, saveIsland } from './storage';
import { SquarehollowScene } from './SquarehollowScene';

/** Radians of turn per pixel of mouse movement, and per pixel dragged on a touch screen. */
const MOUSE_TURN = 0.0024;
const DRAG_TURN = 0.0055;
/** Pixels of mouse movement in one event beyond which it is a glitch, not a hand. */
const MAX_JUMP = 250;
/** How far the joystick knob travels from its centre, in pixels. */
const STICK_TRAVEL = 46;
/** Seconds between saves while building. */
const SAVE_EVERY_MS = 15000;

type Mode = 'arriving' | 'paused' | 'playing' | 'picker';

const DESKTOP_HELP: readonly (readonly [string, string])[] = [
  ['WASD', 'Walk'],
  ['Space', 'Jump, or swim up'],
  ['Shift', 'Run'],
  ['F', 'Fly (Space up, Shift down)'],
  ['Left click', 'Dig, or poke a local'],
  ['Right click', 'Build'],
  ['Middle click', 'Copy the block you look at'],
  ['1 to 9, wheel', 'Choose a block'],
  ['E', 'Every block'],
  ['Esc', 'Pause'],
];

/**
 * Squarehollow: what was behind the dark door in the back room. An island of blocks to wander,
 * dig and build on, with a few squared-off Sproutlings for company. Walk back through the door,
 * or use the button, to sit down at the table again.
 */
export default function Squarehollow({ onLeave }: { onLeave: () => void }) {
  const touch = useTouchDevice();
  const graphics = useGameStore((state) => state.settings.graphics);
  const grant = useGameStore((state) => state.grant);
  const lite = touch || graphics === 'low';
  const [session] = useState(() => new Session(loadIsland(), lite ? 6 : 9));
  const [mode, setMode] = useState<Mode>('arriving');
  const [hotbar, setHotbar] = useState<readonly number[]>(() => [...session.hotbar]);
  const [slot, setSlot] = useState(session.slot);
  const [part, setPart] = useState<Daypart>(session.daypart);
  const [found, setFound] = useState(false);
  const [named, setNamed] = useState<{ text: string; key: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [lockFailed, setLockFailed] = useState(false);
  const [firstVisit, setFirstVisit] = useState(true);
  const [flying, setFlying] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const water = useRef<HTMLDivElement>(null);
  // Event handlers read the mode from here, so it changes the moment a handler changes it.
  const modeRef = useRef(mode);
  const go = useCallback((next: Mode) => {
    modeRef.current = next;
    setMode(next);
  }, []);
  // Without pointer lock (or on a touch screen) the view is turned by dragging instead.
  const dragLook = touch || lockFailed;

  // The island's own music and birdsong; the back room's come back on the way out.
  useEffect(() => {
    audio.stopAmbience();
    audio.setScene('meadow');
    audio.playMusic('blocks');
    audio.setMusicMood(1, false);
    audio.startAmbience();
    return () => {
      audio.stopAmbience();
      audio.setScene('room');
      audio.playMusic('poker');
      audio.setMusicMood(1, false);
      audio.startAmbience();
    };
  }, []);

  useEffect(() => {
    if (grant('dark-door')) setFound(true);
  }, [grant]);

  // The island is kept, and what is built on it: every so often while building, on the way
  // out, and if the tab is closed.
  useEffect(() => {
    const save = (): void => {
      session.edited = false;
      saveIsland(session.save());
    };
    const saveChanges = (): void => {
      if (session.edited) save();
    };
    const timer = window.setInterval(saveChanges, SAVE_EVERY_MS);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [session]);

  const showName = useCallback((id: number) => {
    setNamed((last) => ({ text: BLOCKS[id].name, key: (last?.key ?? 0) + 1 }));
  }, []);

  const lock = useCallback(() => {
    const element = root.current;
    if (!element || touch) return false;
    try {
      const request = element.requestPointerLock() as Promise<void> | undefined;
      request?.catch?.(() => setLockFailed(true));
      return true;
    } catch {
      setLockFailed(true);
      return false;
    }
  }, [touch]);

  const play = useCallback(() => {
    setFirstVisit(false);
    if (!dragLook) lock();
    go('playing');
  }, [dragLook, lock, go]);

  const leave = useCallback(() => {
    if (leaving) return;
    session.leaving = true;
    session.active = false;
    session.release();
    setLeaving(true);
    if (document.pointerLockElement) document.exitPointerLock();
    audio.play('darkDoor');
    window.setTimeout(onLeave, 900);
  }, [leaving, session, onLeave]);

  useEffect(() => {
    session.events = {
      hotbar: (next, chosen) => {
        setHotbar([...next]);
        setSlot(chosen);
        showName(next[chosen]);
      },
      daypart: setPart,
      door: leave,
      // On a touch screen play starts at once; with a mouse the controls are shown first.
      arrived: () => go(touch ? 'playing' : 'paused'),
    };
  }, [session, leave, touch, showName, go]);

  useEffect(() => {
    session.active = mode === 'playing' && !leaving;
    session.paused = mode === 'paused' || mode === 'picker';
    if (!session.active) session.release();
  }, [session, mode, leaving]);

  // Losing the pointer (Esc) pauses.
  useEffect(() => {
    const onChange = (): void => {
      const locked = document.pointerLockElement === root.current;
      if (!locked && modeRef.current === 'playing' && !dragLook) go('paused');
    };
    const onError = (): void => setLockFailed(true);
    document.addEventListener('pointerlockchange', onChange);
    document.addEventListener('pointerlockerror', onError);
    return () => {
      document.removeEventListener('pointerlockchange', onChange);
      document.removeEventListener('pointerlockerror', onError);
    };
  }, [dragLook, go]);

  useEffect(
    () => () => {
      if (document.pointerLockElement) document.exitPointerLock();
    },
    [],
  );

  const openPicker = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    go('picker');
  }, [go]);

  const closePicker = useCallback(
    (resume: boolean) => {
      if (resume && !dragLook) lock();
      go(resume || dragLook ? 'playing' : 'paused');
    },
    [dragLook, lock, go],
  );

  const toggleFlight = useCallback(() => {
    session.toggleFlight();
    setFlying(session.body.flying);
  }, [session]);

  // Keys, the mouse and the wheel.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const current = modeRef.current;
      if (current === 'picker') {
        if (event.code === 'KeyE' || event.code === 'Escape') closePicker(event.code === 'KeyE');
        return;
      }
      // Paused, the card's own buttons take Enter and Space.
      if (current !== 'playing') return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      if (event.code.startsWith('Digit')) {
        const n = Number(event.code.slice(5));
        if (n >= 1 && n <= session.hotbar.length) session.choose(n - 1);
        return;
      }
      if (event.code === 'KeyF' && !event.repeat) toggleFlight();
      else if (event.code === 'KeyE') openPicker();
      else if (event.code === 'Escape') {
        // Browsers usually take Esc to free the pointer themselves; if it reaches here, pause.
        if (document.pointerLockElement) document.exitPointerLock();
        go('paused');
      } else session.keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      session.keys.delete(event.code);
    };
    const onBlur = (): void => session.release();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [session, openPicker, closePicker, toggleFlight, go]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const locked = (): boolean => document.pointerLockElement === element;
    const onMove = (event: MouseEvent): void => {
      if (locked() && modeRef.current === 'playing') {
        // Some browsers now and then report a wild jump while the pointer is locked: skip it.
        if (Math.abs(event.movementX) > MAX_JUMP || Math.abs(event.movementY) > MAX_JUMP) return;
        session.turn(event.movementX * MOUSE_TURN, event.movementY * MOUSE_TURN);
      }
    };
    const onDown = (event: MouseEvent): void => {
      if (!locked() || modeRef.current !== 'playing') return;
      event.preventDefault();
      if (event.button === 0) {
        session.digQueued = true;
        session.digHeld = true;
      } else if (event.button === 2) {
        session.buildQueued = true;
        session.buildHeld = true;
      } else if (event.button === 1) {
        session.pickQueued = true;
      }
    };
    const onUp = (event: MouseEvent): void => {
      if (event.button === 0) session.digHeld = false;
      if (event.button === 2) session.buildHeld = false;
    };
    const onWheel = (event: WheelEvent): void => {
      if (modeRef.current !== 'playing' || Math.abs(event.deltaY) < 1) return;
      session.choose(session.slot + (event.deltaY > 0 ? 1 : -1));
    };
    const noMenu = (event: Event): void => event.preventDefault();
    document.addEventListener('mousemove', onMove);
    element.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    element.addEventListener('wheel', onWheel, { passive: true });
    element.addEventListener('contextmenu', noMenu);
    return () => {
      document.removeEventListener('mousemove', onMove);
      element.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('contextmenu', noMenu);
    };
  }, [session]);

  // Dragging turns the view on touch screens, and with a mouse where pointer lock is refused.
  // There, a click without a drag digs (left) or builds (right).
  const drag = useRef<{ id: number; x: number; y: number; moved: number } | null>(null);
  const onViewDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!dragLook || modeRef.current !== 'playing' || drag.current) return;
    // Only the view itself turns: not the buttons, the stick or the hotbar.
    if (event.target instanceof Element && event.target.closest('button, .stick')) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onViewMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const held = drag.current;
    if (!held || held.id !== event.pointerId) return;
    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;
    held.moved += Math.abs(dx) + Math.abs(dy);
    held.x = event.clientX;
    held.y = event.clientY;
    const speed = event.pointerType === 'mouse' ? MOUSE_TURN * 1.4 : DRAG_TURN;
    session.turn(dx * speed, dy * speed);
  };
  const onViewUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const held = drag.current;
    if (!held || held.id !== event.pointerId) return;
    drag.current = null;
    if (event.pointerType === 'mouse' && held.moved < 6) {
      if (event.button === 2) session.buildQueued = true;
      else session.digQueued = true;
    }
  };

  const moveStick = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > STICK_TRAVEL) {
      dx *= STICK_TRAVEL / length;
      dy *= STICK_TRAVEL / length;
    }
    session.stick.x = dx / STICK_TRAVEL;
    session.stick.y = dy / STICK_TRAVEL;
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const releaseStick = (): void => {
    session.stick.x = 0;
    session.stick.y = 0;
    if (knob.current) knob.current.style.transform = '';
  };
  /** A touch button that acts for as long as it is held. */
  const pressable = (press: () => void, release: () => void) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      press();
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
  });

  // A blue wash over the view while the Warden's head is under water.
  useEffect(() => {
    let frame = 0;
    const tick = (): void => {
      if (water.current) water.current.style.opacity = session.eyeUnderWater ? '1' : '0';
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [session]);

  return (
    <div
      ref={root}
      className={`sq${mode === 'playing' ? ' playing' : ''}${dragLook ? ' drag' : ''}`}
      onPointerDown={onViewDown}
      onPointerMove={onViewMove}
      onPointerUp={onViewUp}
      onPointerCancel={onViewUp}
    >
      <Canvas
        flat
        dpr={lite ? [1, 1.25] : graphics === 'high' ? [1, 2] : [1, 1.5]}
        gl={{ antialias: !lite, powerPreference: 'high-performance' }}
        camera={{ fov: 72, near: 0.05, far: 260 }}
      >
        <SquarehollowScene session={session} lite={lite} held={hotbar[slot]} />
      </Canvas>
      <div ref={water} className="sq-water" />
      <div className="sq-crosshair" />

      <div className="sq-top">
        <div className="chip">
          Squarehollow · {part}
          {flying && <small> · flying</small>}
        </div>
        <button type="button" className="chip quit" onClick={leave}>
          Back through the door
        </button>
      </div>
      {found && <p className="poker-found">Achievement unlocked: All the Way In</p>}
      {touch && mode === 'playing' && firstVisit && (
        <p className="sq-tip">Stick to walk, drag to look. Walk back through the door to leave.</p>
      )}

      {named && (
        <p key={named.key} className="sq-named">
          {named.text}
        </p>
      )}
      <div className="sq-hotbar" role="toolbar" aria-label="Blocks to build with">
        {hotbar.map((id, i) => (
          <button
            key={i}
            type="button"
            className={i === slot ? 'sq-slot chosen' : 'sq-slot'}
            aria-label={`${i + 1}: ${BLOCKS[id].name}`}
            aria-pressed={i === slot}
            onClick={() => session.choose(i)}
          >
            <img src={blockIcon(id)} alt="" draggable={false} />
            {!touch && <span>{i + 1}</span>}
          </button>
        ))}
        {touch && (
          <button
            type="button"
            className="sq-slot more"
            onClick={openPicker}
            aria-label="Every block"
          >
            ···
          </button>
        )}
      </div>

      {touch && mode === 'playing' && (
        <>
          <div
            className="stick sq-stick"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              moveStick(event);
            }}
            onPointerMove={moveStick}
            onPointerUp={releaseStick}
            onPointerCancel={releaseStick}
          >
            <div ref={knob} className="stick-knob" />
          </div>
          <div className="sq-buttons">
            <button
              type="button"
              className="sq-button dig"
              {...pressable(
                () => {
                  session.digQueued = true;
                  session.digHeld = true;
                },
                () => (session.digHeld = false),
              )}
            >
              Dig
            </button>
            <button
              type="button"
              className="sq-button build"
              {...pressable(
                () => {
                  session.buildQueued = true;
                  session.buildHeld = true;
                },
                () => (session.buildHeld = false),
              )}
            >
              Build
            </button>
            <button
              type="button"
              className="sq-button jump"
              {...pressable(
                () => (session.touchJump = true),
                () => (session.touchJump = false),
              )}
            >
              Jump
            </button>
            <button
              type="button"
              className={flying ? 'sq-button fly on' : 'sq-button fly'}
              onClick={toggleFlight}
            >
              Fly
            </button>
          </div>
        </>
      )}

      {mode === 'paused' && !leaving && (
        <div className="sq-card-backdrop" onClick={play}>
          <div
            className="sq-card"
            role="dialog"
            aria-labelledby="sq-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="sq-title">{firstVisit ? 'Somewhere else' : 'Squarehollow'}</h2>
            <p>
              {firstVisit
                ? 'The dark door opens onto an island of blocks, a long way from the card table. Somebody small has been living here.'
                : 'Paused.'}
            </p>
            {!touch && (
              <dl className="sq-help">
                {DESKTOP_HELP.map(([key, what]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="sq-hint">Walk back through the door to sit down at the table again.</p>
            <div className="sq-card-buttons">
              <button type="button" onClick={play} autoFocus>
                {firstVisit ? 'Look around' : 'Back to the island'}
              </button>
              <button type="button" className="secondary" onClick={leave}>
                Back through the door
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'playing' && dragLook && !touch && (
        <button type="button" className="chip sq-pause" onClick={() => go('paused')}>
          Pause
        </button>
      )}

      {mode === 'picker' && (
        <div className="sq-card-backdrop" onClick={() => closePicker(false)}>
          <div
            className="sq-card sq-picker"
            role="dialog"
            aria-labelledby="sq-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="sq-picker-title">Every block</h2>
            <p>Choose one for slot {slot + 1}.</p>
            <div className="sq-picker-grid">
              {PLACEABLE.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={hotbar[slot] === id ? 'sq-slot chosen' : 'sq-slot'}
                  onClick={() => {
                    session.hold(id);
                    closePicker(true);
                  }}
                >
                  <img src={blockIcon(id)} alt="" draggable={false} />
                  <small>{BLOCKS[id].name}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={leaving ? 'sq-fade out' : 'sq-fade in'} />
    </div>
  );
}
