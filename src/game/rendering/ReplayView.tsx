import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { useGameStore } from '../core/gameStore';
import { SIM_DT } from '../core/config';
import { initPhysics } from '../simulation/physics';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';
import { ReplayRun, type DayLog } from '../replay/replay';
import { formatTime } from '../../ui/format';
import { Architecture } from './Architecture';
import { Atmosphere } from './Atmosphere';
import { Beacons } from './Beacons';
import { CaptainMesh } from './CaptainMesh';
import { CarryableMeshes } from './CarryableMeshes';
import { Conveyors } from './Conveyors';
import { Dewdrops } from './Dewdrops';
import { EnemyMeshes } from './EnemyMeshes';
import { Fallen } from './Fallen';
import { Feedback } from './feedback';
import { HazardMeshes } from './HazardMeshes';
import { KitMeshes } from './KitMeshes';
import { OverlayInMainPass } from './OverlayInMainPass';
import { ParticleField } from './ParticleField';
import { Popups } from './Popups';
import { Scenery } from './Scenery';
import { SkyLight } from './SkyLight';
import { Terrain } from './Terrain';
import { WaterAndBridges } from './WaterAndBridges';
import { WorkerInstances } from './WorkerInstances';

/** Playback speeds offered, slowest first. */
export const SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;
const STEPS_PER_SECOND = 1 / SIM_DT;
/** Most steps played in one frame, so a slow machine at 8× still draws. */
const MAX_STEPS_PER_FRAME = 60 * 8;

interface Playback {
  playing: boolean;
  speed: number;
  /** Follow the Warden, or a free camera moved by the keys and the mouse. */
  follow: boolean;
}

/** Steps the replay along at the chosen speed and hands its events to the effects. */
function ReplayDriver({
  run,
  playback,
  fx,
  onSim,
  onTick,
}: {
  run: ReplayRun;
  playback: React.MutableRefObject<Playback>;
  fx: Feedback;
  onSim: (sim: Simulation) => void;
  onTick: (step: number) => void;
}) {
  const owed = useRef(0);
  useFrame((_, delta) => {
    const { playing, speed } = playback.current;
    if (!playing || run.done) return;
    owed.current += Math.min(delta, 0.1) * speed * STEPS_PER_SECOND;
    const steps = Math.min(MAX_STEPS_PER_FRAME, Math.floor(owed.current));
    owed.current -= steps;
    const was = run.expedition.active;
    for (let i = 0; i < steps && !run.done; i++) {
      run.advance(1);
      for (const event of run.expedition.active.events) fx.handle(event);
    }
    if (run.expedition.active !== was) onSim(run.expedition.active);
    onTick(run.step);
  }, -1);
  return null;
}

/** The replay's camera: over the Warden's shoulder as in play, or free (WASD or drag, wheel). */
function ReplayCamera({
  sim,
  playback,
}: {
  sim: Simulation;
  playback: React.MutableRefObject<Playback>;
}) {
  const free = useRef({ x: sim.captainTransform.x, z: sim.captainTransform.z, zoom: 30 });
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.code);
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const wheel = (event: WheelEvent) => {
      free.current.zoom = Math.min(90, Math.max(12, free.current.zoom + event.deltaY * 0.03));
    };
    let drag: { x: number; y: number } | null = null;
    const press = (event: PointerEvent) => {
      if ((event.target as Element).closest('canvas'))
        drag = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (!drag) return;
      playback.current.follow = false;
      const scale = free.current.zoom / 400;
      free.current.x -= (event.clientX - drag.x) * scale;
      free.current.z -= (event.clientY - drag.y) * scale;
      drag = { x: event.clientX, y: event.clientY };
    };
    const release = () => {
      drag = null;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
    };
  }, [playback]);
  useFrame(({ camera }, delta) => {
    const view = free.current;
    const pan = (keys.current.has('KeyD') ? 1 : 0) - (keys.current.has('KeyA') ? 1 : 0);
    const tilt = (keys.current.has('KeyS') ? 1 : 0) - (keys.current.has('KeyW') ? 1 : 0);
    if (pan || tilt) {
      playback.current.follow = false;
      view.x += pan * view.zoom * delta;
      view.z += tilt * view.zoom * delta;
    }
    if (playback.current.follow) {
      view.x = sim.captainTransform.x;
      view.z = sim.captainTransform.z;
    }
    const ground = heightAt(sim.level, view.x, view.z);
    const ease = 1 - Math.exp(-delta * 6);
    camera.position.x += (view.x - camera.position.x) * ease;
    camera.position.y += (ground + view.zoom * 0.85 - camera.position.y) * ease;
    camera.position.z += (view.z + view.zoom * 0.6 - camera.position.z) * ease;
    camera.lookAt(camera.position.x, ground, camera.position.z - view.zoom * 0.6);
  });
  return null;
}

/**
 * The replay viewer: a recorded day played back exactly, with speeds from a quarter to eight
 * times, a timeline to scrub along, and a camera that follows the Warden or roams free.
 * Seeking backwards replays from the start (fast, headless) up to the chosen moment.
 */
export function ReplayView({ log, title }: { log: DayLog; title: string }) {
  const leaveReplay = useGameStore((state) => state.leaveReplay);
  const [run, setRun] = useState<ReplayRun | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(0);
  const [, redraw] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [fx] = useState(() => new Feedback());
  const playback = useRef<Playback>({ playing: true, speed: 1, follow: true });

  useEffect(() => {
    let live = true;
    let opened: ReplayRun | null = null;
    void (async () => {
      await initPhysics();
      opened = await ReplayRun.open(log).catch(() => null);
      if (!live) return opened?.dispose();
      if (!opened) return setFailed(true);
      setRun(opened);
      setSim(opened.expedition.active);
    })();
    return () => {
      live = false;
      opened?.dispose();
    };
  }, [log]);

  useEffect(() => {
    if (sim) fx.ground = (x, z) => heightAt(sim.level, x, z);
  }, [sim, fx]);

  // Space plays and pauses, Escape leaves, F follows the Warden again.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        playback.current.playing = !playback.current.playing;
        redraw((n) => n + 1);
      } else if (event.code === 'Escape') leaveReplay();
      else if (event.code === 'KeyF') {
        playback.current.follow = true;
        redraw((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leaveReplay]);

  /** Goes to a step: forward by playing on, back by starting again from the first step. */
  const seek = (target: number) => {
    if (!run) return;
    setSeeking(true);
    window.setTimeout(() => {
      let current = run;
      if (target < current.step) {
        current.dispose();
        current = new ReplayRun(log, run.inputs, run.level);
        setRun(current);
        setGeneration((n) => n + 1);
      }
      current.advance(target - current.step);
      setSim(current.expedition.active);
      setStep(current.step);
      setSeeking(false);
    }, 20);
  };

  const total = run?.total ?? Math.round(log.seconds * STEPS_PER_SECOND);
  const { playing, speed, follow } = playback.current;
  return (
    <div className="game replay">
      {failed && (
        <div className="screen overlay">
          <div className="panel">
            <h1>Replay</h1>
            <p>
              This replay was recorded on another version of the game, and cannot be played here.
            </p>
            <button type="button" onClick={leaveReplay} autoFocus>
              Back
            </button>
          </div>
        </div>
      )}
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.92 }}
        camera={{ fov: 42, near: 1, far: 320, position: [0, 60, 40] }}
      >
        <OverlayInMainPass />
        {run && sim && (
          <>
            <ReplayDriver
              key={`driver-${generation}`}
              run={run}
              playback={playback}
              fx={fx}
              onSim={setSim}
              onTick={setStep}
            />
            <group key={`world-${sim.level.id}`}>
              <Terrain level={sim.level} />
              <Architecture level={sim.level} />
              <KitMeshes level={sim.level} density={0.6} />
              <Scenery level={sim.level} sim={sim} density={0.6} />
            </group>
            <group key={`day-${sim.level.id}-${run.expedition.surface === sim ? 'up' : 'down'}`}>
              <ReplayCamera sim={sim} playback={playback} />
              <SkyLight sim={sim} shadowMapSize={1024} />
              <Atmosphere sim={sim} />
              <CaptainMesh sim={sim} />
              <WorkerInstances sim={sim} />
              <Dewdrops sim={sim} />
              <Fallen sim={sim} />
              <Conveyors sim={sim} />
              <CarryableMeshes sim={sim} />
              <EnemyMeshes sim={sim} />
              <WaterAndBridges sim={sim} />
              <Beacons sim={sim} />
              <HazardMeshes sim={sim} />
              <ParticleField particles={fx.particles} />
              <Popups fx={fx} />
            </group>
          </>
        )}
      </Canvas>
      <div className="replay-bar" role="toolbar" aria-label="Replay controls">
        <p className="replay-title">
          <span className="eyebrow">Replay</span> {title}
        </p>
        <button
          type="button"
          className="chip replay-play"
          onClick={() => {
            playback.current.playing = !playing;
            redraw((n) => n + 1);
          }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <label className="replay-scrub">
          <span className="sr-only">Timeline</span>
          <input
            type="range"
            min={0}
            max={total}
            step={STEPS_PER_SECOND}
            value={step}
            disabled={!run || seeking}
            onChange={(event) => seek(Number(event.target.value))}
          />
          <span className="replay-time">
            {seeking
              ? 'Seeking…'
              : `${formatTime(step / STEPS_PER_SECOND)} / ${formatTime(total / STEPS_PER_SECOND)}`}
          </span>
        </label>
        <div className="replay-speeds" role="group" aria-label="Speed">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              className={value === speed ? 'chip active' : 'chip'}
              aria-pressed={value === speed}
              onClick={() => {
                playback.current.speed = value;
                redraw((n) => n + 1);
              }}
            >
              {value}×
            </button>
          ))}
        </div>
        <button
          type="button"
          className={follow ? 'chip active' : 'chip'}
          aria-pressed={follow}
          onClick={() => {
            playback.current.follow = !follow;
            redraw((n) => n + 1);
          }}
          title="Follow the Warden (F). WASD or drag to roam; the wheel zooms."
        >
          Follow
        </button>
        <button type="button" className="chip" onClick={leaveReplay}>
          Leave
        </button>
      </div>
    </div>
  );
}
