import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { Simulation } from '../simulation/Simulation';

/** The Warden. Blinks while invulnerable after a hit. */
export function CaptainMesh({ sim }: { sim: Simulation }) {
  const group = useRef<Group>(null);
  const stride = useRef(0);

  useFrame(() => {
    const node = group.current;
    if (!node) return;
    const { x, z, facing } = sim.captainTransform;
    // Walking shows as a bob and a forward lean, driven by distance covered.
    const moved = Math.hypot(x - node.position.x, z - node.position.z);
    stride.current += Math.min(moved, 0.5) * 2.4;
    const walking = moved > 0.01;
    node.position.set(x, walking ? Math.abs(Math.sin(stride.current)) * 0.14 : 0, z);
    node.rotation.set(walking ? 0.12 : 0, facing, 0, 'YXZ');
    node.visible = Math.floor(sim.captainState.invuln * 12) % 2 === 0;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <capsuleGeometry args={[0.38, 0.5, 6, 14]} />
        <meshStandardMaterial color="#2f6f8f" />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial color="#f2d3b1" />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <coneGeometry args={[0.62, 0.38, 20]} />
        <meshStandardMaterial color="#e8c15a" />
      </mesh>
      <mesh position={[0.42, 0.8, 0.3]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#fff2b0" emissive="#ffd257" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}
