import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import type { Simulation } from '../simulation/Simulation';

/** Ground markers for the command cursor and the whistle's growing call circle. */
export function CursorFx({ sim }: { sim: Simulation }) {
  const cursor = useRef<Mesh>(null);
  const whistle = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!cursor.current || !whistle.current) return;
    const { x, z } = sim.cursor;
    cursor.current.position.set(x, 0.05, z);
    cursor.current.rotation.z = clock.elapsedTime * 2;
    const radius = sim.captainState.whistleRadius;
    whistle.current.visible = radius > 0;
    whistle.current.position.set(x, 0.06, z);
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
