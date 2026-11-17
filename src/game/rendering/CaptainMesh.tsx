import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { useGameStore } from '../core/gameStore';
import { wornOutfit } from '../progression/outfits';
import type { Simulation } from '../simulation/Simulation';

/** The Warden, in the outfit the player chose. Blinks while invulnerable after a hit. */
export function CaptainMesh({ sim }: { sim: Simulation }) {
  const group = useRef<Group>(null);
  const stride = useRef(0);
  const look = useGameStore((state) => wornOutfit(state.save, state.settings.outfit));

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
      {/* Suit */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <capsuleGeometry args={[0.36, 0.45, 8, 18]} />
        <meshStandardMaterial color={look.suit} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <torusGeometry args={[0.37, 0.06, 8, 24]} />
        <meshStandardMaterial color={look.trim} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Pack with a lamp */}
      <mesh position={[0, 0.78, -0.36]} castShadow>
        <boxGeometry args={[0.46, 0.5, 0.24]} />
        <meshStandardMaterial color="#6b4a2e" roughness={0.8} />
      </mesh>
      <mesh position={[0.18, 1.12, -0.38]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} />
      </mesh>
      <mesh position={[0.18, 1.4, -0.38]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshBasicMaterial color={look.lamp} toneMapped={false} />
      </mesh>
      {/* Head and glass dome */}
      <mesh position={[0, 1.36, 0]} castShadow>
        <sphereGeometry args={[0.27, 20, 16]} />
        <meshStandardMaterial color="#f2d3b1" roughness={0.6} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.09, 1.39, 0.24]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color="#1c1410" />
        </mesh>
      ))}
      <mesh position={[0, 1.38, 0]}>
        <sphereGeometry args={[0.38, 28, 20]} />
        <meshPhysicalMaterial
          color="#dff4ff"
          transparent
          opacity={0.22}
          roughness={0.05}
          clearcoat={1}
          envMapIntensity={2}
          depthWrite={false}
        />
      </mesh>
      {/* Wide-brimmed hat */}
      <mesh position={[0, 1.78, 0]} castShadow>
        <coneGeometry args={[0.66, 0.36, 28]} />
        <meshStandardMaterial color={look.hat} roughness={0.7} />
      </mesh>
      {/* Hand lantern */}
      <mesh position={[0.44, 0.78, 0.26]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshBasicMaterial color={look.lamp} toneMapped={false} />
      </mesh>
      <pointLight
        position={[0.44, 0.9, 0.3]}
        color={look.lamp}
        intensity={3}
        distance={5}
        decay={2}
      />
    </group>
  );
}
