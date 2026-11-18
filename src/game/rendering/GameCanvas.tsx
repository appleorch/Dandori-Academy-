import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { audio } from '../audio/audioManager';
import { useGameStore } from '../core/gameStore';
import { CameraRig } from '../camera/CameraRig';
import type { InputController } from '../commands/input';
import { Expedition } from '../simulation/expedition';
import { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';
import type { GraphicsLevel } from '../core/settings';
import type { LevelDefinition } from '../world/level';
import { AimArc } from './AimArc';
import { Architecture } from './Architecture';
import { Beacons } from './Beacons';
import { Atmosphere } from './Atmosphere';
import { CaptainMesh } from './CaptainMesh';
import { CarryableMeshes } from './CarryableMeshes';
import { CursorFx } from './CursorFx';
import { EnemyMeshes } from './EnemyMeshes';
import { Feedback } from './feedback';
import { GameLoop } from './GameLoop';
import { HazardMeshes } from './HazardMeshes';
import { Minimap } from './Minimap';
import { ParticleField } from './ParticleField';
import { OverlayInMainPass } from './OverlayInMainPass';
import { PostFx } from './PostFx';
import { Popups } from './Popups';
import { Scenery } from './Scenery';
import { SkyLight } from './SkyLight';
import { Terrain } from './Terrain';
import { WaterAndBridges } from './WaterAndBridges';
import { WorkerInstances } from './WorkerInstances';

/**
 * Owns one day's simulation and renders it. Remount (change `key`) to start a new day.
 * Changing the graphics level rebuilds the 3D scene but keeps the simulation.
 */
interface Quality {
  shadows: boolean;
  shadowMapSize: number;
  postFx: boolean;
  ambientOcclusion: boolean;
  dpr: [number, number];
}

const QUALITY: Record<GraphicsLevel, Quality> = {
  low: { shadows: false, shadowMapSize: 512, postFx: false, ambientOcclusion: false, dpr: [1, 1] },
  medium: {
    shadows: true,
    shadowMapSize: 1024,
    postFx: true,
    ambientOcclusion: false,
    dpr: [1, 1.5],
  },
  high: { shadows: true, shadowMapSize: 2048, postFx: true, ambientOcclusion: true, dpr: [1, 2] },
};

interface GameCanvasProps {
  level: LevelDefinition;
  input: InputController;
}

export function GameCanvas({ level, input }: GameCanvasProps) {
  // The day: the surface and any caves gone down into. `sim` is whichever is being played.
  const [expedition, setExpedition] = useState<Expedition | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);
  const [fx] = useState(() => new Feedback());
  const playing = useGameStore((state) => state.phase === 'playing' && !state.paused);

  const graphics = useGameStore((state) => state.settings.graphics);
  const quality = QUALITY[graphics];
  const zoomSpeed = useGameStore((state) => state.settings.zoomSpeed);
  const pauseOnBlur = useGameStore((state) => state.settings.pauseOnBlur);

  useEffect(() => {
    const created = new Expedition(new Simulation(level));
    setExpedition(created);
    setSim(created.active);
    return () => created.dispose();
  }, [level]);

  // Effects sit on raised ground of whichever place is being played.
  useEffect(() => {
    const ground = sim?.level ?? level;
    fx.ground = (x, z) => heightAt(ground, x, z);
  }, [sim, level, fx]);

  useEffect(() => {
    input.zoomSpeed = zoomSpeed;
  }, [input, zoomSpeed]);

  // The whistle never outlives the day it was blown in.
  useEffect(() => {
    if (!playing) audio.setWhistle(false);
  }, [playing]);

  // Escape toggles the pause menu.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const store = useGameStore.getState();
      if (store.pokerOpen) return;
      if (event.code === 'Enter' && store.briefing) store.beginDay();
      // R restarts from the pause menu or the results, never mid-play by accident.
      if (event.code === 'KeyR' && (store.paused || store.phase === 'results')) {
        store.startDay(store.levelId);
      }
      if (event.code !== 'Escape' || store.briefing) return;
      if (store.paused) store.resume();
      else store.pause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Pause when the player switches tabs or windows, if they asked for that.
  useEffect(() => {
    if (!pauseOnBlur) return;
    const pause = (): void => useGameStore.getState().pause();
    const onVisibility = (): void => {
      if (document.hidden) pause();
    };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pauseOnBlur]);

  return (
    <Canvas
      key={graphics}
      shadows={quality.shadows ? 'soft' : false}
      dpr={quality.dpr}
      gl={{
        antialias: !quality.postFx,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 0.92,
      }}
      camera={{
        fov: 42,
        near: 1,
        far: 320,
        // High above the Warden, so the day opens with a swoop down to the field.
        position: [level.captain.x, 70, level.captain.z + 44],
      }}
    >
      {quality.postFx ? (
        <PostFx ambientOcclusion={quality.ambientOcclusion} />
      ) : (
        <OverlayInMainPass />
      )}
      {expedition && sim && (
        <GameLoop expedition={expedition} input={input} fx={fx} onSwitch={setSim} />
      )}
      {/* Everything that belongs to one place is rebuilt when the Warden goes down or up. */}
      <group key={sim?.level.id ?? level.id}>
        <Terrain level={sim?.level ?? level} />
        <Architecture level={sim?.level ?? level} />
        <Scenery level={sim?.level ?? level} sim={sim ?? undefined} />
      </group>
      {sim && (
        <group key={sim.level.id}>
          <CameraRig sim={sim} input={input} fx={fx} />
          <SkyLight sim={sim} shadowMapSize={quality.shadowMapSize} />
          <Atmosphere sim={sim} />
          <CaptainMesh sim={sim} />
          <WorkerInstances sim={sim} />
          <CarryableMeshes sim={sim} />
          <EnemyMeshes sim={sim} />
          <WaterAndBridges sim={sim} />
          <Beacons sim={sim} />
          <Minimap sim={sim} />
          <HazardMeshes sim={sim} />
          <AimArc sim={sim} />
          <CursorFx sim={sim} />
          <ParticleField particles={fx.particles} />
          <Popups fx={fx} />
        </group>
      )}
    </Canvas>
  );
}
