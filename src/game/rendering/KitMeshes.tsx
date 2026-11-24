import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
} from 'three';
import type { LevelDefinition } from '../world/levelTypes';
import { wallLook } from './Architecture';
import { KIT_LOOKS, propPieces, wallPieces, type Finish, type Piece, type Shape } from './kit';

/** A pot's profile, base at 0 and rim at 1: tapered sides and a rolled rim. */
function potGeometry(): BufferGeometry {
  const profile = [
    [0, 0],
    [0.36, 0],
    [0.38, 0.04],
    [0.44, 0.8],
    [0.5, 0.82],
    [0.52, 0.9],
    [0.5, 1],
    [0.44, 1],
    [0.42, 0.9],
  ].map(([x, y]) => new Vector2(x, y));
  return new LatheGeometry(profile, 24);
}

/** A teacup's profile: a round bowl on a little foot, open at the top. */
function cupGeometry(): BufferGeometry {
  const profile = [
    [0, 0],
    [0.22, 0],
    [0.24, 0.06],
    [0.2, 0.1],
    [0.36, 0.3],
    [0.46, 0.6],
    [0.5, 1],
    [0.46, 1],
    [0.42, 0.62],
  ].map(([x, y]) => new Vector2(x, y));
  return new LatheGeometry(profile, 24);
}

/** One unit-sized geometry per shape, shared by every kit mesh. */
const GEOMETRIES: Record<Shape, () => BufferGeometry> = {
  box: () => new BoxGeometry(1, 1, 1),
  cylinder: () => new CylinderGeometry(0.5, 0.5, 1, 18),
  sphere: () => new SphereGeometry(0.5, 16, 12),
  ico: () => new IcosahedronGeometry(0.5, 1),
  cone: () => new ConeGeometry(0.5, 1, 12),
  pot: potGeometry,
  cup: cupGeometry,
  torus: () => new TorusGeometry(0.5, 0.08, 8, 24),
  capsule: () => new CapsuleGeometry(0.5, 1, 4, 10),
};

function material(finish: Finish): Material {
  switch (finish) {
    case 'metal':
      return new MeshStandardMaterial({ metalness: 0.6, roughness: 0.38 });
    case 'glass':
      return new MeshPhysicalMaterial({
        transparent: true,
        opacity: 0.32,
        roughness: 0.05,
        clearcoat: 1,
        depthWrite: false,
      });
    case 'glow':
      return new MeshBasicMaterial({ toneMapped: false });
    default:
      return new MeshStandardMaterial({ roughness: 0.85 });
  }
}

interface Batch {
  shape: Shape;
  finish: Finish;
  pieces: Piece[];
}

const dummy = new Object3D();
dummy.rotation.order = 'YXZ';
const tint = new Color();

/** One shape in one finish: every piece of it in the field, as a single instanced mesh. */
function KitBatch({ batch }: { batch: Batch }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => GEOMETRIES[batch.shape](), [batch.shape]);
  const surface = useMemo(() => material(batch.finish), [batch.finish]);
  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    batch.pieces.forEach((piece, i) => {
      dummy.position.set(piece.x, piece.y, piece.z);
      // Turned about the vertical last, so a piece's own tilt stays relative to its wall or prop.
      dummy.rotation.set(piece.rx ?? 0, piece.ry ?? 0, piece.rz ?? 0);
      dummy.scale.set(piece.sx, piece.sy, piece.sz);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
      node.setColorAt(i, tint.set(piece.color));
    });
    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
    node.computeBoundingSphere();
  }, [batch]);
  useLayoutEffect(
    () => () => {
      geometry.dispose();
      surface.dispose();
    },
    [geometry, surface],
  );
  const solid = batch.finish !== 'glass' && batch.finish !== 'glow';
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, surface, batch.pieces.length]}
      castShadow={solid}
      receiveShadow={solid}
    />
  );
}

/** Every piece of a field's kit walls and props, grouped by shape and finish. */
export function kitBatches(level: LevelDefinition): Batch[] {
  const pieces: Piece[] = [];
  for (const wall of level.obstacles) {
    const look = wallLook(level, wall);
    if (KIT_LOOKS.includes(look)) pieces.push(...wallPieces(wall, look));
  }
  for (const prop of level.props ?? []) pieces.push(...propPieces(prop));
  const batches = new Map<string, Batch>();
  for (const piece of pieces) {
    const finish = piece.finish ?? 'matte';
    const key = `${piece.shape}|${finish}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { shape: piece.shape, finish, pieces: [] };
      batches.set(key, batch);
    }
    batch.pieces.push(piece);
  }
  return [...batches.values()];
}

/**
 * The miniature-world kit in a field: walls drawn as giant everyday objects and the props that
 * dress the field (see kit.ts and docs-design/ART_DIRECTION.md).
 */
export function KitMeshes({ level }: { level: LevelDefinition }) {
  const batches = useMemo(() => kitBatches(level), [level]);
  return (
    <group>
      {batches.map((batch) => (
        <KitBatch key={`${batch.shape}|${batch.finish}`} batch={batch} />
      ))}
    </group>
  );
}
