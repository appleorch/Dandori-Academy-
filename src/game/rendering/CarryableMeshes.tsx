import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three';
import type { Entity } from '../core/ecs';
import { useGameStore } from '../core/gameStore';
import type { Carryable } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { TextSprite } from './TextSprite';

interface CarryableMeshProps {
  sim: Simulation;
  entity: Entity;
  carryable: Carryable;
}

function CarryableMesh({ sim, entity, carryable }: CarryableMeshProps) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const { radius, kind } = carryable;

  useFrame(({ clock }) => {
    const node = group.current;
    const transform = sim.transforms.get(entity);
    if (!node || !body.current) return;
    node.visible = transform !== undefined;
    if (!transform) return;
    const lifted = carryable.carriers.length >= carryable.weight;
    node.position.set(transform.x, 0, transform.z);
    body.current.position.y =
      radius + (lifted ? 0.35 + Math.sin(clock.elapsedTime * 10) * 0.05 : 0);
    if (kind === 'treasure') body.current.rotation.y = clock.elapsedTime * 0.8;
  });

  return (
    <group ref={group}>
      {kind === 'treasure' ? (
        <mesh ref={body} castShadow>
          <octahedronGeometry args={[radius * 1.15]} />
          <meshStandardMaterial
            color="#ffd257"
            emissive="#ff9d1a"
            emissiveIntensity={0.6}
            metalness={0.4}
            roughness={0.3}
            flatShading
          />
        </mesh>
      ) : (
        <mesh ref={body} scale={[1, 0.55, 1]} castShadow>
          <sphereGeometry args={[radius, 16, 12]} />
          <meshStandardMaterial color="#6d6a58" roughness={1} />
        </mesh>
      )}
      <TextSprite
        y={radius * 2 + 1.3}
        getText={() => `${carryable.carriers.length}/${carryable.weight}`}
      />
    </group>
  );
}

/** One mesh per Sunshard and carcass, each labelled with carriers held / carriers needed. */
export function CarryableMeshes({ sim }: { sim: Simulation }) {
  useGameStore((state) => state.entityVersion);
  return (
    <>
      {[...sim.carryables.entries()].map(([entity, carryable]) => (
        <CarryableMesh key={entity} sim={sim} entity={entity} carryable={carryable} />
      ))}
    </>
  );
}
