import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  DoubleSide,
  RingGeometry,
  type Color,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type Sprite,
} from 'three';
import type { Entity } from '../core/ecs';
import { useGameStore } from '../core/gameStore';
import { PALETTE_SETS } from './palette';
import { HARD } from '../core/difficulty';
import { isShielded } from '../enemies/combat';
import { flightHeight, isDormant, isOpen } from '../enemies/beasts';
import { useOverlayLayer } from './overlay';
import { TextSprite } from './TextSprite';
import { gameTextures } from './textures';
import { ENEMY, ENEMY_SPECS, type EnemyKind } from '../enemies/enemyKinds';
import type { Box } from '../navigation/NavGrid';
import type { Enemy } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import type { GateSpawn } from '../world/levelTypes';
import { heightAt } from '../world/heightMap';

const BAR_WIDTH = 2.2;
/** Seconds a hit makes an enemy glow. */
const HIT_FLASH = 0.15;
/** The hunting radius fades in when the Warden is this close to its edge. */
const AGGRO_HINT = 6;
const ALERT_TEXT = (): string => '!';

/** An arc around the enemy, `fraction` of the way round, used as the shake gauge. */
function gaugeGeometry(radius: number, fraction: number): RingGeometry {
  return new RingGeometry(
    radius - 0.15,
    radius,
    32,
    1,
    Math.PI / 2,
    Math.max(0.01, fraction) * Math.PI * 2,
  );
}
/** Seconds before a shake during which the enemy visibly shudders. */
const SHAKE_WARNING = 0.9;

/** Walking state shared by an enemy's legs: phase advances with distance travelled. */
interface Gait {
  phase: number;
  /** 0 when standing still, 1 at a walk or faster. */
  stride: number;
}

interface LegProps {
  gait: Gait;
  x: number;
  z: number;
  length: number;
  radius: number;
  color: string;
  /** Phase offset, so legs move in a believable order. */
  offset: number;
}

/** A leg that swings from the hip as the creature walks. */
function Leg({ gait, x, z, length, radius, color, offset }: LegProps) {
  const hip = useRef<Group>(null);
  useFrame(() => {
    if (hip.current) hip.current.rotation.x = Math.sin(gait.phase + offset) * 0.55 * gait.stride;
  });
  return (
    <group ref={hip} position={[x, length, z]}>
      <mesh position={[0, -length / 2, 0]} castShadow>
        <capsuleGeometry args={[radius, length - radius * 2, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

interface EyeProps {
  x: number;
  y: number;
  z: number;
  size: number;
  glow?: string;
}

/** A round eye with a dark pupil, looking forward. */
function Eye({ x, y, z, size, glow }: EyeProps) {
  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[size, 12, 10]} />
        <meshStandardMaterial
          color="#fff6dc"
          emissive={glow ?? '#000000'}
          emissiveIntensity={glow ? 0.6 : 0}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0, size * 0.75]}>
        <sphereGeometry args={[size * 0.5, 10, 8]} />
        <meshBasicMaterial color="#1c1410" />
      </mesh>
    </group>
  );
}

const QUAD_LEGS: readonly (readonly [number, number, number])[] = [
  [-1, 0.55, 0],
  [1, 0.55, Math.PI],
  [-1, -0.55, Math.PI],
  [1, -0.55, 0],
];

/** Slow grazer: a mossy, tufted shell over a squat body, with a jaw that gapes before it bites. */
function MossbackBody({ r, gait, jaw }: { r: number; gait: Gait; jaw: React.Ref<Group> }) {
  const { grass } = gameTextures();
  return (
    <>
      {QUAD_LEGS.map(([side, along, offset]) => (
        <Leg
          key={`${side}:${along}`}
          gait={gait}
          x={side * r * 0.55}
          z={along * r}
          length={r * 0.5}
          radius={r * 0.17}
          color="#4a3a26"
          offset={offset}
        />
      ))}
      <mesh position={[0, r * 0.62, 0]} scale={[1, 0.62, 1.15]} castShadow>
        <sphereGeometry args={[r, 24, 16]} />
        <meshStandardMaterial color="#5a4630" roughness={0.9} />
      </mesh>
      <mesh position={[0, r * 0.9, -r * 0.1]} scale={[0.95, 0.62, 1.05]} castShadow>
        <icosahedronGeometry args={[r, 2]} />
        <meshStandardMaterial map={grass.color} color="#7fb04f" roughness={1} flatShading />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const angle = i * 2.4;
        const ring = 0.35 + (i % 3) * 0.15;
        return (
          <mesh
            key={i}
            position={[
              Math.sin(angle) * r * ring,
              r * (1.42 - ring * 0.4),
              Math.cos(angle) * r * ring - r * 0.1,
            ]}
            castShadow
          >
            <coneGeometry args={[r * 0.14, r * 0.38, 5]} />
            <meshStandardMaterial color={i % 2 ? '#4f8a3c' : '#6fa04a'} roughness={1} flatShading />
          </mesh>
        );
      })}
      <group position={[0, r * 0.6, r * 1.0]}>
        <mesh scale={[1, 0.8, 1]} castShadow>
          <sphereGeometry args={[r * 0.45, 16, 12]} />
          <meshStandardMaterial color="#6b5238" roughness={0.85} />
        </mesh>
        <Eye x={-r * 0.24} y={r * 0.2} z={r * 0.3} size={r * 0.12} />
        <Eye x={r * 0.24} y={r * 0.2} z={r * 0.3} size={r * 0.12} />
        <group ref={jaw} position={[0, -r * 0.12, r * 0.15]}>
          <mesh position={[0, -r * 0.05, r * 0.18]} scale={[1, 0.35, 1]}>
            <sphereGeometry args={[r * 0.32, 12, 8]} />
            <meshStandardMaterial color="#5a4030" roughness={0.9} />
          </mesh>
          {[-1, 0, 1].map((t) => (
            <mesh key={t} position={[t * r * 0.14, r * 0.04, r * 0.4]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[r * 0.04, r * 0.12, 4]} />
              <meshStandardMaterial color="#f3ead6" />
            </mesh>
          ))}
        </group>
      </group>
    </>
  );
}

/** Long, low charger: shaggy back ridge, a single forward horn, long legs and a tufted tail. */
function RamhornBody({ r, gait }: { r: number; gait: Gait }) {
  return (
    <>
      {QUAD_LEGS.map(([side, along, offset]) => (
        <Leg
          key={`${side}:${along}`}
          gait={gait}
          x={side * r * 0.5}
          z={along * r * 1.05}
          length={r * 0.62}
          radius={r * 0.14}
          color="#3e1f17"
          offset={offset}
        />
      ))}
      <mesh position={[0, r * 0.85, -r * 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[r * 0.68, r * 1.05, 8, 16]} />
        <meshStandardMaterial color="#7a3b2e" roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[0, r * 1.5, r * (0.45 - i * 0.28)]}
          rotation={[-0.3, 0, 0]}
          castShadow
        >
          <coneGeometry args={[r * 0.14, r * 0.45, 5]} />
          <meshStandardMaterial color="#4a241c" roughness={1} flatShading />
        </mesh>
      ))}
      <group position={[0, r * 0.9, r * 1.0]}>
        <mesh castShadow>
          <sphereGeometry args={[r * 0.55, 16, 12]} />
          <meshStandardMaterial color="#8f4a38" roughness={0.85} />
        </mesh>
        <mesh position={[0, -r * 0.12, r * 0.42]} scale={[1, 0.75, 1]}>
          <sphereGeometry args={[r * 0.3, 12, 8]} />
          <meshStandardMaterial color="#b0705a" roughness={0.8} />
        </mesh>
        <mesh position={[0, r * 0.08, r * 0.65]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[r * 0.2, r * 1.1, 12]} />
          <meshStandardMaterial color="#f1e6cc" roughness={0.45} />
        </mesh>
        <Eye x={-r * 0.3} y={r * 0.15} z={r * 0.4} size={r * 0.1} glow="#ff6a2a" />
        <Eye x={r * 0.3} y={r * 0.15} z={r * 0.4} size={r * 0.1} glow="#ff6a2a" />
      </group>
      <mesh position={[0, r * 1.05, -r * 1.45]} rotation={[-0.9, 0, 0]}>
        <cylinderGeometry args={[r * 0.05, r * 0.07, r * 0.7, 6]} />
        <meshStandardMaterial color="#4a241c" />
      </mesh>
      <mesh position={[0, r * 0.82, -r * 1.75]}>
        <sphereGeometry args={[r * 0.15, 8, 6]} />
        <meshStandardMaterial color="#2a140f" roughness={1} flatShading />
      </mesh>
    </>
  );
}

/** Swollen, spotted bulb on wriggling feet, with eye stalks and a glowing spout. */
function SpitterBody({ r, gait }: { r: number; gait: Gait }) {
  const feet = useRef<Group>(null);
  useFrame(({ clock }) => {
    feet.current?.children.forEach((foot, i) => {
      foot.rotation.x = Math.sin(clock.elapsedTime * 6 + i * 1.3) * (0.15 + gait.stride * 0.35);
    });
  });
  return (
    <>
      <group ref={feet}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <group
              key={i}
              position={[Math.sin(angle) * r * 0.6, r * 0.35, Math.cos(angle) * r * 0.6]}
              rotation={[0, angle, 0]}
            >
              <mesh position={[0, -r * 0.18, r * 0.1]} rotation={[0.5, 0, 0]}>
                <coneGeometry args={[r * 0.12, r * 0.5, 6]} />
                <meshStandardMaterial color="#4a3266" roughness={0.8} />
              </mesh>
            </group>
          );
        })}
      </group>
      <mesh position={[0, r * 1.05, 0]} scale={[1, 1.15, 1]} castShadow>
        <sphereGeometry args={[r, 24, 18]} />
        <meshStandardMaterial color="#6b4a8a" roughness={0.6} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = i * 2.2;
        const height = 0.7 + (i % 3) * 0.35;
        return (
          <mesh
            key={i}
            position={[Math.sin(angle) * r * 0.93, r * height, Math.cos(angle) * r * 0.93]}
          >
            <sphereGeometry args={[r * 0.11, 8, 6]} />
            <meshStandardMaterial color="#b89ad6" roughness={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, r * 1.95, r * 0.5]} rotation={[0.7, 0, 0]} castShadow>
        <cylinderGeometry args={[r * 0.34, r * 0.22, r * 0.9, 14, 1, true]} />
        <meshStandardMaterial color="#3d2a52" roughness={0.8} side={2} />
      </mesh>
      <mesh position={[0, r * 2.2, r * 0.7]}>
        <sphereGeometry args={[r * 0.2, 10, 8]} />
        <meshBasicMaterial color={[0.9, 1.6, 0.4]} toneMapped={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * r * 0.4, r * 1.6, r * 0.65]}
          rotation={[0.3, 0, side * -0.3]}
        >
          <mesh position={[0, r * 0.2, 0]}>
            <cylinderGeometry args={[r * 0.04, r * 0.05, r * 0.4, 6]} />
            <meshStandardMaterial color="#4a3266" />
          </mesh>
          <Eye x={0} y={r * 0.45} z={0} size={r * 0.14} glow="#b6e02a" />
        </group>
      ))}
    </>
  );
}

/** Plated burrowing grub. Its pale belly shows when it rears and while it lies winded. */
function GravelmawBody({ r, belly }: { r: number; belly: React.Ref<MeshStandardMaterial> }) {
  return (
    <>
      {[-0.9, -0.3, 0.3, 0.9].map((along, i) => (
        <mesh key={along} position={[0, r * 0.62 - i * 0.04, along * r * 0.75]} castShadow>
          <sphereGeometry args={[r * (0.68 - Math.abs(along) * 0.12), 18, 12]} />
          <meshStandardMaterial color="#6c625a" roughness={0.8} flatShading />
        </mesh>
      ))}
      <mesh position={[0, r * 0.28, r * 0.15]} scale={[0.85, 0.35, 1.25]}>
        <sphereGeometry args={[r * 0.7, 16, 10]} />
        <meshStandardMaterial
          ref={belly}
          color="#e9d9b8"
          emissive="#ffcf7a"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[0, r * 0.62, r * 1.05]} castShadow>
        <sphereGeometry args={[r * 0.5, 16, 12]} />
        <meshStandardMaterial color="#544a42" roughness={0.75} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * r * 0.25, r * 0.4, r * 1.48]}
          rotation={[1.2, 0, side * 0.4]}
        >
          <coneGeometry args={[r * 0.1, r * 0.45, 8]} />
          <meshStandardMaterial color="#f3ead6" roughness={0.4} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * r * 0.24, r * 0.8, r * 1.38]}>
          <sphereGeometry args={[r * 0.07, 8, 6]} />
          <meshStandardMaterial color="#ffe08a" emissive="#ff6a2a" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </>
  );
}

/** Ribbed amber bulb on a twisted stalk. */
function LanternrootBody({ r }: { r: number }) {
  return (
    <>
      <mesh position={[0, r * 0.4, 0]} castShadow>
        <cylinderGeometry args={[r * 0.3, r * 0.55, r * 0.8, 10]} />
        <meshStandardMaterial color="#4a3524" roughness={1} />
      </mesh>
      <mesh position={[0, r * 1.25, 0]} scale={[1, 1.15, 1]} castShadow>
        <sphereGeometry args={[r * 0.75, 12, 16]} />
        <meshStandardMaterial
          color="#e3a03a"
          emissive="#ff8a1a"
          emissiveIntensity={0.6}
          roughness={0.4}
          flatShading
        />
      </mesh>
      <mesh position={[0, r * 2.05, 0]}>
        <coneGeometry args={[r * 0.22, r * 0.5, 8]} />
        <meshStandardMaterial color="#5b3a1e" roughness={0.9} />
      </mesh>
    </>
  );
}

/** A knot of root with a glowing core; a grey stump while withered. */
function KnotBody({ r }: { r: number }) {
  return (
    <>
      <mesh position={[0, r * 0.5, 0]} castShadow>
        <dodecahedronGeometry args={[r * 0.8, 0]} />
        <meshStandardMaterial color="#5b3a1e" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, r * 0.95, 0]}>
        <sphereGeometry args={[r * 0.3, 10, 8]} />
        <meshBasicMaterial color={[2.2, 1.4, 0.4]} toneMapped={false} />
      </mesh>
    </>
  );
}

/** A towering, shaggy elder charger with a bronze bell hung between its horns. */
function BellwetherBody({ r, bell, gait }: { r: number; bell: React.Ref<Group>; gait: Gait }) {
  return (
    <>
      <mesh position={[0, r * 0.9, -r * 0.15]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[r * 0.75, r * 1.2, 8, 16]} />
        <meshStandardMaterial color="#5a4a3e" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, r * 0.95, r * 0.95]} castShadow>
        <sphereGeometry args={[r * 0.55, 14, 10]} />
        <meshStandardMaterial color="#4a3a30" roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * r * 0.45, r * 1.35, r * 0.8]}
          rotation={[0.4, 0, side * 1.1]}
          castShadow
        >
          <torusGeometry args={[r * 0.38, r * 0.08, 8, 16, Math.PI * 1.2]} />
          <meshStandardMaterial color="#efe3c4" roughness={0.5} />
        </mesh>
      ))}
      <group ref={bell} position={[0, r * 0.55, r * 1.35]}>
        <mesh castShadow>
          <cylinderGeometry args={[r * 0.12, r * 0.24, r * 0.32, 14, 1, true]} />
          <meshStandardMaterial color="#b0782e" metalness={0.8} roughness={0.35} side={2} />
        </mesh>
      </group>
      {QUAD_LEGS.map(([side, along, offset]) => (
        <Leg
          key={`${side}:${along}`}
          gait={gait}
          x={side * r * 0.55}
          z={along * r * 0.95}
          length={r * 0.6}
          radius={r * 0.17}
          color="#3a2a22"
          offset={offset}
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <mesh
          key={`fur${i}`}
          position={[(i % 2 ? 1 : -1) * r * 0.55, r * 0.75, r * (0.6 - i * 0.2)]}
          rotation={[0, 0, (i % 2 ? -1 : 1) * 0.5]}
          castShadow
        >
          <coneGeometry args={[r * 0.18, r * 0.6, 5]} />
          <meshStandardMaterial color="#6a5848" roughness={1} flatShading />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * r * 0.24, r * 1.05, r * 1.4]}>
          <sphereGeometry args={[r * 0.07, 8, 6]} />
          <meshStandardMaterial color="#ffe08a" emissive="#ff4a1a" emissiveIntensity={1.6} />
        </mesh>
      ))}
    </>
  );
}

/** A heap of soil with a glint of whatever is buried inside. It shrinks as it is dug. */
function MoundBody({ r, glint }: { r: number; glint: string }) {
  const { soil } = gameTextures();
  return (
    <>
      <mesh position={[0, 0, 0]} scale={[1, 0.6, 1]} castShadow receiveShadow>
        <sphereGeometry args={[r * 1.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={soil.color} bumpMap={soil.bump} bumpScale={3} roughness={1} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 1.3) * r * 0.9, r * 0.1, Math.cos(i * 1.3) * r * 0.9]}
        >
          <dodecahedronGeometry args={[r * 0.14, 0]} />
          <meshStandardMaterial color="#8a7a66" roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[r * 0.25, r * 0.55, r * 0.2]}>
        <octahedronGeometry args={[r * 0.16]} />
        <meshBasicMaterial color={glint} toneMapped={false} />
      </mesh>
    </>
  );
}

/** A wall of thorny bramble filling a gate's box. */
/** A weak stretch of wall: old brick like the rest, but for a crack running through it. */
function HiddenWallBody({ box }: { box: Box }) {
  const long = box.w >= box.d;
  const length = long ? box.w : box.d;
  return (
    <>
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[box.w, 2.5, box.d]} />
        <meshStandardMaterial color="#a8583a" roughness={0.9} />
      </mesh>
      {/* The crack: a dark zig-zag on both faces. */}
      {[-1, 1].map((side) =>
        [0, 1, 2, 3].map((i) => {
          const along = (i / 3 - 0.5) * length * 0.3;
          const y = 0.4 + i * 0.5;
          const off = side * ((long ? box.d : box.w) / 2 + 0.01);
          return (
            <mesh
              key={`${side}:${i}`}
              position={[long ? along : off, y, long ? off : along]}
              rotation={[0, long ? 0 : Math.PI / 2, i % 2 ? 0.7 : -0.7]}
            >
              <planeGeometry args={[0.08, 0.6]} />
              <meshBasicMaterial color="#2a1d14" side={2} />
            </mesh>
          );
        }),
      )}
    </>
  );
}

function GateBody({ box }: { box: Box }) {
  const stems = Math.max(3, Math.round(Math.max(box.w, box.d) * 1.6));
  const long = box.w >= box.d;
  return (
    <>
      {Array.from({ length: stems }, (_, i) => {
        const t = (i + 0.5) / stems - 0.5;
        const along = t * (long ? box.w : box.d);
        const tilt = Math.sin(i * 2.3) * 0.5;
        return (
          <mesh
            key={i}
            position={[long ? along : 0, 1, long ? 0 : along]}
            rotation={
              long ? [tilt, 0, Math.cos(i * 1.7) * 0.4] : [Math.cos(i * 1.7) * 0.4, 0, tilt]
            }
            castShadow
          >
            <torusGeometry args={[0.8, 0.12, 6, 14]} />
            <meshStandardMaterial color={i % 2 ? '#4a3a22' : '#5a6a2a'} roughness={0.9} />
          </mesh>
        );
      })}
      {Array.from({ length: stems * 2 }, (_, i) => {
        const t = ((i * 0.618) % 1) - 0.5;
        const along = t * (long ? box.w : box.d);
        const y = 0.4 + ((i * 0.37) % 1) * 1.5;
        return (
          <mesh
            key={`thorn${i}`}
            position={[
              long ? along : i % 2 ? 0.25 : -0.25,
              y,
              long ? (i % 2 ? 0.25 : -0.25) : along,
            ]}
            rotation={[i % 2 ? 1.2 : -1.2, 0, 0]}
          >
            <coneGeometry args={[0.05, 0.3, 4]} />
            <meshStandardMaterial color="#d9cfa8" />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * A crystal gate: a wall of faceted crystal grown across an old doorway of the Academy,
 * glowing from inside, set in a frame of carved stone with a keystone over the top.
 */
function CrystalGateBody({ box }: { box: Box }) {
  const long = box.w >= box.d;
  const span = long ? box.w : box.d;
  const count = Math.max(4, Math.round(span * 1.4));
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count - 0.5;
        const along = t * span;
        const height = 1.4 + ((i * 0.618) % 1) * 1.6;
        const lean = Math.sin(i * 2.7) * 0.25;
        return (
          <mesh
            key={i}
            position={[
              long ? along : Math.sin(i) * 0.2,
              height / 2,
              long ? Math.sin(i) * 0.2 : along,
            ]}
            rotation={long ? [lean, i, 0] : [0, i, lean]}
            castShadow
          >
            <coneGeometry args={[0.32 + ((i * 0.37) % 1) * 0.2, height, 6]} />
            <meshPhysicalMaterial
              color={i % 3 ? '#a8e8ff' : '#d0b0ff'}
              emissive={i % 3 ? '#3ab8ff' : '#8a5aff'}
              emissiveIntensity={0.7}
              transparent
              opacity={0.82}
              roughness={0.05}
              clearcoat={1}
              flatShading
            />
          </mesh>
        );
      })}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[long ? side * (span / 2 + 0.3) : 0, 1.6, long ? 0 : side * (span / 2 + 0.3)]}
          castShadow
        >
          <boxGeometry args={[0.6, 3.2, 0.6]} />
          <meshStandardMaterial color="#d8ccb4" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 3.35, 0]} castShadow>
        <boxGeometry args={long ? [span + 1.2, 0.4, 0.7] : [0.7, 0.4, span + 1.2]} />
        <meshStandardMaterial color="#cfc2a8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.6, 0]}>
        <octahedronGeometry args={[0.3]} />
        <meshBasicMaterial color={[2.2, 1.6, 0.6]} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} color="#7acaff" intensity={4} distance={6} decay={1.8} />
    </>
  );
}

/** Cave vermin: a low, glossy carapace on six quick legs, with eyes that shine in the dark. */
function SkitterBody({ r, gait, jaw }: { r: number; gait: Gait; jaw: React.Ref<Group> }) {
  return (
    <>
      {[-0.6, 0, 0.6].flatMap((along, i) =>
        [-1, 1].map((side) => (
          <Leg
            key={`${along}:${side}`}
            gait={gait}
            x={side * r * 0.75}
            z={along * r}
            length={r * 0.55}
            radius={r * 0.09}
            color="#2a2030"
            offset={(i + (side > 0 ? 1 : 0)) * Math.PI}
          />
        )),
      )}
      <mesh position={[0, r * 0.6, -r * 0.1]} scale={[1, 0.5, 1.3]} castShadow>
        <sphereGeometry args={[r * 0.85, 18, 12]} />
        <meshStandardMaterial color="#3d2f4a" roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0, r * 0.78, -r * 0.2]} scale={[0.7, 0.3, 1]}>
        <sphereGeometry args={[r * 0.8, 14, 10]} />
        <meshStandardMaterial color="#5a4470" roughness={0.3} metalness={0.3} />
      </mesh>
      <group position={[0, r * 0.55, r * 0.95]}>
        <mesh castShadow>
          <sphereGeometry args={[r * 0.42, 14, 10]} />
          <meshStandardMaterial color="#2f2438" roughness={0.5} />
        </mesh>
        <Eye x={-r * 0.2} y={r * 0.16} z={r * 0.28} size={r * 0.13} glow="#c8ff5a" />
        <Eye x={r * 0.2} y={r * 0.16} z={r * 0.28} size={r * 0.13} glow="#c8ff5a" />
        <group ref={jaw} position={[0, -r * 0.1, r * 0.3]}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * r * 0.16, 0, r * 0.14]}
              rotation={[1.5, 0, side * 0.5]}
            >
              <coneGeometry args={[r * 0.07, r * 0.4, 6]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  );
}

/**
 * The Snuffer: a huge, pale, eyeless cave-dweller with a frill of gills and a mouth far
 * too wide. Its belly shows while it lies winded.
 */
function SnufferBody({
  r,
  gait,
  belly,
}: {
  r: number;
  gait: Gait;
  belly: React.Ref<MeshStandardMaterial>;
}) {
  return (
    <>
      {QUAD_LEGS.map(([side, along, offset]) => (
        <Leg
          key={`${side}:${along}`}
          gait={gait}
          x={side * r * 0.62}
          z={along * r * 0.9}
          length={r * 0.38}
          radius={r * 0.14}
          color="#cfc2cc"
          offset={offset}
        />
      ))}
      {[-1.1, -0.5, 0.1].map((along, i) => (
        <mesh key={along} position={[0, r * 0.55, along * r * 0.8]} castShadow>
          <sphereGeometry args={[r * (0.5 + i * 0.1), 20, 14]} />
          <meshStandardMaterial color="#ded3dc" roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, r * 0.4, -r * 1.5]} rotation={[-1.35, 0, 0]} castShadow>
        <coneGeometry args={[r * 0.3, r * 1.1, 10]} />
        <meshStandardMaterial color="#d2c5cf" roughness={0.5} />
      </mesh>
      <mesh position={[0, r * 0.22, -r * 0.2]} scale={[0.85, 0.3, 1.5]}>
        <sphereGeometry args={[r * 0.7, 16, 10]} />
        <meshStandardMaterial
          ref={belly}
          color="#f6e4e2"
          emissive="#ff9a7a"
          emissiveIntensity={0}
        />
      </mesh>
      <group position={[0, r * 0.58, r * 0.85]}>
        <mesh scale={[1.25, 0.8, 1]} castShadow>
          <sphereGeometry args={[r * 0.6, 20, 14]} />
          <meshStandardMaterial color="#e6dbe2" roughness={0.4} />
        </mesh>
        <mesh position={[0, -r * 0.16, r * 0.3]} scale={[1.2, 0.22, 0.8]}>
          <sphereGeometry args={[r * 0.5, 16, 8]} />
          <meshStandardMaterial color="#5a2636" roughness={0.6} />
        </mesh>
        {[-2, -1, 0, 1, 2].map((t) => (
          <mesh key={t} position={[t * r * 0.2, -r * 0.08, r * 0.58]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[r * 0.05, r * 0.16, 5]} />
            <meshStandardMaterial color="#fff6e6" roughness={0.3} />
          </mesh>
        ))}
        {[-1, 1].flatMap((side) =>
          [0, 1, 2].map((i) => (
            <mesh
              key={`${side}:${i}`}
              position={[side * r * (0.62 + i * 0.07), r * (0.18 + i * 0.16), -r * 0.12]}
              rotation={[0, 0, -side * (1.1 - i * 0.3)]}
            >
              <coneGeometry args={[r * 0.07, r * 0.5, 6]} />
              <meshStandardMaterial
                color="#f09ab0"
                emissive="#ff5a8a"
                emissiveIntensity={0.5}
                roughness={0.5}
              />
            </mesh>
          )),
        )}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * r * 0.16, r * 0.12, r * 0.55]}>
            <sphereGeometry args={[r * 0.04, 6, 6]} />
            <meshBasicMaterial color="#3a2030" />
          </mesh>
        ))}
      </group>
    </>
  );
}

// ---- The eight beasts with rules of their own (see enemies/beasts.ts) ----

function MothBody({ r, wings }: { r: number; wings: React.Ref<Group> }) {
  return (
    <>
      <mesh position={[0, 0, 0]} scale={[0.5, 0.5, 1.3]} castShadow>
        <sphereGeometry args={[r * 0.5, 14, 10]} />
        <meshStandardMaterial color="#d8c08a" roughness={0.9} />
      </mesh>
      <group ref={wings}>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            name={side < 0 ? 'left' : 'right'}
            position={[side * r * 0.75, 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[r * 0.75, 12]} />
            <meshStandardMaterial color="#cdb47e" roughness={0.95} side={DoubleSide} />
          </mesh>
        ))}
      </group>
      <Eye x={-r * 0.14} y={r * 0.12} z={r * 0.6} size={r * 0.12} glow="#ff7a3a" />
      <Eye x={r * 0.14} y={r * 0.12} z={r * 0.6} size={r * 0.12} glow="#ff7a3a" />
    </>
  );
}

function GrubBody({ r }: { r: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, r * (0.45 - i * 0.05), -i * r * 0.55]} castShadow>
          <sphereGeometry args={[r * (0.6 - i * 0.1), 14, 10]} />
          <meshStandardMaterial color={i === 0 ? '#e8c9a8' : '#d9b48e'} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, r * 0.45, r * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.22, r * 0.07, 6, 12]} />
        <meshStandardMaterial color="#5a2a2a" roughness={0.6} />
      </mesh>
    </>
  );
}

function ShellbackBody({ r, gait }: { r: number; gait: Gait }) {
  return (
    <>
      {[-0.5, 0, 0.5].flatMap((along, i) =>
        [-1, 1].map((side) => (
          <Leg
            key={`${along}:${side}`}
            gait={gait}
            x={side * r * 0.7}
            z={along * r}
            length={r * 0.45}
            radius={r * 0.08}
            color="#1e2a20"
            offset={(i + (side > 0 ? 1 : 0)) * Math.PI}
          />
        )),
      )}
      {/* The underside, soft and pale: what a flip lays open. */}
      <mesh position={[0, r * 0.32, 0]} scale={[1, 0.3, 1.25]}>
        <sphereGeometry args={[r * 0.8, 16, 10]} />
        <meshStandardMaterial color="#e6c86a" roughness={0.6} />
      </mesh>
      <mesh position={[0, r * 0.5, 0]} scale={[1, 0.55, 1.3]} castShadow>
        <sphereGeometry args={[r * 0.85, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2e5a3a" roughness={0.25} metalness={0.45} />
      </mesh>
      <Eye x={-r * 0.22} y={r * 0.45} z={r * 1.0} size={r * 0.11} glow="#ffd04a" />
      <Eye x={r * 0.22} y={r * 0.45} z={r * 1.0} size={r * 0.11} glow="#ffd04a" />
    </>
  );
}

function SlugBody({ r, jaw }: { r: number; jaw: React.Ref<Group> }) {
  return (
    <>
      <mesh position={[0, r * 0.35, 0]} scale={[0.8, 0.45, 1.5]} castShadow>
        <sphereGeometry args={[r * 0.8, 18, 12]} />
        <meshStandardMaterial color="#9a7ab8" roughness={0.3} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * r * 0.2, r * 0.75, r * 0.9]}
          rotation={[0.5, 0, side * 0.3]}
        >
          <cylinderGeometry args={[r * 0.04, r * 0.06, r * 0.5, 6]} />
          <meshStandardMaterial color="#7a5a98" roughness={0.4} />
        </mesh>
      ))}
      <group ref={jaw} position={[0, r * 0.25, r * 1.1]}>
        <mesh scale={[1, 0.4, 0.6]}>
          <sphereGeometry args={[r * 0.3, 12, 8]} />
          <meshStandardMaterial color="#4a2a5a" roughness={0.5} />
        </mesh>
      </group>
    </>
  );
}

function NewtBody({ r, gait, jaw }: { r: number; gait: Gait; jaw: React.Ref<Group> }) {
  return (
    <>
      {[-0.4, 0.4].flatMap((along, i) =>
        [-1, 1].map((side) => (
          <Leg
            key={`${along}:${side}`}
            gait={gait}
            x={side * r * 0.55}
            z={along * r}
            length={r * 0.3}
            radius={r * 0.08}
            color="#2a5a52"
            offset={(i + (side > 0 ? 1 : 0)) * Math.PI}
          />
        )),
      )}
      <mesh position={[0, r * 0.3, 0]} scale={[0.6, 0.4, 1.6]} castShadow>
        <sphereGeometry args={[r * 0.75, 16, 10]} />
        <meshStandardMaterial color="#3a8a78" roughness={0.3} />
      </mesh>
      <mesh position={[0, r * 0.25, -r * 1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[r * 0.22, r * 1, 8]} />
        <meshStandardMaterial color="#2f7466" roughness={0.3} />
      </mesh>
      <mesh position={[0, r * 0.52, 0]} scale={[0.1, 0.5, 1.3]}>
        <sphereGeometry args={[r * 0.6, 8, 6]} />
        <meshStandardMaterial color="#e86a3a" roughness={0.5} />
      </mesh>
      <group ref={jaw} position={[0, r * 0.32, r * 1.1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[r * 0.25, r * 0.6, 8]} />
          <meshStandardMaterial color="#357e6e" roughness={0.3} />
        </mesh>
      </group>
      <Eye x={-r * 0.2} y={r * 0.5} z={r * 0.95} size={r * 0.1} glow="#fff07a" />
      <Eye x={r * 0.2} y={r * 0.5} z={r * 0.95} size={r * 0.1} glow="#fff07a" />
    </>
  );
}

function HedgehogBody({ r, gait }: { r: number; gait: Gait }) {
  const spines = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const up = 0.35 + (i % 3) * 0.25;
        return { a, up };
      }),
    [],
  );
  return (
    <>
      {[-0.4, 0.4].flatMap((along, i) =>
        [-1, 1].map((side) => (
          <Leg
            key={`${along}:${side}`}
            gait={gait}
            x={side * r * 0.5}
            z={along * r}
            length={r * 0.3}
            radius={r * 0.08}
            color="#5a4030"
            offset={(i + (side > 0 ? 1 : 0)) * Math.PI}
          />
        )),
      )}
      <mesh position={[0, r * 0.55, 0]} castShadow>
        <sphereGeometry args={[r * 0.7, 16, 12]} />
        <meshStandardMaterial color="#7a5a40" roughness={0.8} />
      </mesh>
      {spines.map(({ a, up }, i) => (
        <mesh
          key={i}
          position={[
            Math.sin(a) * r * 0.55,
            r * (0.55 + up * 0.5),
            Math.cos(a) * r * 0.55 - r * 0.1,
          ]}
          rotation={[Math.cos(a) * (1.4 - up), 0, -Math.sin(a) * (1.4 - up)]}
        >
          <coneGeometry args={[r * 0.06, r * 0.55, 5]} />
          <meshStandardMaterial color="#e8d8b0" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, r * 0.45, r * 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[r * 0.22, r * 0.45, 8]} />
        <meshStandardMaterial color="#c8a888" roughness={0.6} />
      </mesh>
      <Eye x={-r * 0.16} y={r * 0.6} z={r * 0.68} size={r * 0.08} glow="#2a1d14" />
      <Eye x={r * 0.16} y={r * 0.6} z={r * 0.68} size={r * 0.08} glow="#2a1d14" />
    </>
  );
}

function MimicBody({ r, jaw }: { r: number; jaw: React.Ref<Group> }) {
  return (
    <>
      <mesh position={[0, r * 0.4, 0]}>
        <cylinderGeometry args={[r * 0.2, r * 0.28, r * 0.8, 10]} />
        <meshStandardMaterial color="#efe4c8" roughness={0.7} />
      </mesh>
      <group ref={jaw} position={[0, r * 0.8, 0]}>
        {/* The tell: the cap glows a touch redder than a real Glowcap's. */}
        <mesh scale={[1, 0.55, 1]} castShadow>
          <sphereGeometry args={[r * 0.7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#9adf6a"
            emissive="#c8a040"
            emissiveIntensity={0.7}
            roughness={0.4}
          />
        </mesh>
      </group>
    </>
  );
}

function WaspNestBody({ r }: { r: number }) {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, r * (0.4 + i * 0.4), 0]} castShadow>
          <sphereGeometry args={[r * (0.75 - Math.abs(i - 1.2) * 0.15), 14, 8]} />
          <meshStandardMaterial color={i % 2 ? '#cbb89a' : '#b8a482'} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, r * 0.7, r * 0.62]}>
        <circleGeometry args={[r * 0.2, 10]} />
        <meshBasicMaterial color="#2a1d14" />
      </mesh>
    </>
  );
}

function SparkWaspBody({ r, wings }: { r: number; wings: React.Ref<Group> }) {
  return (
    <>
      <mesh scale={[0.6, 0.6, 1.4]} castShadow>
        <sphereGeometry args={[r * 0.5, 10, 8]} />
        <meshStandardMaterial color="#f0c83a" emissive="#ffb000" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0, -r * 0.35]} scale={[0.62, 0.62, 0.3]}>
        <sphereGeometry args={[r * 0.5, 10, 8]} />
        <meshStandardMaterial color="#2a1d14" />
      </mesh>
      <group ref={wings}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * r * 0.4, r * 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[r * 0.38, 8]} />
            <meshBasicMaterial color="#e8f4ff" transparent opacity={0.6} side={DoubleSide} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/** Boss: broad dusk-coloured wings with eye-spots, a furred body and a crest of feelers. */
function GalewingBody({ r, wings }: { r: number; wings: React.Ref<Group> }) {
  return (
    <>
      <mesh scale={[0.55, 0.5, 1.4]} castShadow>
        <sphereGeometry args={[r * 0.5, 16, 12]} />
        <meshStandardMaterial color="#5a4a6a" roughness={0.9} />
      </mesh>
      <group ref={wings}>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * r * 0.85, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
              <circleGeometry args={[r * 0.85, 16]} />
              <meshStandardMaterial color="#7a5a9a" roughness={0.9} side={DoubleSide} />
            </mesh>
            <mesh position={[side * r * 1.0, 0.02, -r * 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[r * 0.25, 12]} />
              <meshBasicMaterial color="#ffcf6a" side={DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * r * 0.12, r * 0.2, r * 0.75]}
          rotation={[0.9, 0, side * 0.4]}
        >
          <cylinderGeometry args={[r * 0.015, r * 0.02, r * 0.6, 4]} />
          <meshStandardMaterial color="#3a2a4a" />
        </mesh>
      ))}
      <Eye x={-r * 0.12} y={r * 0.1} z={r * 0.62} size={r * 0.09} glow="#ff6a3a" />
      <Eye x={r * 0.12} y={r * 0.1} z={r * 0.62} size={r * 0.09} glow="#ff6a3a" />
    </>
  );
}

/** Boss: a huge pike-jawed newt with a gilded crest, wearing the pond's weed. */
function MirelordBody({ r, gait, jaw }: { r: number; gait: Gait; jaw: React.Ref<Group> }) {
  return (
    <>
      <NewtBody r={r} gait={gait} jaw={jaw} />
      {[-0.5, 0, 0.5].map((along, i) => (
        <mesh key={i} position={[0, r * 0.75, along * r]} rotation={[0, 0, 0]}>
          <coneGeometry args={[r * 0.12, r * 0.45, 6]} />
          <meshStandardMaterial color="#d8b04a" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[r * 0.3, r * 0.5, -r * 0.3]} rotation={[0.3, 0.4, 1.2]}>
        <torusGeometry args={[r * 0.35, r * 0.05, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#4a7a3a" roughness={0.9} />
      </mesh>
    </>
  );
}

/**
 * Final boss: the Academy's old clockwork Warden, grown huge and wound wrong. A brass body on
 * two legs, a clock face for a head with its hands spinning, and a glowing heart that shows
 * when it is open.
 */
function HollowWardenBody({
  r,
  gait,
  belly,
}: {
  r: number;
  gait: Gait;
  belly: React.Ref<MeshStandardMaterial>;
}) {
  const hands = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (hands.current) hands.current.rotation.z = -clock.elapsedTime * 3;
  });
  return (
    <>
      {[-1, 1].map((side, i) => (
        <Leg
          key={side}
          gait={gait}
          x={side * r * 0.35}
          z={0}
          length={r * 0.9}
          radius={r * 0.14}
          color="#6a4a2a"
          offset={i * Math.PI}
        />
      ))}
      <mesh position={[0, r * 1.5, 0]} castShadow>
        <cylinderGeometry args={[r * 0.5, r * 0.62, r * 1.3, 12]} />
        <meshStandardMaterial color="#b8863a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, r * 1.55, r * 0.5]}>
        <sphereGeometry args={[r * 0.2, 14, 10]} />
        <meshStandardMaterial
          ref={belly}
          color="#ffcf6a"
          emissive="#ff8a2a"
          emissiveIntensity={0}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * r * 0.75, r * 1.5, 0]}
          rotation={[0, 0, side * 0.3]}
          castShadow
        >
          <cylinderGeometry args={[r * 0.12, r * 0.1, r * 1.1, 8]} />
          <meshStandardMaterial color="#8a6a3a" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <group position={[0, r * 2.45, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[r * 0.5, r * 0.5, r * 0.25, 24]} />
          <meshStandardMaterial color="#efe4c8" roughness={0.5} />
        </mesh>
        <group ref={hands} position={[0, 0, r * 0.14]}>
          <mesh position={[0, r * 0.18, 0]}>
            <boxGeometry args={[r * 0.04, r * 0.36, r * 0.02]} />
            <meshStandardMaterial color="#2a1d14" />
          </mesh>
          <mesh position={[r * 0.12, 0, 0]}>
            <boxGeometry args={[r * 0.24, r * 0.04, r * 0.02]} />
            <meshStandardMaterial color="#2a1d14" />
          </mesh>
        </group>
      </group>
    </>
  );
}

interface EnemyMeshProps {
  sim: Simulation;
  entity: Entity;
  enemy: Enemy;
}

const BAR_HEIGHT: Record<EnemyKind, number> = {
  mossback: 2.4,
  ramhorn: 2.4,
  spitter: 2.6,
  gate: 0,
  mound: 1.2,
  gravelmaw: 2,
  lanternroot: 2.6,
  rootknot: 1.6,
  bellwether: 2.6,
  skitter: 1.3,
  snuffer: 2.4,
  moth: 2.6,
  grub: 1.6,
  shellback: 1.8,
  slug: 1.6,
  newt: 1.4,
  hedgehog: 1.6,
  mimic: 1.4,
  waspnest: 2.6,
  sparkwasp: 1.6,
  galewing: 4.6,
  mirelord: 3,
  hollowwarden: 5.4,
};

/**
 * One enemy. Every attack is telegraphed: a biter rears back, a charger paws the
 * ground and paints its charge lane, a spitter swells, a slammer rears over its
 * ring, and all of them shudder just before shaking attackers off. Bosses glow
 * where it hurts while they are open to full damage.
 */
function EnemyMesh({ sim, entity, enemy }: EnemyMeshProps) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const bar = useRef<Sprite>(null);
  const barGroup = useRef<Group>(null);
  const lane = useRef<Mesh>(null);
  const shield = useRef<Mesh>(null);
  const belly = useRef<MeshStandardMaterial>(null);
  const bell = useRef<Group>(null);
  const r = enemy.radius;
  const spec = ENEMY_SPECS[enemy.kind];
  const chargeLength = spec.chargeSpeed * spec.chargeTime;
  const windup = spec.windup * (sim.hard ? HARD.windup : 1);
  const showHealth = useGameStore((state) => state.settings.healthBars);
  const danger = useGameStore((state) => PALETTE_SETS[state.settings.palette].hazards.danger);
  const gait = useMemo<Gait>(() => ({ phase: 0, stride: 0 }), []);
  const jaw = useRef<Group>(null);
  const wings = useRef<Group>(null);
  const ripple = useRef<Mesh>(null);
  const biteZone = useRef<Mesh>(null);
  const aggroRing = useRef<Mesh>(null);
  const alertIcon = useRef<Group>(null);
  const shakeGauge = useRef<Mesh>(null);
  const tether = useRef<Mesh>(null);
  const last = useRef<{ x: number; z: number; hp: number } | null>(null);
  const flash = useRef(0);
  const tinted = useRef<{ material: MeshStandardMaterial; emissive: Color; intensity: number }[]>(
    [],
  );
  useOverlayLayer(barGroup);

  // Remember every body material's own glow, so a hit flash can be undone exactly.
  useLayoutEffect(() => {
    body.current?.traverse((object) => {
      const material = (object as Mesh).material as MeshStandardMaterial | undefined;
      if (material?.isMeshStandardMaterial) {
        tinted.current.push({
          material,
          emissive: material.emissive.clone(),
          intensity: material.emissiveIntensity,
        });
      }
    });
  }, []);

  useFrame(({ clock }, delta) => {
    const node = group.current;
    const model = body.current;
    const transform = sim.transforms.get(entity);
    if (!node || !model || !bar.current || !barGroup.current) return;
    node.visible = transform !== undefined;
    if (!transform) return;
    const time = clock.elapsedTime;
    const previous = last.current;
    const moved = previous ? Math.hypot(transform.x - previous.x, transform.z - previous.z) : 0;
    if (previous && enemy.hp < previous.hp - 0.5) flash.current = HIT_FLASH;
    last.current = { x: transform.x, z: transform.z, hp: enemy.hp };
    gait.phase += moved * (5 / Math.max(0.6, r));
    gait.stride += ((moved > 0.004 ? 1 : 0) - gait.stride) * Math.min(1, delta * 8);
    node.position.set(transform.x, heightAt(sim.level, transform.x, transform.z), transform.z);
    model.rotation.set(0, enemy.shape ? 0 : transform.facing, 0);
    model.position.set(0, 0, 0);
    model.scale.setScalar(1);

    const windingUp = enemy.state === 'windup';
    const winded = enemy.state === 'recover';
    if (spec.attack === 'bite') {
      model.rotation.x = windingUp ? -0.4 : 0;
      if (jaw.current)
        jaw.current.rotation.x = windingUp ? 0.55 : Math.max(0, Math.sin(time * 1.3)) * 0.08;
    } else if (spec.attack === 'charge') {
      if (windingUp) model.position.y = Math.abs(Math.sin(time * 18)) * 0.12;
      if (winded) model.scale.y = 0.92 + Math.sin(time * 9) * 0.05;
      if (bell.current)
        bell.current.rotation.x = windingUp ? Math.sin(time * 22) * 0.6 : Math.sin(time * 2) * 0.1;
    } else if (spec.attack === 'slam') {
      const progress = windingUp ? 1 - enemy.timer / windup : 0;
      model.rotation.x = windingUp ? -0.9 * progress : winded ? 0.15 : 0;
      model.position.y = windingUp ? progress * 1.2 : 0;
      if (winded) model.rotation.z = 0.5 + Math.sin(time * 4) * 0.05;
    } else if (spec.attack === 'spit' && windingUp) {
      model.scale.setScalar(1 + (1 - enemy.timer / windup) * 0.3);
    }
    if (enemy.kind === 'mound')
      model.scale.set(1, 0.35 + 0.65 * Math.max(0, enemy.hp / enemy.maxHp), 1);
    if (enemy.kind === 'rootknot') {
      const withered = enemy.hp <= 0;
      model.scale.setScalar(withered ? 0.45 : 1);
      model.rotation.z = withered ? 0.6 : 0;
    }
    // Beasts with rules of their own show their state.
    const lift = flightHeight(enemy);
    if (lift > 0) {
      model.position.y += lift + Math.sin(time * 3 + entity) * 0.12;
      if (wings.current) {
        const flap = Math.sin(time * (enemy.kind === 'sparkwasp' ? 60 : 14)) * 0.7;
        wings.current.children.forEach((wing, i) => (wing.rotation.y = (i === 0 ? 1 : -1) * flap));
      }
    }
    if (enemy.kind === 'grub') {
      // Underground: only a ripple of earth shows, quickening as it winds up to erupt.
      const under = !isOpen(enemy);
      model.visible = !under;
      if (ripple.current) {
        ripple.current.visible = under;
        const pulse = windingUp
          ? 1 + Math.abs(Math.sin(time * 14)) * 0.5
          : 1 + Math.sin(time * 4) * 0.1;
        ripple.current.scale.setScalar(pulse);
      }
    }
    if (enemy.kind === 'shellback' && isOpen(enemy)) {
      // On its back, legs waving.
      model.rotation.z = Math.PI;
      model.position.y = r * 1.1 + Math.sin(time * 6) * 0.04;
    }
    if (enemy.kind === 'hedgehog' && isOpen(enemy)) model.scale.set(1.05, 0.8, 0.8);
    if (isDormant(enemy)) {
      // Asleep, or keeping still in disguise: slow breathing, and for a mimic now and then a twitch.
      model.rotation.x = 0;
      model.scale.y *= 1 + Math.sin(time * 1.2) * 0.04;
      if (enemy.kind === 'mimic' && Math.sin(time * 0.9 + entity) > 0.97)
        model.rotation.z = Math.sin(time * 40) * 0.12;
    }
    if (belly.current) belly.current.emissiveIntensity = winded ? 1 + Math.sin(time * 8) * 0.5 : 0;
    if (shield.current) {
      shield.current.visible = isShielded(sim, entity, enemy);
      shield.current.rotation.y = time * 0.4;
    }
    const aboutToShake =
      enemy.latched.length > 0 && enemy.shake > spec.shakeInterval - SHAKE_WARNING;
    const jitter = enemy.latched.length === 0 ? 0 : aboutToShake ? 0.14 : 0.03;
    model.position.x += Math.sin(time * 40) * jitter;

    // Hit flash: every body part glows warm white for a moment.
    flash.current = Math.max(0, flash.current - delta);
    for (const { material, emissive, intensity } of tinted.current) {
      if (flash.current > 0) {
        material.emissive.setRGB(1, 0.85, 0.7);
        material.emissiveIntensity = (flash.current / HIT_FLASH) * 0.9;
      } else if (material.emissiveIntensity !== intensity && material !== belly.current) {
        material.emissive.copy(emissive);
        material.emissiveIntensity = intensity;
      }
    }

    // Danger cues: the bite zone, the hunting radius near the Warden, and an alert icon.
    if (biteZone.current) {
      biteZone.current.visible = windingUp && spec.attack === 'bite';
      biteZone.current.position.set(
        Math.sin(transform.facing) * r,
        0.08,
        Math.cos(transform.facing) * r,
      );
      (biteZone.current.material as MeshBasicMaterial).opacity =
        0.25 + Math.abs(Math.sin(time * 14)) * 0.3;
    }
    if (aggroRing.current) {
      const captain = sim.captainTransform;
      const gap = Math.hypot(captain.x - transform.x, captain.z - transform.z) - spec.aggroRange;
      const show = spec.aggroRange > 0 && gap < AGGRO_HINT && enemy.hp > 0;
      aggroRing.current.visible = show;
      (aggroRing.current.material as MeshBasicMaterial).opacity = show
        ? Math.min(0.45, 0.45 * (1 - gap / AGGRO_HINT))
        : 0;
    }
    if (alertIcon.current) {
      alertIcon.current.visible =
        enemy.alert && enemy.hp > 0 && spec.attack !== 'none' && enemy.state !== 'recover';
      alertIcon.current.scale.setScalar(
        windingUp ? 1.15 + Math.abs(Math.sin(time * 16)) * 0.35 : 1,
      );
    }

    // Shake gauge: fills while workers cling on, red in the last second before the shake.
    if (shakeGauge.current) {
      const filling = enemy.latched.length > 0 && Number.isFinite(spec.shakeInterval);
      shakeGauge.current.visible = filling;
      if (filling) {
        const fraction = Math.min(1, enemy.shake / spec.shakeInterval);
        shakeGauge.current.geometry.dispose();
        shakeGauge.current.geometry = gaugeGeometry(r + 0.5, fraction);
        (shakeGauge.current.material as MeshBasicMaterial).color.set(
          enemy.shake > spec.shakeInterval - SHAKE_WARNING ? '#ff3a2a' : '#ffe9a0',
        );
      }
    }
    // Tether from a hunting enemy to what it is after.
    if (tether.current) {
      const hunting = enemy.alert && enemy.state !== 'recover' && spec.attack !== 'none';
      tether.current.visible = hunting;
      if (hunting) {
        const dx = enemy.targetX - transform.x;
        const dz = enemy.targetZ - transform.z;
        const length = Math.hypot(dx, dz);
        tether.current.position.set(dx / 2, 0.09, dz / 2);
        tether.current.rotation.set(-Math.PI / 2, 0, Math.atan2(-dx, -dz) + Math.PI);
        tether.current.scale.set(1, Math.max(0.01, length), 1);
      }
    }

    const health = Math.max(0, enemy.hp / enemy.maxHp);
    barGroup.current.visible = showHealth && !spec.boss && health < 1 && health > 0;
    bar.current.scale.set(BAR_WIDTH * health, 0.22, 1);

    if (lane.current) {
      // The lane lies in a ground-plane group whose local +y is world -z.
      lane.current.visible = windingUp;
      lane.current.rotation.z = Math.atan2(-enemy.aimX, -enemy.aimZ);
      lane.current.position.set(
        (enemy.aimX * chargeLength) / 2,
        (-enemy.aimZ * chargeLength) / 2,
        0,
      );
      (lane.current.material as MeshBasicMaterial).opacity =
        0.2 + Math.abs(Math.sin(time * 10)) * 0.2;
    }
  });

  return (
    <group ref={group}>
      <group ref={body}>
        {enemy.kind === 'mossback' && <MossbackBody r={r} gait={gait} jaw={jaw} />}
        {enemy.kind === 'ramhorn' && <RamhornBody r={r} gait={gait} />}
        {enemy.kind === 'spitter' && <SpitterBody r={r} gait={gait} />}
        {enemy.kind === 'gravelmaw' && <GravelmawBody r={r} belly={belly} />}
        {enemy.kind === 'lanternroot' && <LanternrootBody r={r} />}
        {enemy.kind === 'rootknot' && <KnotBody r={r} />}
        {enemy.kind === 'bellwether' && <BellwetherBody r={r} bell={bell} gait={gait} />}
        {enemy.kind === 'skitter' && <SkitterBody r={r} gait={gait} jaw={jaw} />}
        {enemy.kind === 'snuffer' && <SnufferBody r={r} gait={gait} belly={belly} />}
        {enemy.kind === 'moth' && <MothBody r={r} wings={wings} />}
        {enemy.kind === 'grub' && <GrubBody r={r} />}
        {enemy.kind === 'shellback' && <ShellbackBody r={r} gait={gait} />}
        {enemy.kind === 'slug' && <SlugBody r={r} jaw={jaw} />}
        {enemy.kind === 'newt' && <NewtBody r={r} gait={gait} jaw={jaw} />}
        {enemy.kind === 'hedgehog' && <HedgehogBody r={r} gait={gait} />}
        {enemy.kind === 'mimic' && <MimicBody r={r} jaw={jaw} />}
        {enemy.kind === 'waspnest' && <WaspNestBody r={r} />}
        {enemy.kind === 'sparkwasp' && <SparkWaspBody r={r} wings={wings} />}
        {enemy.kind === 'galewing' && <GalewingBody r={r} wings={wings} />}
        {enemy.kind === 'mirelord' && <MirelordBody r={r} gait={gait} jaw={jaw} />}
        {enemy.kind === 'hollowwarden' && <HollowWardenBody r={r} gait={gait} belly={belly} />}
        {enemy.shape &&
          ((enemy.shape as GateSpawn).style === 'crystal' ? (
            <CrystalGateBody box={enemy.shape} />
          ) : (enemy.shape as GateSpawn).style === 'hidden' ? (
            <HiddenWallBody box={enemy.shape} />
          ) : (
            <GateBody box={enemy.shape} />
          ))}
        {enemy.kind === 'mound' && (
          <MoundBody
            r={r}
            glint={
              enemy.reveals === 'sap' ? '#ffb02e' : enemy.reveals === 'pod' ? '#ff6a2a' : '#ffe08a'
            }
          />
        )}
      </group>
      {enemy.kind === 'grub' && (
        <mesh ref={ripple} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[r * 0.5, r * 1.1, 20]} />
          <meshStandardMaterial color="#6a4a2a" roughness={1} transparent opacity={0.8} />
        </mesh>
      )}
      {enemy.kind === 'lanternroot' && (
        <mesh ref={shield} position={[0, r * 1.2, 0]}>
          <icosahedronGeometry args={[r * 1.35, 2]} />
          <meshStandardMaterial
            color="#ffcf6a"
            emissive="#ff9a2a"
            emissiveIntensity={0.6}
            transparent
            opacity={0.22}
            wireframe
            depthWrite={false}
          />
        </mesh>
      )}
      {enemy.kind === 'snuffer' && (
        // The dark it wears: a shroud that only shows outside a beacon's glow.
        <mesh ref={shield} position={[0, r * 0.7, 0]} scale={[1, 0.7, 1.2]}>
          <icosahedronGeometry args={[r * 1.5, 2]} />
          <meshBasicMaterial color="#1a1030" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}
      {spec.attack === 'charge' && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <mesh ref={lane} visible={false}>
            <planeGeometry args={[r * 2, chargeLength]} />
            <meshBasicMaterial
              color={danger}
              transparent
              opacity={0.28}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
      <mesh ref={biteZone} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <circleGeometry args={[ENEMY.biteRange, 32]} />
        <meshBasicMaterial
          color="#ff3a2a"
          transparent
          opacity={0.4}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {spec.aggroRange > 0 && (
        <mesh
          ref={aggroRing}
          position={[0, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[spec.aggroRange - 0.12, spec.aggroRange, 64]} />
          <meshBasicMaterial
            color="#ffb347"
            transparent
            opacity={0.3}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
      <mesh
        ref={shakeGauge}
        position={[0, 0.07, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[r + 0.35, r + 0.5, 32]} />
        <meshBasicMaterial
          color="#ffe9a0"
          transparent
          opacity={0.85}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={tether} visible={false}>
        <planeGeometry args={[0.08, 1]} />
        <meshBasicMaterial
          color={danger}
          transparent
          opacity={0.55}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <group ref={alertIcon} position={[0, r * BAR_HEIGHT[enemy.kind] + 2, 0]} visible={false}>
        <TextSprite y={0} getText={ALERT_TEXT} color={danger} />
      </group>
      <group ref={barGroup} position={[0, r * BAR_HEIGHT[enemy.kind] + 1, 0]}>
        <sprite scale={[BAR_WIDTH + 0.12, 0.34, 1]}>
          <spriteMaterial color="#1c1410" depthTest={false} depthWrite={false} toneMapped={false} />
        </sprite>
        <sprite ref={bar} renderOrder={1}>
          <spriteMaterial color="#e5533d" depthTest={false} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
    </group>
  );
}

export function EnemyMeshes({ sim }: { sim: Simulation }) {
  useGameStore((state) => state.entityVersion);
  return (
    <>
      {[...sim.enemies.entries()].map(([entity, enemy]) => (
        <EnemyMesh key={entity} sim={sim} entity={entity} enemy={enemy} />
      ))}
    </>
  );
}
