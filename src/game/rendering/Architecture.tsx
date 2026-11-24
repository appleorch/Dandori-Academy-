import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  type InstancedMesh,
  type Texture,
} from 'three';
import { Rng } from '../core/rng';
import type { LevelDefinition, Plateau, Ramp, Wall, WallLook } from '../world/levelTypes';
import { gameTextures, turfTextures, type Painted } from './textures';
import { themeOf } from './theme';

/**
 * The built world: ruined brick walls, the raised terraces of the Curriculum courses with
 * their cliff faces, the stone stairways up to them, low parapets, and chevrons on every
 * one-way ledge. Walls are drawn from many small instanced blocks, so a big course costs
 * a handful of draw calls however long its walls are.
 */

const SEGMENT = 1.6;
const BRICK_HEIGHT = 2.6;
const PARAPET_HEIGHT = 0.9;
const STEP = 0.55;
const dummy = new Object3D();

/**
 * How a wall is drawn: its own look, the field's look for walls, or, when neither says, long thin
 * walls are ruins and the rest rock.
 */
export function wallLook(level: LevelDefinition, wall: Wall): WallLook {
  if (wall.look) return wall.look;
  if (level.wallLook) return level.wallLook;
  if (level.theme === 'cave') return 'rock';
  const long = Math.max(wall.w, wall.d);
  const thin = Math.min(wall.w, wall.d);
  return long >= 6 && long / thin >= 3 ? 'ruin' : 'rock';
}

interface Block {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  turn: number;
}

/**
 * Breaks a wall into short blocks of uneven height, so its top is broken and stepped like
 * old masonry, with a few fallen bricks at its foot and moss on some of the tops.
 */
function ruinBlocks(wall: Wall, height: number, rng: Rng) {
  const along = wall.w >= wall.d ? 'x' : 'z';
  const length = Math.max(wall.w, wall.d);
  const thick = Math.min(wall.w, wall.d);
  const count = Math.max(1, Math.round(length / SEGMENT));
  const piece = length / count;
  const blocks: Block[] = [];
  const caps: Block[] = [];
  const rubble: Block[] = [];
  for (let i = 0; i < count; i++) {
    const offset = -length / 2 + piece * (i + 0.5);
    // Mostly whole, now and then crumbled to half height.
    const h = height * (rng.next() < 0.2 ? rng.range(0.45, 0.7) : rng.range(0.82, 1.05));
    const x = along === 'x' ? wall.x + offset : wall.x;
    const z = along === 'x' ? wall.z : wall.z + offset;
    const w = along === 'x' ? piece + 0.02 : thick;
    const d = along === 'x' ? thick : piece + 0.02;
    blocks.push({ x, y: h / 2, z, w, h, d, turn: 0 });
    if (rng.next() < 0.4) {
      // A cushion of moss on part of the top, not all of it.
      const share = rng.range(0.4, 0.75);
      const shift = (rng.next() - 0.5) * piece * (1 - share);
      caps.push({
        x: x + (along === 'x' ? shift : 0),
        y: h + 0.05,
        z: z + (along === 'x' ? 0 : shift),
        w: along === 'x' ? piece * share : thick * 1.1,
        h: 0.12,
        d: along === 'x' ? thick * 1.1 : piece * share,
        turn: 0,
      });
    }
    if (rng.next() < 0.25) {
      const side = rng.next() < 0.5 ? -1 : 1;
      const out = thick / 2 + rng.range(0.3, 0.9);
      rubble.push({
        x: x + (along === 'z' ? side * out : rng.range(-0.4, 0.4)),
        y: 0.15,
        z: z + (along === 'x' ? side * out : rng.range(-0.4, 0.4)),
        w: rng.range(0.35, 0.6),
        h: 0.28,
        d: rng.range(0.25, 0.4),
        turn: rng.range(0, Math.PI),
      });
    }
  }
  return { blocks, caps, rubble };
}

/** Stairs up a ramp: a run of stone steps, each a little higher than the last. */
function rampSteps(ramp: Ramp): Block[] {
  const run = ramp.dx !== 0 ? ramp.w : ramp.d;
  const count = Math.max(2, Math.ceil(run / STEP));
  const tread = run / count;
  const base = ramp.base ?? 0;
  const steps: Block[] = [];
  for (let i = 0; i < count; i++) {
    const top = base + ((ramp.height - base) * (i + 1)) / count;
    // Position along the rise, starting at the foot.
    const t = -run / 2 + tread * (i + 0.5);
    const x = ramp.dx !== 0 ? ramp.x + t * ramp.dx : ramp.x;
    const z = ramp.dz !== 0 ? ramp.z + t * ramp.dz : ramp.z;
    steps.push({
      x,
      y: top / 2,
      z,
      w: ramp.dx !== 0 ? tread + 0.02 : ramp.w,
      h: top,
      d: ramp.dz !== 0 ? tread + 0.02 : ramp.d,
      turn: 0,
    });
  }
  return steps;
}

function BlockInstances({
  blocks,
  material,
  shadows = true,
}: {
  blocks: readonly Block[];
  material: MeshStandardMaterial;
  shadows?: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    blocks.forEach((block, i) => {
      dummy.position.set(block.x, block.y, block.z);
      dummy.rotation.set(0, block.turn, 0);
      dummy.scale.set(block.w, block.h, block.d);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
    });
    node.count = blocks.length;
    node.instanceMatrix.needsUpdate = true;
    node.computeBoundingSphere();
  }, [blocks]);
  if (blocks.length === 0) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, blocks.length]}
      castShadow={shadows}
      receiveShadow
    />
  );
}

/** A texture repeated `u` by `v` times, for a surface of a given size. */
function tiled(texture: Texture, u: number, v: number): Texture {
  const copy = texture.clone();
  copy.wrapS = copy.wrapT = RepeatWrapping;
  copy.repeat.set(u, v);
  copy.needsUpdate = true;
  return copy;
}

/** A raised terrace: a block with cliff faces, a sunlit turf top, and stone coping round its edge. */
function PlateauBlock({
  plateau,
  turf,
  cliff,
  coping,
}: {
  plateau: Plateau;
  turf: Painted;
  cliff: Painted;
  coping: string;
}) {
  const materials = useMemo(() => {
    const side = (length: number) =>
      new MeshStandardMaterial({
        map: tiled(cliff.color, length / 6, plateau.height / 3),
        bumpMap: tiled(cliff.bump, length / 6, plateau.height / 3),
        bumpScale: 3,
        roughness: 0.95,
      });
    const top = new MeshStandardMaterial({
      map: tiled(turf.color, plateau.w / 7, plateau.d / 7),
      bumpMap: tiled(turf.bump, plateau.w / 7, plateau.d / 7),
      bumpScale: 1.5,
      // A shade lighter and warmer than the ground below: the terraces catch more sun.
      color: '#f4ffd8',
      roughness: 0.95,
    });
    // Box faces: +x, -x, +y, -y, +z, -z.
    return [side(plateau.d), side(plateau.d), top, top, side(plateau.w), side(plateau.w)];
  }, [plateau, turf, cliff]);
  return (
    <group position={[plateau.x, 0, plateau.z]}>
      <mesh position={[0, plateau.height / 2, 0]} material={materials} castShadow receiveShadow>
        <boxGeometry args={[plateau.w, plateau.height, plateau.d]} />
      </mesh>
      {/* Stone coping round the top edge: it marks the terrace out clearly from above. */}
      {[
        [0, -plateau.d / 2 + 0.3, plateau.w, 0.6],
        [0, plateau.d / 2 - 0.3, plateau.w, 0.6],
        [-plateau.w / 2 + 0.3, 0, 0.6, plateau.d],
        [plateau.w / 2 - 0.3, 0, 0.6, plateau.d],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, plateau.height + 0.1, z]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.24, d]} />
          <meshStandardMaterial color={coping} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Painted arrows on a ledge pointing over the edge: the way is down, and only down. */
function LedgeMarks({ level }: { level: LevelDefinition }) {
  const marks = useMemo(() => {
    const out: { x: number; z: number; y: number; angle: number }[] = [];
    for (const ledge of level.ledges ?? []) {
      const across = ledge.dx !== 0 ? ledge.d : ledge.w;
      const count = Math.max(1, Math.floor(across / 1.6));
      const plateau = (level.plateaus ?? []).find(
        (p) =>
          Math.abs(ledge.x - p.x) <= p.w / 2 + 0.01 && Math.abs(ledge.z - p.z) <= p.d / 2 + 0.01,
      );
      for (let i = 0; i < count; i++) {
        const t = -across / 2 + (across / count) * (i + 0.5);
        out.push({
          x: ledge.x + (ledge.dx !== 0 ? 0 : t),
          z: ledge.z + (ledge.dz !== 0 ? 0 : t),
          y: (plateau?.height ?? 0) + 0.04,
          angle: Math.atan2(ledge.dx, ledge.dz),
        });
      }
    }
    return out;
  }, [level]);
  return (
    <>
      {marks.map((mark, i) => (
        <mesh
          key={i}
          position={[mark.x, mark.y, mark.z]}
          rotation={[-Math.PI / 2, 0, mark.angle + Math.PI]}
        >
          <circleGeometry args={[0.45, 3]} />
          <meshBasicMaterial color="#ffe08a" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/** Everything built rather than grown: ruins, terraces, stairs, parapets and ledge marks. */
export function Architecture({ level }: { level: LevelDefinition }) {
  const textures = gameTextures();
  const look = themeOf(level.theme);
  const turf = turfTextures(look.turf);
  const built = useMemo(() => {
    const rng = new Rng(level.seed * 131 + 7);
    const bricks: Block[] = [];
    const moss: Block[] = [];
    const rubble: Block[] = [];
    const steps: Block[] = [];
    for (const wall of level.obstacles) {
      const kind = wallLook(level, wall);
      if (kind === 'ruin' || kind === 'parapet') {
        const parts = ruinBlocks(wall, kind === 'ruin' ? BRICK_HEIGHT : PARAPET_HEIGHT, rng);
        bricks.push(...parts.blocks);
        moss.push(...parts.caps);
        rubble.push(...parts.rubble);
      }
    }
    for (const ramp of level.ramps ?? []) steps.push(...rampSteps(ramp));
    return { bricks, moss, rubble, steps };
  }, [level]);

  const materials = useMemo(
    () => ({
      brick: new MeshStandardMaterial({
        map: textures.brick.color,
        bumpMap: textures.brick.bump,
        bumpScale: 2,
        color: look.rock,
        roughness: 0.92,
      }),
      moss: new MeshStandardMaterial({ map: turf.color, color: '#e4f4c4', roughness: 1 }),
      stone: new MeshStandardMaterial({
        map: textures.stone.color,
        bumpMap: textures.stone.bump,
        bumpScale: 2,
        color: look.rock,
        roughness: 0.95,
      }),
    }),
    [textures, turf, look],
  );

  return (
    <group>
      <BlockInstances blocks={built.bricks} material={materials.brick} />
      <BlockInstances blocks={built.moss} material={materials.moss} shadows={false} />
      <BlockInstances blocks={built.rubble} material={materials.stone} />
      <BlockInstances blocks={built.steps} material={materials.stone} />
      {(level.plateaus ?? []).map((plateau, i) => (
        <PlateauBlock
          key={i}
          plateau={plateau}
          turf={turf}
          cliff={textures.cliff}
          coping="#e4d8bc"
        />
      ))}
      <LedgeMarks level={level} />
    </group>
  );
}
