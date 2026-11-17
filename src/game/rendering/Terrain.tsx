import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import type { LevelDefinition } from '../world/level';
import { rockGeometry } from './rocks';
import { gameTextures, turfTextures } from './textures';
import { themeOf } from './theme';

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
  const flames = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (glow.current)
      glow.current.emissiveIntensity = 1.6 + Math.sin(t * 3.1) * 0.25 + Math.sin(t * 7.7) * 0.15;
    flames.current?.children.forEach((flame, i) => {
      const lick = 0.75 + Math.sin(t * (9 + i * 2.3) + i * 1.7) * 0.25;
      flame.scale.set(lick, 0.7 + lick * 0.6, lick);
      flame.rotation.z = Math.sin(t * 5 + i * 2) * 0.15;
    });
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
      <group ref={flames} position={[0, 1.55, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[
              Math.sin(i * 1.26) * 0.55 * (i ? 1 : 0),
              0,
              Math.cos(i * 1.26) * 0.55 * (i ? 1 : 0),
            ]}
          >
            <coneGeometry args={[i ? 0.24 : 0.36, i ? 0.9 : 1.2, 7]} />
            <meshBasicMaterial color={i % 2 ? '#ffb347' : '#ff7a1a'} toneMapped={false} />
          </mesh>
        ))}
      </group>
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
  const { stone, soil } = gameTextures();
  const look = themeOf(level.theme);
  const ROCK_HEIGHT = look.rockHeight;
  const floor = look.stoneFloor ? stone : turfTextures(look.turf);
  const rocks = useMemo(
    () => level.obstacles.map((box) => ({ box, geometry: rockGeometry(box, ROCK_HEIGHT) })),
    [level, ROCK_HEIGHT],
  );
  const [fieldMap, outerMap, fieldBump] = useMemo(() => {
    const field = floor.color.clone();
    field.repeat.set(level.width / GRASS_TILE, level.depth / GRASS_TILE);
    const bump = floor.bump.clone();
    bump.repeat.copy(field.repeat);
    const outer = floor.color.clone();
    outer.repeat.set((level.width + 240) / GRASS_TILE, (level.depth + 240) / GRASS_TILE);
    for (const texture of [field, bump, outer]) texture.needsUpdate = true;
    return [field, outer, bump];
  }, [floor, level]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[level.width + 240, level.depth + 240]} />
        <meshStandardMaterial map={outerMap} color={look.outer} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[level.width, level.depth]} />
        <meshStandardMaterial
          map={fieldMap}
          bumpMap={fieldBump}
          bumpScale={look.stoneFloor ? 2.5 : 1.5}
          color={look.ground}
          roughness={0.95}
        />
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
            color={look.rock}
            roughness={0.92}
          />
        </mesh>
      ))}
      <KilnMesh x={level.kiln.x} z={level.kiln.z} />
    </group>
  );
}
