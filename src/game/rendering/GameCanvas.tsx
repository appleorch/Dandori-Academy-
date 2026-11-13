import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { useGameStore } from '../core/gameStore';
import { CameraRig } from '../camera/CameraRig';
import { InputController } from '../commands/input';
import { Simulation } from '../simulation/Simulation';
import type { LevelDefinition } from '../world/level';
import { CaptainMesh } from './CaptainMesh';
import { CarryableMeshes } from './CarryableMeshes';
import { CursorFx } from './CursorFx';
import { EnemyMeshes } from './EnemyMeshes';
import { GameLoop } from './GameLoop';
import { Terrain } from './Terrain';
import { WorkerInstances } from './WorkerInstances';

/**
 * Owns one day's simulation and renders it. Remount (change `key`) to start a new day.
 * Turning shadows on or off rebuilds the 3D scene but keeps the simulation.
 */
export function GameCanvas({ level }: { level: LevelDefinition }) {
  const [sim, setSim] = useState<Simulation | null>(null);
  const [input] = useState(() => new InputController());

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
      <color attach="background" args={['#1b2a22']} />
      <ambientLight intensity={1.1} />
      <directionalLight
        position={[20, 40, 15]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <Terrain level={level} />
      {sim && (
        <>
          <GameLoop sim={sim} input={input} />
          <CameraRig sim={sim} input={input} />
          <CaptainMesh sim={sim} />
          <WorkerInstances sim={sim} />
          <CarryableMeshes sim={sim} />
          <EnemyMeshes sim={sim} />
          <CursorFx sim={sim} />
        </>
      )}
    </Canvas>
  );
}
