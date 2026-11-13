import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
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

interface ScatterMeshProps {
  spots: Placement[];
  palette: readonly Color[];
  y: number;
  shadow?: boolean;
  children: React.ReactNode;
}

function ScatterMesh({ spots, palette, y, shadow = false, children }: ScatterMeshProps) {
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
      args={[undefined, undefined, spots.length]}
      castShadow={shadow}
      frustumCulled={false}
    >
      {children}
    </instancedMesh>
  );
}

/** Purely decorative ground cover and a tree line, placed from the lesson's seed. */
export function Scenery({ level }: { level: LevelDefinition }) {
  const { grass, blooms, pebbles, trees } = useMemo(() => {
    const rng = new Rng(level.seed * 977 + 13);
    const area = level.width * level.depth;
    return {
      grass: scatter(level, rng, Math.min(1400, Math.round(area / 2.2))),
      blooms: scatter(level, rng, Math.round(area / 30)),
      pebbles: scatter(level, rng, Math.round(area / 45)),
      trees: treeLine(level, rng),
    };
  }, [level]);

  return (
    <group>
      <ScatterMesh spots={grass} palette={GRASS} y={0.2}>
        <coneGeometry args={[0.1, 0.42, 4]} />
        <meshStandardMaterial roughness={1} />
      </ScatterMesh>
      <ScatterMesh spots={blooms} palette={BLOOMS} y={0.14}>
        <sphereGeometry args={[0.1, 6, 5]} />
        <meshStandardMaterial roughness={0.8} />
      </ScatterMesh>
      <ScatterMesh spots={pebbles} palette={[new Color('#8a8f98'), new Color('#b3b7bd')]} y={0.08}>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial roughness={1} flatShading />
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
    </group>
  );
}
