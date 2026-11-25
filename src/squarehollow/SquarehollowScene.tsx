import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Fog,
  Group,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type DirectionalLight,
  type HemisphereLight,
  type LineSegments,
  type Points,
  type PointsMaterial,
  type Sprite,
} from 'three';
import { atlasTexture } from './atlas';
import { BLOCKS, linearRgb } from './blocks';
import { blockMaterials, ChunkMeshes } from './chunks';
import { LOCAL_COLOURS, type Local } from './locals';
import { buildBlock } from './mesher';
import { EYE_HEIGHT } from './physics';
import type { Session } from './session';
import { SEA_LEVEL, WATER_TOP } from './world';

interface SceneProps {
  session: Session;
  lite: boolean;
}

const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** The island's blocks, the sea round it, and the sea floor under that. */
function Island({ session, lite }: SceneProps) {
  const { world } = session;
  const atlas = useMemo(() => atlasTexture(), []);
  const materials = useMemo(() => blockMaterials(atlas), [atlas]);
  const chunks = useMemo(
    () => new ChunkMeshes(world, materials, { x: world.spawn.x, z: world.spawn.z }),
    [world, materials],
  );
  // The chunks round the door are there before the first frame.
  useMemo(() => chunks.buildWaiting(9), [chunks]);
  useEffect(
    () => () => {
      chunks.dispose();
      for (const material of Object.values(materials)) material.dispose();
      atlas.dispose();
    },
    [chunks, materials, atlas],
  );

  useFrame(() => {
    for (const cell of session.changed) chunks.touch(cell.x, cell.z);
    session.changed.length = 0;
    chunks.flush();
    if (!chunks.complete) chunks.buildWaiting(lite ? 2 : 3);
  });

  // Open water and sea floor beyond the island's edge, in four strips round it.
  const strips = useMemo(() => {
    const size = world.width;
    const far = 420;
    return [
      { x: size / 2, z: -far / 2, w: size + far * 2, d: far },
      { x: size / 2, z: size + far / 2, w: size + far * 2, d: far },
      { x: -far / 2, z: size / 2, w: far, d: size },
      { x: size + far / 2, z: size / 2, w: far, d: size },
    ];
  }, [world]);

  return (
    <>
      <primitive object={chunks.group} />
      {strips.map((strip, i) => (
        <group key={i} position={[strip.x, 0, strip.z]}>
          <mesh
            position={[0, SEA_LEVEL + WATER_TOP, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={2}
          >
            <planeGeometry args={[strip.w, strip.d]} />
            <meshLambertMaterial
              color={BLOCKS[10].top}
              transparent
              opacity={0.74}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
          <mesh position={[0, 12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[strip.w, strip.d]} />
            <meshLambertMaterial color="#b9a676" />
          </mesh>
        </group>
      ))}
    </>
  );
}

const SKY_DAY = new Color('#9ccbee');
const SKY_NIGHT = new Color('#0c1328');
const SKY_SUNSET = new Color('#f0a06c');
const WATER_FOG = new Color('#1f4f86');
const SUN_DAY = new Color('#fff3dc');
const SUN_LOW = new Color('#ffb070');
/** The light that fills the shadows at night: moonlight. */
const MOONLIGHT = new Color('#52628f');

/** A soft round glow drawn on a canvas, for the sun and the moon. */
function discTexture(core: string, halo: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ink = canvas.getContext('2d');
  if (ink) {
    const glow = ink.createRadialGradient(64, 64, 10, 64, 64, 64);
    glow.addColorStop(0, core);
    glow.addColorStop(0.32, core);
    glow.addColorStop(0.4, halo);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ink.fillStyle = glow;
    ink.fillRect(0, 0, 128, 128);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Sky, sun, moon, stars and clouds, and the light they give, all following the clock. */
function Sky({ session, lite }: SceneProps) {
  const { scene, camera } = useThree();
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const sunSprite = useRef<Sprite>(null);
  const moonSprite = useRef<Sprite>(null);
  const stars = useRef<Points>(null);
  const clouds = useRef<InstancedMesh>(null);
  const textures = useMemo(
    () => ({
      sun: discTexture('rgba(255, 248, 225, 1)', 'rgba(255, 214, 150, 0.35)'),
      moon: discTexture('rgba(226, 232, 255, 1)', 'rgba(170, 190, 255, 0.18)'),
    }),
    [],
  );
  const fog = useMemo(() => new Fog('#9ccbee', 40, 120), []);
  const sky = useMemo(() => new Color(), []);
  const starGeometry = useMemo(() => {
    const points = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      points.set([Math.cos(a) * r * 190, Math.abs(u) * 190, Math.sin(a) * r * 190], i * 3);
    }
    const made = new BufferGeometry();
    made.setAttribute('position', new BufferAttribute(points, 3));
    return made;
  }, []);
  const cloudCount = lite ? 14 : 34;
  const cloudSeeds = useMemo(
    () =>
      Array.from({ length: cloudCount }, () => ({
        x: Math.random() * 520 - 180,
        z: Math.random() * 520 - 180,
        y: 58 + Math.random() * 4,
        w: 8 + Math.random() * 16,
        d: 6 + Math.random() * 12,
      })),
    [cloudCount],
  );
  const matrix = useMemo(() => new Matrix4(), []);
  const holder = useMemo(() => new Object3D(), []);
  const direction = useMemo(() => new Vector3(), []);

  useEffect(() => {
    scene.fog = fog;
    scene.background = sky;
    return () => {
      scene.fog = null;
      scene.background = null;
      textures.sun.dispose();
      textures.moon.dispose();
      starGeometry.dispose();
    };
  }, [scene, fog, sky, textures, starGeometry]);

  useFrame(() => {
    const angle = (session.time - 0.25) * Math.PI * 2;
    const height = Math.sin(angle);
    const day = MathUtils.smoothstep(height, -0.12, 0.28);
    const glow = Math.max(0, 1 - Math.abs(height) / 0.32) * (height > -0.25 ? 1 : 0);
    sky
      .copy(SKY_NIGHT)
      .lerp(SKY_DAY, day)
      .lerp(SKY_SUNSET, glow * 0.55);

    const reach = lite ? 0.72 : 1;
    if (session.eyeUnderWater) {
      fog.color.copy(WATER_FOG).multiplyScalar(0.35 + day * 0.65);
      fog.near = 0.5;
      fog.far = 14;
    } else {
      fog.color.copy(sky);
      fog.near = 38 * reach;
      fog.far = 118 * reach;
    }
    scene.background = session.eyeUnderWater ? fog.color : sky;

    // The sun goes round the island east to west, tipped a little to the south.
    direction.set(Math.cos(angle), height, 0.35).normalize();
    if (sun.current) {
      sun.current.position.copy(direction).multiplyScalar(100);
      sun.current.intensity = day * 2.2;
      sun.current.color.copy(SUN_LOW).lerp(SUN_DAY, MathUtils.smoothstep(height, 0, 0.45));
    }
    if (hemi.current) {
      hemi.current.intensity = 1.1 + day * 1.9;
      hemi.current.color.copy(MOONLIGHT).lerp(sky, day);
    }
    if (sunSprite.current) {
      sunSprite.current.position.copy(camera.position).addScaledVector(direction, 170);
      sunSprite.current.visible = height > -0.15;
    }
    if (moonSprite.current) {
      moonSprite.current.position.copy(camera.position).addScaledVector(direction, -170);
      moonSprite.current.visible = height < 0.15;
    }
    if (stars.current) {
      stars.current.position.copy(camera.position);
      stars.current.rotation.z = angle * 0.5;
      (stars.current.material as PointsMaterial).opacity = (1 - day) * 0.85;
      stars.current.visible = day < 0.95;
    }
    const mesh = clouds.current;
    if (mesh) {
      const drift = session.clock * 1.1;
      cloudSeeds.forEach((cloud, i) => {
        holder.position.set(((cloud.x + drift + 180) % 520) - 180, cloud.y, cloud.z);
        holder.scale.set(cloud.w, 1.4, cloud.d);
        holder.updateMatrix();
        matrix.copy(holder.matrix);
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      (mesh.material as MeshBasicMaterial).color.setScalar(0.3 + day * 0.68);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#9ccbee', '#8a7a5e', 2]} />
      <directionalLight ref={sun} intensity={2} />
      <sprite ref={sunSprite} scale={[30, 30, 1]}>
        <spriteMaterial map={textures.sun} fog={false} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={moonSprite} scale={[18, 18, 1]}>
        <spriteMaterial map={textures.moon} fog={false} depthWrite={false} toneMapped={false} />
      </sprite>
      <points ref={stars} geometry={starGeometry}>
        <pointsMaterial
          color="#ffffff"
          size={1.6}
          sizeAttenuation={false}
          transparent
          fog={false}
          depthWrite={false}
        />
      </points>
      <instancedMesh ref={clouds} args={[undefined, undefined, cloudCount]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.82} />
      </instancedMesh>
    </>
  );
}

/** Through the door frame there is nothing at all, from either side. */
function DoorVoid({ session }: { session: Session }) {
  const { door } = session.world;
  const shimmer = useRef<MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (shimmer.current) shimmer.current.opacity = 0.05 + Math.sin(clock.elapsedTime * 1.3) * 0.03;
  });
  return (
    <group position={[door.x + 0.5, door.y + 1, door.z + 0.5]}>
      <mesh>
        <planeGeometry args={[1, 2]} />
        <meshBasicMaterial color="#000000" side={DoubleSide} fog={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.96, 1.96]} />
        <meshBasicMaterial
          ref={shimmer}
          color="#6a78c8"
          transparent
          opacity={0.06}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
          fog={false}
        />
      </mesh>
    </group>
  );
}

const LOCAL_BODY = new BoxGeometry(0.48, 0.5, 0.48);
const LOCAL_EYE = new BoxGeometry(0.09, 0.11, 0.02);
const LOCAL_STALK = new BoxGeometry(0.05, 0.22, 0.05);
const LOCAL_CROWN = new BoxGeometry(0.16, 0.16, 0.16);
const EYE_MATERIAL = new MeshBasicMaterial({ color: '#1c1410' });
const STALK_MATERIAL = new MeshLambertMaterial({ color: '#4f8a3c' });

/** One of the locals: a squared-off Sproutling with a glowing crown on its stalk. */
function LocalView({ local }: { local: Local }) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const colours = LOCAL_COLOURS[local.kind];
  const materials = useMemo(
    () => ({
      body: new MeshLambertMaterial({ color: colours.body }),
      crown: new MeshBasicMaterial({ color: colours.crown, toneMapped: false }),
    }),
    [colours],
  );
  useEffect(
    () => () => {
      materials.body.dispose();
      materials.crown.dispose();
    },
    [materials],
  );
  const phase = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const node = root.current;
    const model = body.current;
    if (!node || !model) return;
    const { x, y, z } = local.body;
    node.position.set(x, y, z);
    node.rotation.y = local.yaw;
    const t = clock.elapsedTime + phase;
    const walking = Math.hypot(local.body.vx, local.body.vz) > 0.3;
    const squash = local.poked < 0.35 ? 1 - Math.sin((local.poked / 0.35) * Math.PI) * 0.3 : 1;
    model.scale.set(2 - squash, squash, 2 - squash);
    model.position.y = walking ? Math.abs(Math.sin(t * 10)) * 0.06 : Math.sin(t * 2) * 0.01;
    model.rotation.z = walking ? Math.sin(t * 10) * 0.08 : 0;
  });
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh geometry={LOCAL_BODY} material={materials.body} position={[0, 0.25, 0]} />
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={LOCAL_EYE}
            material={EYE_MATERIAL}
            position={[side * 0.1, 0.33, -0.245]}
          />
        ))}
        <mesh geometry={LOCAL_STALK} material={STALK_MATERIAL} position={[0, 0.6, 0]} />
        <mesh
          geometry={LOCAL_CROWN}
          material={materials.crown}
          position={[0, 0.74, 0]}
          rotation={[0.6, 0.78, 0]}
        />
      </group>
    </group>
  );
}

const CRUMB_COUNT = 72;
const CRUMBS_PER_DIG = 9;

interface Crumb {
  life: number;
  position: Vector3;
  velocity: Vector3;
}

/** Bits of block that fly out of a dug cell and bounce away. */
function Crumbs({ session }: { session: Session }) {
  const mesh = useRef<InstancedMesh>(null);
  const pool = useMemo<Crumb[]>(
    () =>
      Array.from({ length: CRUMB_COUNT }, () => ({
        life: 0,
        position: new Vector3(),
        velocity: new Vector3(),
      })),
    [],
  );
  const next = useRef(0);
  const holder = useMemo(() => new Object3D(), []);
  const colour = useMemo(() => new Color(), []);

  useFrame((_, delta) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const dt = Math.min(delta, 0.05);
    for (const burst of session.crumbs) {
      const [r, g, b] = linearRgb(BLOCKS[burst.id].side);
      for (let i = 0; i < CRUMBS_PER_DIG; i++) {
        const k = next.current;
        next.current = (k + 1) % CRUMB_COUNT;
        const crumb = pool[k];
        crumb.life = 0.5 + Math.random() * 0.35;
        crumb.position.set(
          burst.x + 0.2 + Math.random() * 0.6,
          burst.y + 0.2 + Math.random() * 0.6,
          burst.z + 0.2 + Math.random() * 0.6,
        );
        crumb.velocity.set(
          (Math.random() - 0.5) * 4,
          2 + Math.random() * 3,
          (Math.random() - 0.5) * 4,
        );
        const shade = 0.75 + Math.random() * 0.3;
        instanced.setColorAt(k, colour.setRGB(r * shade, g * shade, b * shade));
      }
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    }
    session.crumbs.length = 0;
    pool.forEach((crumb, i) => {
      crumb.life -= dt;
      if (crumb.life > 0) {
        crumb.velocity.y -= 18 * dt;
        crumb.position.addScaledVector(crumb.velocity, dt);
      }
      holder.position.copy(crumb.position);
      holder.scale.setScalar(crumb.life > 0 ? Math.min(1, crumb.life * 4) * 0.13 : 0);
      holder.updateMatrix();
      instanced.setMatrixAt(i, holder.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CRUMB_COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshLambertMaterial color="#ffffff" />
    </instancedMesh>
  );
}

/** The block in the Warden's hand, low on the right, swinging with every dig and build. */
function HeldBlock({ session, id }: { session: Session; id: number }) {
  const { camera } = useThree();
  const holder = useRef<Group>(null);
  const atlas = useMemo(() => atlasTexture(), []);
  const geometry = useMemo(() => {
    const data = buildBlock(id);
    const made = new BufferGeometry();
    made.setAttribute('position', new BufferAttribute(data.positions, 3));
    made.setAttribute('normal', new BufferAttribute(data.normals, 3));
    made.setAttribute('color', new BufferAttribute(data.colors, 3));
    made.setAttribute('uv', new BufferAttribute(data.uvs, 2));
    made.setIndex(new BufferAttribute(data.indices, 1));
    return made;
  }, [id]);
  const material = useMemo(() => {
    const glow = BLOCKS[id].layer === 'glow';
    // Always drawn on top of the world; only glass lets anything show through it.
    const common = {
      map: atlas,
      vertexColors: true,
      depthTest: false,
      transparent: BLOCKS[id].layer === 'glass',
    };
    return glow
      ? new MeshBasicMaterial({ ...common, toneMapped: false })
      : new MeshLambertMaterial(common);
  }, [id, atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => atlas.dispose(), [atlas]);
  const tilt = useMemo(() => new Quaternion(), []);
  const axis = useMemo(() => new Vector3(1, 0, 0), []);
  const shown = useRef(0);

  useFrame((_, delta) => {
    const node = holder.current;
    if (!node) return;
    // A new block comes up from below.
    shown.current = Math.min(1, shown.current + delta * 5);
    node.position.copy(camera.position);
    node.quaternion.copy(camera.quaternion);
    const lens = camera as PerspectiveCamera;
    const halfHeight = Math.tan(MathUtils.degToRad(lens.fov) / 2);
    const halfWidth = halfHeight * lens.aspect;
    const swing = session.swing < 0.22 ? Math.sin((session.swing / 0.22) * Math.PI) : 0;
    const bob = Math.sin((session.stride / 2.2) * Math.PI * 2);
    node.translateZ(-0.9 - swing * 0.12);
    node.translateX(Math.min(0.66, halfWidth * 0.9 * 0.66) + bob * 0.012);
    node.translateY(
      -halfHeight * 0.8 * 0.55 -
        (1 - ease(shown.current)) * 0.4 -
        swing * 0.06 +
        Math.abs(bob) * 0.012,
    );
    tilt.setFromAxisAngle(axis, -swing * 0.7);
    node.quaternion.multiply(tilt);
    node.rotateY(0.72);
    node.rotateX(0.16);
  });

  useEffect(() => {
    shown.current = 0;
  }, [id]);

  return (
    <group ref={holder}>
      <mesh geometry={geometry} material={material} scale={0.22} renderOrder={20} />
    </group>
  );
}

/** The twelve edges of a cell, a hair larger than it: the outline round the block in reach. */
const OUTLINE = (() => {
  const edges = new BufferGeometry();
  const positions: number[] = [];
  const corners = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 1],
    [0, 0, 1],
    [0, 1, 0],
    [1, 1, 0],
    [1, 1, 1],
    [0, 1, 1],
  ].map((c) => c.map((v) => v * 1.004 - 0.502));
  const pairs = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  for (const [a, b] of pairs) positions.push(...corners[a], ...corners[b]);
  edges.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  return edges;
})();

/**
 * Runs the visit a frame at a time: the session moves the Warden and the locals, and the camera
 * follows the Warden's eye (out of the door on arrival), with the block in reach outlined.
 */
function Driver({ session }: { session: Session }) {
  const { camera } = useThree();
  const outline = useRef<LineSegments>(null);
  const from = useMemo(() => {
    const { door } = session.world;
    return new Vector3(door.x + 0.5, door.y + EYE_HEIGHT, door.z + 0.5);
  }, [session]);
  const eye = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    session.update(dt);
    const [x, y, z] = session.eye();
    const bob =
      session.body.onGround && Math.hypot(session.body.vx, session.body.vz) > 0.5
        ? Math.abs(Math.sin((session.stride / 2.2) * Math.PI * 2)) * 0.05
        : 0;
    eye.set(x, y + bob, z);
    if (session.arrival < 1) {
      const t = ease(session.arrival);
      camera.position.lerpVectors(from, eye, t);
      camera.position.y += Math.abs(Math.sin(t * Math.PI * 2)) * 0.05;
    } else {
      camera.position.copy(eye);
    }
    camera.rotation.set(session.pitch, session.yaw, 0, 'YXZ');
    const lens = camera as PerspectiveCamera;
    const sprinting =
      session.keys.has('ShiftLeft') && !session.body.flying && session.body.onGround;
    const fov = lens.userData.baseFov ?? lens.fov;
    lens.userData.baseFov = fov;
    const wanted = fov + (sprinting && Math.hypot(session.body.vx, session.body.vz) > 5 ? 6 : 0);
    if (Math.abs(lens.fov - wanted) > 0.05) {
      lens.fov += (wanted - lens.fov) * Math.min(1, dt * 8);
      lens.updateProjectionMatrix();
    }

    const line = outline.current;
    if (line) {
      const target = session.active && !session.targetLocal ? session.target : null;
      line.visible = target !== null;
      if (target) line.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
    }
  });

  return (
    <lineSegments ref={outline} geometry={OUTLINE} visible={false}>
      <lineBasicMaterial color="#1c1410" transparent opacity={0.6} />
    </lineSegments>
  );
}

/** Keeps the lens wide enough on tall phone screens. */
function Lens() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const fov = aspect < 1 ? 82 : 72;
    camera.fov = fov;
    camera.userData.baseFov = fov;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/** Everything in Squarehollow. */
export function SquarehollowScene({ session, lite, held }: SceneProps & { held: number }) {
  return (
    <>
      <Lens />
      <Sky session={session} lite={lite} />
      <Island session={session} lite={lite} />
      <DoorVoid session={session} />
      {session.locals.map((local, i) => (
        <LocalView key={i} local={local} />
      ))}
      <Crumbs session={session} />
      <Driver session={session} />
      <HeldBlock session={session} id={held} />
    </>
  );
}
