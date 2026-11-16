import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, MeshStandardMaterial, Object3D, type InstancedMesh, type Material } from 'three';
import { Rng } from '../core/rng';
import type { LevelDefinition } from '../world/level';

interface Placement {
  x: number;
  z: number;
  scale: number;
  turn: number;
  shade: number;
}

const GRASS = [new Color('#4f8a3c'), new Color('#7fb04f')];
const BLOOMS = [new Color('#fff2b0'), new Color('#ff9ec4'), new Color('#bfe3ff')];
const LEAVES = [new Color('#2f5d34'), new Color('#4a8040')];
const dummy = new Object3D();
const tint = new Color();

function onClearGround(level: LevelDefinition, x: number, z: number): boolean {
  if (Math.hypot(x - level.kiln.x, z - level.kiln.z) < 3) return false;
  return !level.obstacles.some(
    (box) => Math.abs(x - box.x) < box.w / 2 + 0.3 && Math.abs(z - box.z) < box.d / 2 + 0.3,
  );
}

function scatter(level: LevelDefinition, rng: Rng, count: number): Placement[] {
  const spots: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const x = rng.range(-level.width / 2 + 0.5, level.width / 2 - 0.5);
    const z = rng.range(-level.depth / 2 + 0.5, level.depth / 2 - 0.5);
    if (!onClearGround(level, x, z)) continue;
    spots.push({ x, z, scale: rng.range(0.6, 1.4), turn: rng.range(0, 6.28), shade: rng.next() });
  }
  return spots;
}

/** A ring of trees just outside the playable field, so the arena has an edge. */
function treeLine(level: LevelDefinition, rng: Rng): Placement[] {
  const trees: Placement[] = [];
  const hw = level.width / 2;
  const hd = level.depth / 2;
  const place = (x: number, z: number): void => {
    trees.push({
      x: x + rng.range(-1, 1),
      z: z + rng.range(-1, 1),
      scale: rng.range(0.8, 1.5),
      turn: 0,
      shade: rng.next(),
    });
  };
  for (let x = -hw - 3; x <= hw + 3; x += 3.2) {
    place(x, -hd - rng.range(2, 5));
    place(x, hd + rng.range(2, 5));
  }
  for (let z = -hd; z <= hd; z += 3.2) {
    place(-hw - rng.range(2, 5), z);
    place(hw + rng.range(2, 5), z);
  }
  return trees;
}

/**
 * Grass material whose blades sway in the wind: the vertex shader bends each blade
 * by its height, with a phase taken from the blade's world position.
 */
function windyMaterial(): { material: MeshStandardMaterial; time: { value: number } } {
  const time = { value: 0 };
  const material = new MeshStandardMaterial({ roughness: 1 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 bladeRoot = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float bend = max(0.0, position.y + 0.2) * 0.35;
        float gust = sin(uWindTime * 1.6 + bladeRoot.x * 0.4 + bladeRoot.z * 0.25)
          + 0.4 * sin(uWindTime * 3.7 + bladeRoot.z * 0.9);
        transformed.x += gust * bend;
        transformed.z += gust * bend * 0.4;`,
      );
  };
  return { material, time };
}

/** Spots near the field's edge and around boulders, where big plants grow out of the way. */
function margins(level: LevelDefinition, rng: Rng, count: number): Placement[] {
  const spots: Placement[] = [];
  const hw = level.width / 2;
  const hd = level.depth / 2;
  for (let tries = 0; spots.length < count && tries < count * 20; tries++) {
    let x: number;
    let z: number;
    const box =
      level.obstacles.length > 0 && rng.next() < 0.5
        ? level.obstacles[Math.floor(rng.next() * level.obstacles.length)]
        : null;
    if (box) {
      const side = rng.next() < 0.5 ? -1 : 1;
      x =
        box.x +
        (rng.next() < 0.5
          ? side * (box.w / 2 + rng.range(0.3, 0.9))
          : rng.range(-box.w / 2, box.w / 2));
      z =
        box.z +
        (rng.next() < 0.5
          ? side * (box.d / 2 + rng.range(0.3, 0.9))
          : rng.range(-box.d / 2, box.d / 2));
    } else {
      const edge = rng.next();
      x = edge < 0.5 ? rng.range(-hw, hw) : (edge < 0.75 ? -1 : 1) * (hw - rng.range(0, 2.5));
      z = edge >= 0.5 ? rng.range(-hd, hd) : (edge < 0.25 ? -1 : 1) * (hd - rng.range(0, 2.5));
    }
    if (!onClearGround(level, x, z)) continue;
    spots.push({ x, z, scale: rng.range(0.7, 1.3), turn: rng.range(0, 6.28), shade: rng.next() });
  }
  return spots;
}

/** One oversized clover: three round leaves on a stalk, taller than the Warden. */
function Clover({ spot }: { spot: Placement }) {
  return (
    <group position={[spot.x, 0, spot.z]} rotation={[0, spot.turn, 0]} scale={spot.scale}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.2, 6]} />
        <meshStandardMaterial color="#4f7f36" roughness={0.9} />
      </mesh>
      {[0, 2.09, 4.19].map((angle) => (
        <mesh
          key={angle}
          position={[Math.sin(angle) * 0.6, 2.2, Math.cos(angle) * 0.6]}
          rotation={[-Math.PI / 2 + 0.25, 0, -angle]}
          castShadow
        >
          <circleGeometry args={[0.72, 18]} />
          <meshStandardMaterial color="#5f9a3e" roughness={0.6} side={2} />
        </mesh>
      ))}
    </group>
  );
}

function Mushroom({ spot }: { spot: Placement }) {
  const cap = spot.shade < 0.5 ? '#d9573c' : '#e9d3a8';
  return (
    <group position={[spot.x, 0, spot.z]} scale={spot.scale * 0.8}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.18, 0.9, 10]} />
        <meshStandardMaterial color="#f3ead6" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.55, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={cap} roughness={0.55} />
      </mesh>
    </group>
  );
}

interface ScatterMeshProps {
  spots: Placement[];
  palette: readonly Color[];
  y: number;
  shadow?: boolean;
  material?: Material;
  children: React.ReactNode;
}

function ScatterMesh({ spots, palette, y, shadow = false, material, children }: ScatterMeshProps) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    spots.forEach((spot, i) => {
      dummy.position.set(spot.x, y * spot.scale, spot.z);
      dummy.rotation.set(0, spot.turn, 0);
      dummy.scale.setScalar(spot.scale);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
      const at = spot.shade * (palette.length - 1);
      const low = Math.floor(at);
      const high = Math.min(palette.length - 1, low + 1);
      node.setColorAt(i, tint.lerpColors(palette[low], palette[high], at - low));
    });
    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
  }, [spots, palette, y]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, material, spots.length]}
      castShadow={shadow}
      frustumCulled={false}
    >
      {children}
    </instancedMesh>
  );
}

/**
 * Purely decorative ground cover, placed from the lesson's seed: wind-blown grass,
 * flowers, pebbles, oversized clover and mushrooms, dewdrops and a tree line.
 */
export function Scenery({ level }: { level: LevelDefinition }) {
  const { grass, blooms, pebbles, trees, clovers, mushrooms, drops } = useMemo(() => {
    const rng = new Rng(level.seed * 977 + 13);
    const area = level.width * level.depth;
    return {
      grass: scatter(level, rng, Math.min(5000, Math.round(area * 1.6))),
      blooms: scatter(level, rng, Math.round(area / 30)),
      pebbles: scatter(level, rng, Math.round(area / 45)),
      trees: treeLine(level, rng),
      clovers: margins(level, rng, Math.round(area / 90)),
      mushrooms: margins(level, rng, Math.round(area / 220)),
      drops: margins(level, rng, Math.round(area / 160)),
    };
  }, [level]);
  const wind = useMemo(windyMaterial, []);
  useFrame(({ clock }) => {
    wind.time.value = clock.elapsedTime;
  });

  return (
    <group>
      <ScatterMesh spots={grass} palette={GRASS} y={0.2} material={wind.material}>
        <coneGeometry args={[0.07, 0.5, 3]} />
      </ScatterMesh>
      <ScatterMesh spots={blooms} palette={BLOOMS} y={0.14}>
        <sphereGeometry args={[0.1, 6, 5]} />
        <meshStandardMaterial roughness={0.8} />
      </ScatterMesh>
      <ScatterMesh spots={pebbles} palette={[new Color('#8a8f98'), new Color('#b3b7bd')]} y={0.08}>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial roughness={1} flatShading />
      </ScatterMesh>
      <ScatterMesh spots={drops} palette={[new Color('#e8f6ff'), new Color('#ffffff')]} y={0.22}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.55}
          roughness={0.04}
          clearcoat={1}
          envMapIntensity={2.2}
          depthWrite={false}
        />
      </ScatterMesh>
      <ScatterMesh
        spots={trees}
        palette={[new Color('#4a3524'), new Color('#5b4636')]}
        y={1.2}
        shadow
      >
        <cylinderGeometry args={[0.28, 0.4, 2.4, 7]} />
        <meshStandardMaterial roughness={1} />
      </ScatterMesh>
      <ScatterMesh spots={trees} palette={LEAVES} y={3.4} shadow>
        <icosahedronGeometry args={[1.8, 1]} />
        <meshStandardMaterial roughness={1} flatShading />
      </ScatterMesh>
      {clovers.map((spot, i) => (
        <Clover key={i} spot={spot} />
      ))}
      {mushrooms.map((spot, i) => (
        <Mushroom key={i} spot={spot} />
      ))}
    </group>
  );
}
