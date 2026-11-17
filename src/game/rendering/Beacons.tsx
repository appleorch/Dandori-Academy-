import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight } from 'three';
import type { Beacon } from '../carry/beacon';
import { BEACON } from '../core/config';
import { useGameStore } from '../core/gameStore';
import type { Point } from '../navigation/NavGrid';
import type { Simulation } from '../simulation/Simulation';
import { TextSprite } from './TextSprite';
import { themeOf } from './theme';

/**
 * A stone brazier. Cold, it shows a faint blue rune ring. Lit, it burns, lights its
 * surroundings and draws the ring that marks where hauls are delivered; in the dark,
 * a wider ring shows how far its glow reaches.
 */
function BeaconMesh({ beacon, dark }: { beacon: Beacon; dark: boolean }) {
  const flames = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const bowl = useRef<MeshStandardMaterial>(null);
  const ring = useRef<MeshBasicMaterial>(null);
  const glow = useRef<Mesh>(null);
  const level = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    level.current += ((beacon.lit ? 1 : 0) - level.current) * Math.min(1, delta * 5);
    const lit = level.current;
    if (flames.current) {
      flames.current.visible = lit > 0.03;
      flames.current.scale.setScalar(Math.max(0.01, lit));
      flames.current.children.forEach((flame, i) => {
        const lick = 0.8 + Math.sin(t * (8 + i * 2.1) + i * 1.9 + beacon.x) * 0.2;
        flame.scale.set(lick, 0.7 + lick * 0.6, lick);
      });
    }
    if (light.current) {
      light.current.intensity = lit * ((dark ? 60 : 16) + Math.sin(t * 11 + beacon.z) * 3);
    }
    if (bowl.current) bowl.current.emissiveIntensity = 0.15 + lit * 1.6;
    if (ring.current) {
      ring.current.color.set(beacon.lit ? '#ffc06a' : '#6aa8ff');
      ring.current.opacity = beacon.lit ? 0.75 : 0.35 + Math.sin(t * 2) * 0.12;
    }
    if (glow.current) glow.current.visible = dark && beacon.lit;
  });

  return (
    <group position={[beacon.x, 0, beacon.z]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.7, 1, 8]} />
        <meshStandardMaterial color="#6a6a78" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.85, 0.5, 0.4, 12]} />
        <meshStandardMaterial
          ref={bowl}
          color="#4a4046"
          emissive="#ff7a1a"
          emissiveIntensity={0.15}
          roughness={0.7}
        />
      </mesh>
      <group ref={flames} position={[0, 1.6, 0]} visible={false}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[
              Math.sin(i * 2.1) * 0.25 * (i ? 1 : 0),
              0,
              Math.cos(i * 2.1) * 0.25 * (i ? 1 : 0),
            ]}
          >
            <coneGeometry args={[i ? 0.22 : 0.34, i ? 0.8 : 1.2, 7]} />
            <meshBasicMaterial color={i % 2 ? '#ffd27a' : '#ff8a2a'} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <pointLight
        ref={light}
        position={[0, 2.2, 0]}
        color="#ffb060"
        intensity={0}
        distance={BEACON.glow * 2}
        decay={1.5}
      />
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.25, 1.5, 40]} />
        <meshBasicMaterial
          ref={ring}
          color="#6aa8ff"
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={glow} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[BEACON.glow - 0.1, BEACON.glow, 72]} />
        <meshBasicMaterial color="#ffc06a" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <TextSprite y={3} getText={() => (beacon.lit ? '' : 'Cold beacon')} color="#bcd6ff" />
    </group>
  );
}

/** The little door: a hatch in the floor with light under it and a card suit on its post. */
function SecretDoor({ at }: { at: Point }) {
  const seam = useRef<MeshBasicMaterial>(null);
  const near = useGameStore((state) => state.nearSecret);
  useFrame(({ clock }) => {
    if (seam.current) seam.current.opacity = 0.55 + Math.sin(clock.elapsedTime * 3) * 0.25;
  });
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.95, 1, 0.12, 20]} />
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </mesh>
      {[-0.4, 0, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.13, 0]}>
          <boxGeometry args={[0.04, 0.02, 1.7]} />
          <meshStandardMaterial color="#3a2a20" />
        </mesh>
      ))}
      <mesh position={[0.55, 0.16, 0]}>
        <torusGeometry args={[0.13, 0.03, 6, 14]} />
        <meshStandardMaterial color="#c9a04a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1, 1.16, 32]} />
        <meshBasicMaterial
          ref={seam}
          color="#ffcf7a"
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-1.3, 0.6, -0.6]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 1.2, 6]} />
        <meshStandardMaterial color="#4a3526" />
      </mesh>
      <mesh position={[-1.3, 1.25, -0.6]} rotation={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.55, 0.5, 0.06]} />
        <meshStandardMaterial color="#e9dcc0" roughness={0.8} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} color="#ffcf7a" intensity={6} distance={5} decay={1.6} />
      <TextSprite y={2.3} getText={() => (near ? 'Knock: E' : '')} color="#ffe6a8" />
      <TextSprite y={1.25} getText={() => '♠'} color="#2a1c1c" />
    </group>
  );
}

/** A way down: a ring of old stones round a dark stair, with cold air and blue light coming up. */
function Descent({ at }: { at: Point }) {
  const glow = useRef<MeshBasicMaterial>(null);
  const near = useGameStore((state) => state.nearDescent !== null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.opacity = 0.35 + Math.sin(clock.elapsedTime * 1.8) * 0.15;
  });
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 28]} />
        <meshBasicMaterial color="#05060b" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 1.45, 28]} />
        <meshBasicMaterial
          ref={glow}
          color="#6a8aff"
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0.35 - i * 0.3, -0.02 - i * 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.24, 1.6 - i * 0.25]} />
          <meshBasicMaterial color={i % 2 ? '#1c2030' : '#2a3048'} />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => {
        const angle = (i / 9) * Math.PI * 2 + 0.3;
        return (
          <mesh
            key={i}
            position={[Math.sin(angle) * 1.75, 0.3 + (i % 3) * 0.12, Math.cos(angle) * 1.75]}
            rotation={[0, angle, (i % 2) * 0.2]}
            castShadow
          >
            <boxGeometry args={[0.7, 0.6 + (i % 3) * 0.25, 0.5]} />
            <meshStandardMaterial
              color={i % 2 ? '#6a6e7c' : '#7c8090'}
              roughness={0.95}
              flatShading
            />
          </mesh>
        );
      })}
      <pointLight position={[0, 0.8, 0]} color="#6a8aff" intensity={5} distance={7} decay={1.6} />
      <TextSprite y={2.6} getText={() => (near ? 'Go down: E' : 'A way down')} color="#bcd0ff" />
    </group>
  );
}

/** The light the Warden carries where there is no sky. */
function Lantern({ sim, power }: { sim: Simulation; power: number }) {
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    if (!light.current) return;
    const { x, z } = sim.captainTransform;
    light.current.position.set(x, 3.6, z);
    light.current.intensity = power + Math.sin(clock.elapsedTime * 9) * power * 0.05;
  });
  return <pointLight ref={light} color="#ffd9a0" distance={30} decay={1.2} />;
}

/** Beacons, the Warden's lantern in dark places, and any little door or way down the lesson has. */
export function Beacons({ sim }: { sim: Simulation }) {
  const look = themeOf(sim.level.theme);
  return (
    <>
      {sim.beacons.map((beacon) => (
        <BeaconMesh key={`${beacon.x}:${beacon.z}`} beacon={beacon} dark={look.lantern > 0} />
      ))}
      {look.lantern > 0 && <Lantern sim={sim} power={look.lantern} />}
      {sim.level.secret && <SecretDoor at={sim.level.secret} />}
      {sim.level.descent && <Descent at={sim.level.descent} />}
    </>
  );
}
