import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group, Object3D } from 'three';
import type { Entity } from '../core/ecs';
import { useGameStore } from '../core/gameStore';
import type { Carryable } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';
import { relicFor, type Relic } from '../story/relics';
import { RelicModel } from './models/RelicModel';
import { TextSprite } from './TextSprite';

const RUNES = ['#7fe3ff', '#ff8af0', '#b6ff6a', '#ffd257'];

/** A stable colour for a twin rune, so both halves of a pair match. */
function runeColor(rune: string): string {
  let hash = 0;
  for (const char of rune) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return RUNES[hash % RUNES.length];
}

/** The haul itself, by kind: shard, Dewglass, Lodestone, Glowcap, pod, Sapdrop, Span-log or carcass. */
function HaulBody({ carryable, relic }: { carryable: Carryable; relic: Relic }) {
  const { radius, kind, variant } = carryable;
  if (kind === 'treasure') {
    return (
      <>
        <RelicModel relic={relic} r={radius} cracked={carryable.cracked} />
        {carryable.cracked && (
          // Hairline cracks across a damaged fragile relic.
          <mesh scale={1.04}>
            <icosahedronGeometry args={[radius * 1.05, 1]} />
            <meshBasicMaterial color="#2a3a44" wireframe transparent opacity={0.5} />
          </mesh>
        )}
        {variant === 'lodestone' &&
          // A Lodestone's pull, shown as glowing rings turning round it.
          [0, 1, 2].map((i) => (
            <mesh key={i} rotation={[i * 1.1, i * 2.1, 0]} scale={[1.25, 0.04, 1.25]}>
              <sphereGeometry args={[radius, 16, 6]} />
              <meshStandardMaterial color="#ffc24a" emissive="#ff8a1a" emissiveIntensity={0.8} />
            </mesh>
          ))}
      </>
    );
  }
  if (kind === 'bloom') {
    return (
      <>
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
      </>
    );
  }
  if (kind === 'pod') {
    // An Emberpod: a seed case of glowing segments in a cup of green sepals, with a curled tip.
    return (
      <group>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[
              Math.sin((i / 5) * Math.PI * 2) * radius * 0.28,
              0,
              Math.cos((i / 5) * Math.PI * 2) * radius * 0.28,
            ]}
            scale={[0.55, 1.25, 0.55]}
            castShadow
          >
            <sphereGeometry args={[radius, 12, 10]} />
            <meshStandardMaterial
              color="#ff8a3d"
              emissive="#ff5a1a"
              emissiveIntensity={0.9}
              roughness={0.4}
            />
          </mesh>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={`s${i}`}
            position={[
              Math.sin((i / 5) * Math.PI * 2 + 0.6) * radius * 0.6,
              -radius * 0.75,
              Math.cos((i / 5) * Math.PI * 2 + 0.6) * radius * 0.6,
            ]}
            rotation={[
              Math.cos((i / 5) * Math.PI * 2 + 0.6) * 0.9,
              0,
              -Math.sin((i / 5) * Math.PI * 2 + 0.6) * 0.9,
            ]}
            scale={[0.5, 0.15, 1]}
          >
            <sphereGeometry args={[radius * 0.7, 8, 6]} />
            <meshStandardMaterial color="#4f8a3c" roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[0, radius * 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[radius * 0.18, radius * 0.06, 6, 12, Math.PI * 1.5]} />
          <meshStandardMaterial color="#5a8a3a" roughness={0.7} />
        </mesh>
      </group>
    );
  }
  if (kind === 'sap') {
    return (
      <>
        <mesh castShadow>
          <sphereGeometry args={[radius, 16, 12]} />
          <meshPhysicalMaterial
            color="#ffb02e"
            emissive="#ff7a00"
            emissiveIntensity={0.8}
            roughness={0.1}
            clearcoat={1}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[0, radius * 1.1, 0]}>
          <coneGeometry args={[radius * 0.62, radius * 1, 16]} />
          <meshPhysicalMaterial
            color="#ffb02e"
            emissive="#ff7a00"
            emissiveIntensity={0.8}
            roughness={0.1}
            clearcoat={1}
            transparent
            opacity={0.85}
          />
        </mesh>
      </>
    );
  }
  if (kind === 'log') {
    return (
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[radius * 0.55, radius * 0.6, radius * 3.2, 12]} />
          <meshStandardMaterial color="#6b4a2e" roughness={0.95} />
        </mesh>
        {[-1, 1].map((end) => (
          <mesh
            key={end}
            position={[0, end * radius * 1.61, 0]}
            rotation={[end > 0 ? 0 : Math.PI, 0, 0]}
          >
            <circleGeometry args={[radius * 0.55, 12]} />
            <meshStandardMaterial color="#c9a46a" roughness={0.9} />
          </mesh>
        ))}
      </group>
    );
  }
  // A carcass lies on its back, feet in the air.
  return (
    <>
      <mesh scale={[1, 0.55, 1.2]} castShadow>
        <sphereGeometry args={[radius, 16, 12]} />
        <meshStandardMaterial color="#6d6a58" roughness={1} />
      </mesh>
      {[-1, 1].flatMap((side) =>
        [-1, 1].map((along) => (
          <mesh
            key={`${side}:${along}`}
            position={[side * radius * 0.45, radius * 0.55, along * radius * 0.5]}
          >
            <capsuleGeometry args={[radius * 0.1, radius * 0.35, 3, 6]} />
            <meshStandardMaterial color="#4a463a" roughness={1} />
          </mesh>
        )),
      )}
    </>
  );
}

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
  const relic = useMemo(
    () => relicFor(sim.level.id, carryable.id, carryable.variant),
    [sim, carryable],
  );

  useFrame(({ clock }) => {
    const node = group.current;
    const transform = sim.transforms.get(entity);
    if (!node || !body.current) return;
    node.visible = transform !== undefined;
    if (!transform) return;
    const lifted = carryable.carriers.length >= carryable.weight;
    node.position.set(transform.x, heightAt(sim.level, transform.x, transform.z), transform.z);
    body.current.position.y =
      radius + (lifted ? 0.35 + Math.sin(clock.elapsedTime * 10) * 0.05 : 0);
    if (kind === 'treasure') {
      // Relics turn slowly and bob on their carriers' shoulders; a Lodestone only creeps.
      const turn = carryable.variant === 'lodestone' ? 0.2 : 0.6;
      body.current.rotation.y = clock.elapsedTime * turn + entity;
      body.current.rotation.z = lifted
        ? Math.sin(clock.elapsedTime * 5.5 + entity * 1.7) * 0.06
        : 0;
    }
    if (kind === 'sap') body.current.position.y += Math.sin(clock.elapsedTime * 3) * 0.08;
  });

  return (
    <group ref={group}>
      {carryable.twin && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius + 0.35, radius + 0.55, 6]} />
          <meshBasicMaterial
            color={runeColor(carryable.twin)}
            transparent
            opacity={0.8}
            toneMapped={false}
          />
        </mesh>
      )}
      <group ref={body}>
        <HaulBody carryable={carryable} relic={relic} />
      </group>
      {showCount && (
        <TextSprite
          y={radius * 2 + 1.3}
          getText={() => `${carryable.carriers.length}/${carryable.weight}`}
        />
      )}
    </group>
  );
}

/** One model per haul, each labelled with carriers held / carriers needed; twins stand on a matching rune. */
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
