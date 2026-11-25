import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';

/**
 * The title's courtyard in 3D: the Clock tower between the Academy's halls at dusk, its hands
 * turning, lit windows, trees, fireflies and Sproutlings milling about on the lawn, with the
 * camera drifting slowly. Loaded only when the graphics setting allows it; the drawn courtyard
 * underneath shows until this is ready, and stays for Low graphics or without WebGL.
 */

const KIND_COLOURS = ['#ff7a3d', '#5cc4ff', '#b9a48a', '#ffe066'] as const;

/** Sproutlings on the lawn: where each wanders round, how far and how fast. */
const MILLERS = Array.from({ length: 18 }, (_, i) => ({
  cx: -9 + ((i * 37) % 19),
  cz: 1 + ((i * 13) % 7),
  r: 1 + ((i * 7) % 5) * 0.4,
  speed: 0.25 + ((i * 11) % 7) * 0.05,
  phase: i * 1.7,
  colour: KIND_COLOURS[i % 4],
}));

const TREES = [
  [-17, -2],
  [-19, 4],
  [17, -1],
  [19, 5],
  [-14, 9],
  [15, 10],
] as const;

const WINDOWS = Array.from({ length: 12 }, (_, i) => ({
  x: (i < 6 ? -1 : 1) * (7 + (i % 3) * 3),
  y: 2.5 + (Math.floor(i / 3) % 2) * 2.4,
  phase: i * 0.9,
}));

function Sproutling({ miller, still }: { miller: (typeof MILLERS)[number]; still: boolean }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const body = group.current;
    if (!body) return;
    const t = still ? 0 : clock.elapsedTime * miller.speed + miller.phase;
    const x = miller.cx + Math.sin(t) * miller.r;
    const z = miller.cz + Math.cos(t * 0.7) * miller.r * 0.5;
    body.position.set(x, Math.abs(Math.sin(t * 9)) * 0.12, z);
    // Facing the way it walks.
    body.rotation.y = Math.atan2(Math.cos(t) * miller.r, -Math.sin(t * 0.7) * miller.r * 0.35);
  });
  return (
    <group ref={group}>
      <mesh position={[0, 0.5, 0]} scale={[0.42, 0.52, 0.42]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshToonMaterial color={miller.colour} />
      </mesh>
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.36]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshBasicMaterial color="#1c1410" />
        </mesh>
      ))}
      <mesh position={[0.12, 1.12, 0]} rotation={[0, 0, -0.7]} scale={[0.32, 0.08, 0.16]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshToonMaterial color="#6fcf5f" />
      </mesh>
    </group>
  );
}

function Clock({ still }: { still: boolean }) {
  const hour = useRef<Mesh>(null);
  const minute = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = still ? 0 : clock.elapsedTime;
    if (hour.current) hour.current.rotation.z = -t * 0.05;
    if (minute.current) minute.current.rotation.z = -t * 0.6;
  });
  return (
    <group position={[0, 10.5, -4.9]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.4, 2.4, 0.3, 32]} />
        <meshToonMaterial color="#5a4636" />
      </mesh>
      <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.1, 2.1, 0.05, 32]} />
        <meshStandardMaterial color="#fff6dc" emissive="#ffe2a0" emissiveIntensity={0.6} />
      </mesh>
      <mesh ref={hour} position={[0, 0, 0.22]}>
        <boxGeometry args={[0.2, 2.4, 0.05]} />
        <meshBasicMaterial color="#3a2a20" />
      </mesh>
      <mesh ref={minute} position={[0, 0, 0.25]}>
        <boxGeometry args={[0.12, 3.6, 0.05]} />
        <meshBasicMaterial color="#3a2a20" />
      </mesh>
    </group>
  );
}

function Windows({ still }: { still: boolean }) {
  const meshes = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    meshes.current.forEach((mesh, i) => {
      if (!mesh) return;
      const flicker = still ? 1 : 0.8 + 0.2 * Math.sin(clock.elapsedTime * 2 + WINDOWS[i].phase);
      const material = mesh.material as MeshStandardMaterial;
      material.emissiveIntensity = flicker;
    });
  });
  return (
    <>
      {WINDOWS.map((pane, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            meshes.current[i] = mesh;
          }}
          position={[pane.x, pane.y, -5.95]}
        >
          <boxGeometry args={[0.8, 1.2, 0.1]} />
          <meshStandardMaterial color="#ffcf7a" emissive="#ffb347" />
        </mesh>
      ))}
    </>
  );
}

function Fireflies({ still }: { still: boolean }) {
  const group = useRef<Group>(null);
  const spots = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        x: -14 + ((i * 53) % 28),
        y: 1 + ((i * 17) % 5) * 0.6,
        z: -2 + ((i * 29) % 12),
        phase: i * 0.7,
      })),
    [],
  );
  useFrame(({ clock }) => {
    group.current?.children.forEach((child, i) => {
      const spot = spots[i];
      const t = still ? 0 : clock.elapsedTime * 0.4 + spot.phase;
      child.position.set(spot.x + Math.sin(t) * 0.8, spot.y + Math.sin(t * 1.7) * 0.4, spot.z);
    });
  });
  return (
    <group ref={group}>
      {spots.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.07, 6, 4]} />
          <meshBasicMaterial color="#fff2a0" />
        </mesh>
      ))}
    </group>
  );
}

function Drift({ still }: { still: boolean }) {
  useFrame(({ camera, clock }) => {
    const t = still ? 0 : clock.elapsedTime * 0.06;
    camera.position.set(Math.sin(t) * 5, 4 + Math.sin(t * 0.7) * 0.4, 30 + Math.cos(t) * 1.5);
    // Looking above the tower, so it stands low in the frame, under the logo.
    camera.lookAt(0, 10.5, -4);
  });
  return null;
}

function Courtyard({ still }: { still: boolean }) {
  return (
    <>
      <color attach="background" args={['#4a3a52']} />
      <fog attach="fog" args={['#8a5a5c', 26, 70]} />
      <hemisphereLight args={['#ffd2a0', '#2c3a2c', 0.9]} />
      {/* The last of the sunset behind the halls. */}
      <mesh position={[0, 6, -40]}>
        <circleGeometry args={[34, 48]} />
        <meshBasicMaterial color="#f0a35e" transparent opacity={0.55} fog={false} />
      </mesh>
      <mesh position={[0, 3, -39]}>
        <circleGeometry args={[20, 48]} />
        <meshBasicMaterial color="#ffd08a" transparent opacity={0.5} fog={false} />
      </mesh>
      <directionalLight position={[-12, 9, 8]} intensity={1.6} color="#ffb070" />
      {/* The lawn, and a stone path to the tower. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[70, 48]} />
        <meshToonMaterial color="#3c5a3a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]}>
        <planeGeometry args={[3.2, 14]} />
        <meshToonMaterial color="#8a7a66" />
      </mesh>
      {/* The tower and its roof. */}
      <mesh position={[0, 7, -8]}>
        <boxGeometry args={[6, 14, 6]} />
        <meshToonMaterial color="#4a3c48" />
      </mesh>
      <mesh position={[0, 16.5, -8]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[5, 5, 4]} />
        <meshToonMaterial color="#5a3438" />
      </mesh>
      <Clock still={still} />
      {/* The halls either side. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 10, 0, -9]}>
          <mesh position={[0, 3.5, 0]}>
            <boxGeometry args={[10, 7, 6]} />
            <meshToonMaterial color="#3a3040" />
          </mesh>
          <mesh position={[0, 8, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]}>
            <cylinderGeometry args={[2.2, 2.2, 10, 3]} />
            <meshToonMaterial color="#5a3438" />
          </mesh>
        </group>
      ))}
      <Windows still={still} />
      {TREES.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.3, 0.4, 2, 8]} />
            <meshToonMaterial color="#5a3e2a" />
          </mesh>
          <mesh position={[0, 3.4, 0]}>
            <icosahedronGeometry args={[2, 0]} />
            <meshToonMaterial color="#c8743a" />
          </mesh>
        </group>
      ))}
      {MILLERS.map((miller, i) => (
        <Sproutling key={i} miller={miller} still={still} />
      ))}
      <Fireflies still={still} />
      <Drift still={still} />
    </>
  );
}

/** The 3D courtyard, fading in over the drawn one once its first frame is ready. */
export default function TitleScene3D({ still }: { still: boolean }) {
  const [ready, setReady] = useState(false);
  return (
    <div className={ready ? 'title-3d ready' : 'title-3d'} aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 4, 30], fov: 42 }}
        frameloop={still ? 'demand' : 'always'}
        onCreated={() => requestAnimationFrame(() => setReady(true))}
      >
        <Courtyard still={still} />
      </Canvas>
    </div>
  );
}
