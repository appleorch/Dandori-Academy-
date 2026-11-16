import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import type { LevelDefinition } from '../world/level';
import { rockGeometry } from './rocks';
import { gameTextures } from './textures';

const ROCK_HEIGHT = 2.3;
/** World units covered by one repeat of the grass texture. */
const GRASS_TILE = 7;
const LEG_ANGLES = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

/**
 * The Kiln: a clay furnace on three legs with a glowing mouth and a smoking
 * chimney. Hauls are delivered to the glowing ring beneath it.
 */
function KilnMesh({ x, z }: { x: number; z: number }) {
  const { clay } = gameTextures();
  const glow = useRef<MeshStandardMaterial>(null);
  const smoke = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (glow.current)
      glow.current.emissiveIntensity = 1.6 + Math.sin(t * 3.1) * 0.25 + Math.sin(t * 7.7) * 0.15;
    smoke.current?.children.forEach((puff, i) => {
      const life = (t * 0.35 + i / 4) % 1;
      puff.position.set(Math.sin(t + i) * 0.2 * life, 4.3 + life * 3, life * 0.5);
      puff.scale.setScalar(0.25 + life * 0.7);
      ((puff as Mesh).material as MeshStandardMaterial).opacity = 0.45 * (1 - life);
    });
  });

  return (
    <group position={[x, 0, z]}>
      {LEG_ANGLES.map((angle) => (
        <mesh
          key={angle}
          position={[Math.sin(angle) * 1.5, 1.1, Math.cos(angle) * 1.5]}
          rotation={[Math.cos(angle) * 0.25, 0, -Math.sin(angle) * 0.25]}
          castShadow
        >
          <cylinderGeometry args={[0.13, 0.2, 2.3, 10]} />
          <meshStandardMaterial color="#5b4636" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1.55, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={clay.color} bumpMap={clay.bump} bumpScale={2} roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.95, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.38, 0.8, 16]} />
        <meshStandardMaterial map={clay.color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <cylinderGeometry args={[1.55, 1.2, 0.3, 32]} />
        <meshStandardMaterial
          ref={glow}
          color="#ffb347"
          emissive="#ff7a1a"
          emissiveIntensity={1.6}
        />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.25, 1.55, 48]} />
        <meshBasicMaterial color="#ffc06a" transparent opacity={0.75} toneMapped={false} />
      </mesh>
      <group ref={smoke}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#d8d0c4" transparent opacity={0.4} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 1.6, 0]} color="#ff9a3c" intensity={14} distance={10} decay={1.6} />
    </group>
  );
}

/** Static level geometry: textured lawn, the Kiln's clearing, boulders and the Kiln. */
export function Terrain({ level }: { level: LevelDefinition }) {
  const { grass, stone, soil } = gameTextures();
  const rocks = useMemo(
    () => level.obstacles.map((box) => ({ box, geometry: rockGeometry(box, ROCK_HEIGHT) })),
    [level],
  );
  const [fieldMap, outerMap, fieldBump] = useMemo(() => {
    const field = grass.color.clone();
    field.repeat.set(level.width / GRASS_TILE, level.depth / GRASS_TILE);
    const bump = grass.bump.clone();
    bump.repeat.copy(field.repeat);
    const outer = grass.color.clone();
    outer.repeat.set((level.width + 240) / GRASS_TILE, (level.depth + 240) / GRASS_TILE);
    for (const texture of [field, bump, outer]) texture.needsUpdate = true;
    return [field, outer, bump];
  }, [grass, level]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[level.width + 240, level.depth + 240]} />
        <meshStandardMaterial map={outerMap} color="#7d9a6a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[level.width, level.depth]} />
        <meshStandardMaterial map={fieldMap} bumpMap={fieldBump} bumpScale={1.5} roughness={0.95} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[level.kiln.x, 0.01, level.kiln.z]}
        receiveShadow
      >
        <circleGeometry args={[3.6, 48]} />
        <meshStandardMaterial
          map={soil.color}
          bumpMap={soil.bump}
          roughness={1}
          transparent
          opacity={0.92}
        />
      </mesh>
      {rocks.map(({ box, geometry }) => (
        <mesh
          key={`${box.x}:${box.z}`}
          geometry={geometry}
          position={[box.x, ROCK_HEIGHT / 2, box.z]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            map={stone.color}
            bumpMap={stone.bump}
            bumpScale={3}
            vertexColors
            roughness={0.92}
          />
        </mesh>
      ))}
      <KilnMesh x={level.kiln.x} z={level.kiln.z} />
    </group>
  );
}
