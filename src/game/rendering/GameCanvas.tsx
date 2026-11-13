import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { audio } from '../audio/audioManager';
import { useGameStore } from '../core/gameStore';
import { CameraRig } from '../camera/CameraRig';
import { InputController } from '../commands/input';
import { Simulation } from '../simulation/Simulation';
import type { LevelDefinition } from '../world/level';
import { AimArc } from './AimArc';
import { CaptainMesh } from './CaptainMesh';
import { CarryableMeshes } from './CarryableMeshes';
import { CursorFx } from './CursorFx';
import { EnemyMeshes } from './EnemyMeshes';
import { Feedback } from './feedback';
import { GameLoop } from './GameLoop';
import { HazardMeshes } from './HazardMeshes';
import { ParticleField } from './ParticleField';
import { Popups } from './Popups';
import { Scenery } from './Scenery';
import { SkyLight } from './SkyLight';
import { Terrain } from './Terrain';
import { WorkerInstances } from './WorkerInstances';

/**
 * Owns one day's simulation and renders it. Remount (change `key`) to start a new day.
 * Turning shadows on or off rebuilds the 3D scene but keeps the simulation.
 */
export function GameCanvas({ level }: { level: LevelDefinition }) {
  const [sim, setSim] = useState<Simulation | null>(null);
  const [input] = useState(() => new InputController());
  const [fx] = useState(() => new Feedback());
  const playing = useGameStore((state) => state.phase === 'playing' && !state.paused);

  const shadows = useGameStore((state) => state.settings.shadows);
  const zoomSpeed = useGameStore((state) => state.settings.zoomSpeed);
  const pauseOnBlur = useGameStore((state) => state.settings.pauseOnBlur);

  useEffect(() => {
    const created = new Simulation(level);
    setSim(created);
    return () => created.dispose();
  }, [level]);

  useEffect(() => {
    input.zoomSpeed = zoomSpeed;
  }, [input, zoomSpeed]);

  // Music plays only while a day is actually running.
  useEffect(() => {
    if (!playing) return;
    audio.startMusic();
    return () => {
      audio.stopMusic();
      audio.setWhistle(false);
    };
  }, [playing]);

  // Escape toggles the pause menu.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code !== 'Escape') return;
      const store = useGameStore.getState();
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
      key={shadows ? 'shadows' : 'flat'}
      shadows={shadows}
      camera={{ fov: 45, near: 1, far: 300, position: [0, 22, 16] }}
    >
      <Terrain level={level} />
      <Scenery level={level} />
      {sim && (
        <>
          <GameLoop sim={sim} input={input} fx={fx} />
          <CameraRig sim={sim} input={input} fx={fx} />
          <SkyLight sim={sim} />
          <CaptainMesh sim={sim} />
          <WorkerInstances sim={sim} />
          <CarryableMeshes sim={sim} />
          <EnemyMeshes sim={sim} />
          <HazardMeshes sim={sim} />
          <AimArc sim={sim} />
          <CursorFx sim={sim} />
          <ParticleField particles={fx.particles} />
          <Popups fx={fx} />
        </>
      )}
    </Canvas>
  );
}
