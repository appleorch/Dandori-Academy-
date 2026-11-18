import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh, MeshBasicMaterial } from 'three';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';
import { SPROUTS } from '../workers/sprouts';

/** Ground markers for the command cursor (red where a throw would land a non-wader in water) and the whistle's growing call circle. */
export function CursorFx({ sim }: { sim: Simulation }) {
  const cursor = useRef<Mesh>(null);
  const whistle = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!cursor.current || !whistle.current) return;
    const { x, z } = sim.cursor;
    const ground = heightAt(sim.level, x, z);
    cursor.current.position.set(x, ground + 0.05, z);
    cursor.current.rotation.z = clock.elapsedTime * 2;
    // Red over water when the kind about to be thrown would flounder there.
    const unsafe = sim.inWater(x, z) && !SPROUTS[sim.selected].wades;
    (cursor.current.material as MeshBasicMaterial).color.set(unsafe ? '#ff4a3a' : '#fff6dc');
    const radius = sim.captainState.whistleRadius;
    whistle.current.visible = radius > 0;
    whistle.current.position.set(x, ground + 0.06, z);
    whistle.current.scale.setScalar(radius);
  });

  return (
    <>
      <mesh ref={cursor} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.6, 6]} />
        <meshBasicMaterial color="#fff6dc" transparent opacity={0.9} depthTest={false} />
      </mesh>
      <mesh ref={whistle} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1, 48]} />
        <meshBasicMaterial color="#7fe3ff" transparent opacity={0.85} depthTest={false} />
      </mesh>
    </>
  );
}
