import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

/** The second Warden, standing where they were left, in a blue coat and a broad hat. */
export function OtherWarden({ sim }: { sim: Simulation }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const node = group.current;
    if (!node) return;
    const at = sim.otherWarden;
    node.visible = at !== null;
    if (!at) return;
    node.position.set(at.x, heightAt(sim.level, at.x, at.z), at.z);
    node.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.4;
  });
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.55, 4, 12]} />
        <meshStandardMaterial color="#2f5a8a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.24, 14, 10]} />
        <meshStandardMaterial color="#e8c0a0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.36, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.08, 18]} />
        <meshStandardMaterial color="#2a3a5a" roughness={0.8} />
      </mesh>
    </group>
  );
}
