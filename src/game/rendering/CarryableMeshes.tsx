import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Object3D } from 'three';
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
  const body = useRef<Object3D>(null);
  const { radius, kind } = carryable;
  const showCount = useGameStore((state) => state.settings.carrierCounts);

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
          <meshPhysicalMaterial
            color="#ffc24a"
            emissive="#ff8a1a"
            emissiveIntensity={0.75}
            metalness={0.2}
            roughness={0.15}
            clearcoat={1}
            envMapIntensity={1.6}
            flatShading
          />
        </mesh>
      ) : kind === 'bloom' ? (
        <group ref={body}>
          <mesh position={[0, -radius * 0.2, 0]}>
            <cylinderGeometry args={[radius * 0.25, radius * 0.35, radius * 1.2, 10]} />
            <meshStandardMaterial color="#e8f4ec" roughness={0.6} />
          </mesh>
          <mesh position={[0, radius * 0.45, 0]}>
            <sphereGeometry args={[radius * 0.95, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#5fe6d2"
              emissive="#2affd0"
              emissiveIntensity={1.3}
              roughness={0.35}
            />
          </mesh>
          <pointLight color="#6affe0" intensity={4} distance={5} decay={2} />
        </group>
      ) : kind === 'pod' ? (
        <mesh ref={body} scale={[1, 1.3, 1]} castShadow>
          <sphereGeometry args={[radius, 14, 10]} />
          <meshStandardMaterial color="#ff8a3d" emissive="#ff5a1a" emissiveIntensity={0.9} />
        </mesh>
      ) : (
        <mesh ref={body} scale={[1, 0.55, 1]} castShadow>
          <sphereGeometry args={[radius, 16, 12]} />
          <meshStandardMaterial color="#6d6a58" roughness={1} />
        </mesh>
      )}
      {showCount && (
        <TextSprite
          y={radius * 2 + 1.3}
          getText={() => `${carryable.carriers.length}/${carryable.weight}`}
        />
      )}
    </group>
  );
}

/** One mesh per Sunshard, Emberpod and carcass, each labelled with carriers held / carriers needed. */
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
