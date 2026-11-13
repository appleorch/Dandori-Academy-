import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import type { Entity } from '../core/ecs';
import { useGameStore } from '../core/gameStore';
import type { Hazard } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';

interface HazardMeshProps {
  sim: Simulation;
  entity: Entity;
  hazard: Hazard;
}

/** A glob in the air, and on the ground the circle it is about to flatten. */
function HazardMesh({ sim, entity, hazard }: HazardMeshProps) {
  const glob = useRef<Mesh>(null);
  const fill = useRef<Mesh>(null);

  useFrame(() => {
    const at = sim.transforms.get(entity);
    if (!glob.current || !fill.current) return;
    glob.current.visible = at !== undefined;
    if (at) glob.current.position.set(at.x, at.y, at.z);
    fill.current.scale.setScalar(Math.min(1, hazard.time / hazard.duration) * hazard.radius);
  });

  return (
    <>
      <mesh ref={glob} castShadow>
        <sphereGeometry args={[0.45, 12, 10]} />
        <meshStandardMaterial color="#7d9c38" emissive="#3d5a12" emissiveIntensity={0.8} />
      </mesh>
      <group position={[hazard.toX, 0.07, hazard.toZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[hazard.radius - 0.12, hazard.radius, 40]} />
          <meshBasicMaterial color="#ff5a3c" transparent opacity={0.9} depthTest={false} />
        </mesh>
        <mesh ref={fill}>
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial color="#ff5a3c" transparent opacity={0.3} depthTest={false} />
        </mesh>
      </group>
    </>
  );
}

export function HazardMeshes({ sim }: { sim: Simulation }) {
  useGameStore((state) => state.entityVersion);
  return (
    <>
      {[...sim.hazards.entries()].map(([entity, hazard]) => (
        <HazardMesh key={entity} sim={sim} entity={entity} hazard={hazard} />
      ))}
    </>
  );
}
