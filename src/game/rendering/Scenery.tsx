import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector4,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
} from 'three';
import { Rng } from '../core/rng';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';
import type { LevelDefinition } from '../world/level';
import { themeOf, type ThemeLook } from './theme';

/**
 * Everything that grows or lies about but takes no part in the rules: grass that parts
 * round the squad, flowers, pebbles, fallen leaves, clover, mushrooms and crystals, dew,
 * the tree line, and the ruins of the old Academy: broken pillars, arches and half-buried
 * gears. All of it is placed from the lesson's seed, sits on terrace tops where it lands on
 * one, and is drawn with instanced meshes so a big course stays cheap.
 */

interface Placement {
  x: number;
  /** Height of the ground under it. */
  y: number;
  z: number;
  scale: number;
  turn: number;
  shade: number;
}

/** A part of a multi-part prop, relative to the prop's own origin and scale. */
interface Piece {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
}

const dummy = new Object3D();
const child = new Object3D();
const tint = new Color();
/** How many walkers part the grass at once: the Warden and the nearest Emberlings. */
const PUSHERS = 12;

function onClearGround(level: LevelDefinition, x: number, z: number): boolean {
  if (Math.hypot(x - level.kiln.x, z - level.kiln.z) < 3) return false;
  return ![...level.obstacles, ...(level.water ?? []), ...(level.bridges ?? [])].some(
    (box) => Math.abs(x - box.x) < box.w / 2 + 0.3 && Math.abs(z - box.z) < box.d / 2 + 0.3,
  );
}

function spot(
  level: LevelDefinition,
  rng: Rng,
  x: number,
  z: number,
  low = 0.6,
  high = 1.4,
): Placement {
  return {
    x,
    y: heightAt(level, x, z),
    z,
    scale: rng.range(low, high),
    turn: rng.range(0, Math.PI * 2),
    shade: rng.next(),
  };
}

function scatter(level: LevelDefinition, rng: Rng, count: number): Placement[] {
  const spots: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const x = rng.range(-level.width / 2 + 0.5, level.width / 2 - 0.5);
    const z = rng.range(-level.depth / 2 + 0.5, level.depth / 2 - 0.5);
    if (onClearGround(level, x, z)) spots.push(spot(level, rng, x, z));
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
      y: 0,
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

/** Spots near the field's edge and around walls, where big plants and ruins sit out of the way. */
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
    if (onClearGround(level, x, z)) spots.push(spot(level, rng, x, z, 0.7, 1.3));
  }
  return spots;
}

/** How far round a prop of scale 1 the tree ring keeps clear. */
const PROP_CLEARING = 9;

/** The placements that do not stand where one of the field's props does. */
function clearOfProps(level: LevelDefinition, spots: Placement[]): Placement[] {
  const props = level.props ?? [];
  if (props.length === 0) return spots;
  return spots.filter((spot) =>
    props.every(
      (prop) => Math.hypot(spot.x - prop.x, spot.z - prop.z) > PROP_CLEARING * (prop.scale ?? 1),
    ),
  );
}

/** Spots just outside the field, all the way round: for things that frame the arena. */
function perimeter(level: LevelDefinition, spacing: number, out: number): Placement[] {
  const spots: Placement[] = [];
  const hw = level.width / 2 + out;
  const hd = level.depth / 2 + out;
  for (let x = -hw; x <= hw; x += spacing) {
    spots.push({ x, y: 0, z: -hd, scale: 1, turn: 0, shade: 0 });
    spots.push({ x, y: 0, z: hd, scale: 1, turn: Math.PI, shade: 0 });
  }
  for (let z = -hd + spacing; z < hd; z += spacing) {
    spots.push({ x: -hw, y: 0, z, scale: 1, turn: Math.PI / 2, shade: 0 });
    spots.push({ x: hw, y: 0, z, scale: 1, turn: -Math.PI / 2, shade: 0 });
  }
  return spots;
}

/**
 * Grass whose blades sway in the wind and bend away from anyone walking through them. The
 * vertex shader bends each blade by its height: a gust whose phase comes from the blade's
 * world position, plus a push away from each nearby walker.
 */
function grassMaterial(): {
  material: MeshStandardMaterial;
  time: { value: number };
  pushers: { value: Vector4[] };
} {
  const time = { value: 0 };
  const pushers = { value: Array.from({ length: PUSHERS }, () => new Vector4(0, 0, 0, 0)) };
  const material = new MeshStandardMaterial({ roughness: 1 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = time;
    shader.uniforms.uPushers = pushers;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uWindTime;
        uniform vec4 uPushers[${PUSHERS}];`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 bladeRoot = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float bend = max(0.0, position.y + 0.2) * 0.35;
        float gust = sin(uWindTime * 1.6 + bladeRoot.x * 0.4 + bladeRoot.z * 0.25)
          + 0.4 * sin(uWindTime * 3.7 + bladeRoot.z * 0.9);
        transformed.x += gust * bend;
        transformed.z += gust * bend * 0.4;
        // Bend away from walkers. The push is worked out in world space, then turned into
        // the blade's own frame, since every blade is rotated differently.
        vec2 push = vec2(0.0);
        for (int i = 0; i < ${PUSHERS}; i++) {
          vec4 p = uPushers[i];
          if (p.w <= 0.0) continue;
          vec2 away = bladeRoot.xz - p.xy;
          float dist = length(away);
          float strength = (1.0 - smoothstep(0.0, p.z, dist)) * p.w;
          push += (dist > 0.001 ? away / dist : vec2(1.0, 0.0)) * strength;
        }
        vec3 axisX = normalize(instanceMatrix[0].xyz);
        vec3 axisZ = normalize(instanceMatrix[2].xyz);
        float lean = max(0.0, position.y + 0.2) * 1.4;
        transformed.x += dot(push, axisX.xz) * lean;
        transformed.z += dot(push, axisZ.xz) * lean;
        transformed.y -= length(push) * lean * 0.35;`,
      );
  };
  return { material, time, pushers };
}

/**
 * Draws a prop made of several pieces at many spots: one instanced mesh per piece, so the
 * cost is one draw call per piece, not per prop.
 */
function PropPieces({
  spots,
  pieces,
  geometry,
  material,
  palette,
  shadow = false,
}: {
  spots: readonly Placement[];
  pieces: readonly Piece[];
  geometry: BufferGeometry;
  material: Material;
  palette?: readonly Color[];
  shadow?: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const count = spots.length * pieces.length;
  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    let i = 0;
    for (const at of spots) {
      dummy.position.set(at.x, at.y, at.z);
      dummy.rotation.set(0, at.turn, 0);
      dummy.scale.setScalar(at.scale);
      dummy.updateMatrix();
      for (const piece of pieces) {
        child.position.set(piece.x, piece.y, piece.z);
        child.rotation.set(piece.rx, piece.ry, piece.rz);
        child.scale.set(piece.sx, piece.sy, piece.sz);
        child.updateMatrix();
        child.matrix.premultiply(dummy.matrix);
        node.setMatrixAt(i, child.matrix);
        if (palette) {
          const shade = at.shade * (palette.length - 1);
          const low = Math.floor(shade);
          node.setColorAt(
            i,
            tint.lerpColors(
              palette[low],
              palette[Math.min(palette.length - 1, low + 1)],
              shade - low,
            ),
          );
        }
        i++;
      }
    }
    node.count = i;
    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
  }, [spots, pieces, palette]);
  if (count === 0) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, count]}
      castShadow={shadow}
      receiveShadow
      frustumCulled={false}
    />
  );
}

const piece = (p: Partial<Piece>): Piece => ({
  x: 0,
  y: 0,
  z: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  sx: 1,
  sy: 1,
  sz: 1,
  ...p,
});

/** Prop recipes. Units are those of a unit-sized primitive, scaled by each piece. */
const SINGLE = [piece({})];
const CLOVER_STALK = [piece({ y: 1.1, sx: 0.06, sy: 2.2, sz: 0.06 })];
const CLOVER_LEAVES = [0, 2.09, 4.19].map((a) =>
  piece({
    x: Math.sin(a) * 0.6,
    y: 2.2,
    z: Math.cos(a) * 0.6,
    rx: -Math.PI / 2 + 0.25,
    rz: -a,
    sx: 0.72,
    sy: 0.72,
    sz: 0.72,
  }),
);
const MUSHROOM_STEM = [piece({ y: 0.36, sx: 0.15, sy: 0.72, sz: 0.15 })];
const MUSHROOM_CAP = [piece({ y: 0.72, sx: 0.44, sy: 0.44, sz: 0.44 })];
const CRYSTAL = [0, 1, 2].map((i) =>
  piece({
    x: Math.sin(i * 2.1) * 0.3,
    y: 0.45 + (i ? 0 : 0.25),
    z: Math.cos(i * 2.1) * 0.3,
    rx: Math.sin(i * 2.1) * 0.35,
    rz: Math.cos(i * 2.1) * 0.35,
    sx: 0.2,
    sy: i ? 0.95 : 1.5,
    sz: 0.2,
  }),
);
/** A broken column: a base, a drum or two, and a capital toppled at its foot. */
const PILLAR = [
  piece({ y: 0.15, sx: 0.75, sy: 0.3, sz: 0.75 }),
  piece({ y: 0.95, sx: 0.5, sy: 1.3, sz: 0.5 }),
  piece({ y: 1.95, sx: 0.48, sy: 0.7, sz: 0.48, rz: 0.08 }),
  piece({ x: 0.9, y: 0.25, z: 0.3, rx: Math.PI / 2, rz: 0.4, sx: 0.5, sy: 0.5, sz: 0.5 }),
];
/** An arch over nothing: two piers and a curve of stones. Walkable underneath. */
const ARCH_PIERS = [-1, 1].map((side) =>
  piece({ x: side * 1.4, y: 1.4, sx: 0.45, sy: 2.8, sz: 0.45 }),
);
const ARCH_STONES = Array.from({ length: 9 }, (_, i) => {
  const a = (i / 8) * Math.PI;
  return piece({
    x: Math.cos(a) * 1.4,
    y: 2.8 + Math.sin(a) * 1.1,
    rz: a - Math.PI / 2,
    sx: 0.5,
    sy: 0.4,
    sz: 0.5,
  });
});
/** A great brass gear, half sunk in the earth, leaning. */
const GEAR = [piece({ y: 0.55, rx: Math.PI / 2 + 0.3, sx: 1, sy: 1, sz: 1 })];
const LEAF = [piece({ y: 0.02, rx: -Math.PI / 2, sx: 0.22, sy: 0.12, sz: 1 })];
/** A glasshouse rib: an iron column and the curve of the roof springing from it. */
const RIB_POST = [piece({ y: 5, sx: 0.25, sy: 10, sz: 0.25 })];
const RIB_CURVE = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 6) * (Math.PI / 2.2);
  return piece({
    y: 10 + Math.sin(a) * 4,
    z: Math.cos(a) * -4 + 4,
    rx: -a,
    sx: 0.22,
    sy: 0.22,
    sz: 1.3,
  });
});

export function Scenery({ level, sim }: { level: LevelDefinition; sim?: Simulation }) {
  const look: ThemeLook = themeOf(level.theme);
  const cave = look.stoneFloor;
  const glasshouse = level.theme === 'terrarium';
  const placed = useMemo(() => {
    const rng = new Rng(level.seed * 977 + 13);
    const area = level.width * level.depth;
    const ruins = margins(level, rng, cave ? 0 : Math.round(area / 900));
    return {
      grass: scatter(level, rng, Math.round(Math.min(9000, area * 1.6) * look.bladeDensity)),
      flowers: cave ? [] : scatter(level, rng, Math.round(area / 30)),
      pebbles: scatter(level, rng, Math.round(area / (cave ? 25 : 45))),
      leaves: cave
        ? []
        : scatter(level, rng, Math.round(area / (level.theme === 'autumn' ? 8 : 40))),
      // The tree ring makes room for the giant objects dressing the field (see kit.ts).
      trees: look.trees && !glasshouse ? clearOfProps(level, treeLine(level, rng)) : [],
      clovers: cave ? [] : margins(level, rng, Math.round(area / 90)),
      mushrooms: margins(level, rng, Math.round(area / (cave ? 110 : 220))),
      crystals: cave ? margins(level, rng, Math.round(area / 330)) : [],
      drops: cave ? [] : margins(level, rng, Math.round(area / 160)),
      spires: cave ? margins(level, rng, Math.round(area / 70)) : [],
      pillars: ruins.filter((_, i) => i % 3 !== 2),
      arches: ruins.filter((_, i) => i % 3 === 2),
      gears: cave ? [] : margins(level, rng, Math.round(area / (glasshouse ? 700 : 2400))),
      ribs: glasshouse ? perimeter(level, 12, 6) : [],
    };
  }, [level, look, cave, glasshouse]);

  const grass = useMemo(grassMaterial, []);
  const assets = useMemo(() => {
    const palette = (hexes: readonly string[]) => hexes.map((hex) => new Color(hex));
    const standard = (options: ConstructorParameters<typeof MeshStandardMaterial>[0]) =>
      new MeshStandardMaterial(options);
    return {
      blades: palette(look.blades),
      flowers: palette(look.flowers),
      canopy: palette(look.canopy),
      trunk: palette(look.trunk),
      leafColors: palette(
        level.theme === 'autumn'
          ? ['#c8562a', '#e8a03a', '#a83a20']
          : [look.canopy[1], '#c8a050', look.clover],
      ),
      pebbles: palette(cave ? ['#4a4e60', '#6a6e84'] : ['#8a8f98', '#b3b7bd']),
      caps: palette(look.mushroomCaps),
      crystals: palette(['#6ae0ff', '#b08aff']),
      plain: standard({ roughness: 0.9 }),
      flat: standard({ roughness: 1, flatShading: true }),
      leaf: standard({ roughness: 0.8, side: 2 }),
      cloverLeaf: standard({ color: look.clover, roughness: 0.6, side: 2 }),
      cloverStalk: standard({ color: '#4f7f36', roughness: 0.9 }),
      stem: standard({ color: '#f3ead6', roughness: 0.8 }),
      cap: look.glowingMushrooms
        ? new MeshBasicMaterial({ toneMapped: false })
        : standard({ roughness: 0.55 }),
      glow: new MeshBasicMaterial({ toneMapped: false }),
      stone: standard({ color: look.rock, roughness: 0.95 }),
      ruinStone: standard({ color: '#d8ccb4', roughness: 0.92 }),
      brass: standard({ color: '#b08a48', metalness: 0.8, roughness: 0.45 }),
      iron: standard({ color: '#2e3a34', metalness: 0.7, roughness: 0.5 }),
      dew: new MeshPhysicalMaterial({
        transparent: true,
        opacity: 0.55,
        roughness: 0.04,
        clearcoat: 1,
        envMapIntensity: 2.2,
        depthWrite: false,
      }),
    };
  }, [look, level.theme, cave]);
  useFrame(({ clock }) => {
    grass.time.value = clock.elapsedTime;
    if (!sim) return;
    // The Warden, then the Emberlings nearest it, part the grass.
    const slots = grass.pushers.value;
    const { x, z } = sim.captainTransform;
    slots[0].set(x, z, 1.3, 0.8);
    let used = 1;
    for (const [entity, worker] of sim.workers.entries()) {
      if (used >= PUSHERS) break;
      if (worker.state === 'thrown' || worker.state === 'attacking') continue;
      const at = sim.transforms.require(entity);
      if (Math.abs(at.x - x) > 14 || Math.abs(at.z - z) > 14) continue;
      slots[used++].set(at.x, at.z, 0.7, 0.45);
    }
    for (let i = used; i < PUSHERS; i++) slots[i].w = 0;
  });

  return (
    <group>
      <Instanced
        spots={placed.grass}
        pieces={SINGLE}
        palette={assets.blades}
        material={grass.material}
        make="blade"
      />
      <Instanced
        spots={placed.flowers}
        pieces={[piece({ y: 0.14 })]}
        palette={assets.flowers}
        material={assets.plain}
        make="bud"
      />
      <Instanced
        spots={placed.pebbles}
        pieces={[piece({ y: 0.08 })]}
        palette={assets.pebbles}
        material={assets.flat}
        make="pebble"
      />
      <Instanced
        spots={placed.leaves}
        pieces={LEAF}
        palette={assets.leafColors}
        material={assets.leaf}
        make="leaf"
      />
      <Instanced
        spots={placed.drops}
        pieces={[piece({ y: 0.22 })]}
        material={assets.dew}
        make="drop"
      />
      <Instanced
        spots={placed.spires}
        pieces={[piece({ y: 0.8 })]}
        palette={assets.pebbles}
        material={assets.flat}
        make="spire"
        shadow
      />
      <Instanced
        spots={placed.trees}
        pieces={[piece({ y: 1.2 })]}
        palette={assets.trunk}
        material={assets.plain}
        make="trunk"
        shadow
      />
      <Instanced
        spots={placed.trees}
        pieces={[piece({ y: 3.4 })]}
        palette={assets.canopy}
        material={assets.flat}
        make="canopy"
        shadow
      />
      <Instanced
        spots={placed.clovers}
        pieces={CLOVER_STALK}
        material={assets.cloverStalk}
        make="cylinder"
        shadow
      />
      <Instanced
        spots={placed.clovers}
        pieces={CLOVER_LEAVES}
        material={assets.cloverLeaf}
        make="disc"
        shadow
      />
      <Instanced
        spots={placed.mushrooms}
        pieces={MUSHROOM_STEM}
        material={assets.stem}
        make="cylinder"
        shadow
      />
      <Instanced
        spots={placed.mushrooms}
        pieces={MUSHROOM_CAP}
        palette={assets.caps}
        material={assets.cap}
        make="dome"
        shadow
      />
      <Instanced
        spots={placed.crystals}
        pieces={CRYSTAL}
        palette={assets.crystals}
        material={assets.glow}
        make="cone"
      />
      <Instanced
        spots={placed.pillars}
        pieces={PILLAR}
        material={assets.ruinStone}
        make="column"
        shadow
      />
      <Instanced
        spots={placed.arches}
        pieces={ARCH_PIERS}
        material={assets.ruinStone}
        make="box"
        shadow
      />
      <Instanced
        spots={placed.arches}
        pieces={ARCH_STONES}
        material={assets.ruinStone}
        make="box"
        shadow
      />
      <Instanced spots={placed.gears} pieces={GEAR} material={assets.brass} make="gear" shadow />
      <Instanced spots={placed.ribs} pieces={RIB_POST} material={assets.iron} make="box" />
      <Instanced spots={placed.ribs} pieces={RIB_CURVE} material={assets.iron} make="box" />
    </group>
  );
}

type Shape =
  | 'blade'
  | 'bud'
  | 'pebble'
  | 'leaf'
  | 'drop'
  | 'spire'
  | 'trunk'
  | 'canopy'
  | 'cylinder'
  | 'disc'
  | 'dome'
  | 'cone'
  | 'column'
  | 'box'
  | 'gear';

/** One instanced prop piece, with its geometry made once per component. */
function Instanced({
  make,
  ...props
}: {
  make: Shape;
  spots: readonly Placement[];
  pieces: readonly Piece[];
  material: Material;
  palette?: readonly Color[];
  shadow?: boolean;
}) {
  const geometry = useShape(make);
  return <PropPieces {...props} geometry={geometry} />;
}

function useShape(shape: Shape): BufferGeometry {
  return useMemo(() => makeShape(shape), [shape]);
}

function makeShape(shape: Shape): BufferGeometry {
  switch (shape) {
    case 'blade':
      return new ConeGeometry(0.07, 0.5, 3);
    case 'bud':
      return new SphereGeometry(0.1, 6, 5);
    case 'pebble':
      return new DodecahedronGeometry(0.2, 0);
    case 'leaf':
      return new CircleGeometry(1, 6);
    case 'drop':
      return new SphereGeometry(0.24, 16, 12);
    case 'spire':
      return new ConeGeometry(0.38, 1.6, 6);
    case 'trunk':
      return new CylinderGeometry(0.28, 0.4, 2.4, 7);
    case 'canopy':
      return new IcosahedronGeometry(1.8, 1);
    case 'cylinder':
      return new CylinderGeometry(0.8, 1, 1, 8);
    case 'disc':
      return new CircleGeometry(1, 18);
    case 'dome':
      return new SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    case 'cone':
      return new ConeGeometry(1, 1, 5);
    case 'column':
      return new CylinderGeometry(0.9, 1, 1, 10);
    case 'box':
      return new BoxGeometry(1, 1, 1);
    case 'gear':
      return new TorusGeometry(1, 0.22, 6, 14);
  }
}
