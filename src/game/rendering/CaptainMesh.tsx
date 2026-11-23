import { useFrame } from '@react-three/fiber';
import { useModel } from './models/modelLibrary';
import { RiggedModel } from './models/RiggedModel';
import { useRef } from 'react';
import type { Group } from 'three';
import { useGameStore } from '../core/gameStore';
import { wornOutfit } from '../progression/outfits';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

/** Radians of gait per unit walked. */
const STRIDE = 2.6;
const SPRING_K = 60;
const SPRING_D = 7;

interface Spring {
  x: number;
  v: number;
}

function stepSpring(spring: Spring, push: number, dt: number): void {
  spring.v += (-SPRING_K * spring.x - SPRING_D * spring.v + push) * dt;
  spring.x = Math.max(-0.6, Math.min(0.6, spring.x + spring.v * dt));
}

/**
 * The Warden, as a small rig in the outfit the player chose:
 *
 *   root ── hips ─┬─ legs (thigh, boot) ── stride with speed
 *                 └─ torso ─┬─ arms (sleeve, glove) ── swing against the legs
 *                           ├─ pack ── lamp on a sprung pole
 *                           ├─ coat tails ── flutter behind
 *                           └─ head ── glass dome, hat on a spring
 *
 * The body leans forward with speed and banks into turns. It blinks while invulnerable
 * after a hit.
 */
export function CaptainMesh({ sim }: { sim: Simulation }) {
  const root = useRef<Group>(null);
  const hips = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const hat = useRef<Group>(null);
  const lamp = useRef<Group>(null);
  const tails = useRef<Group>(null);
  const legs = [useRef<Group>(null), useRef<Group>(null)];
  const arms = [useRef<Group>(null), useRef<Group>(null)];
  const state = useRef({
    x: sim.captainTransform.x,
    z: sim.captainTransform.z,
    facing: sim.captainTransform.facing,
    speed: 0,
    turn: 0,
    phase: 0,
    hat: { x: 0, v: 0 },
    lamp: { x: 0, v: 0 },
    tail: { x: 0, v: 0 },
  });
  const look = useGameStore((store) => wornOutfit(store.save, store.settings.outfit));

  // A Warden model in src/assets/models/warden.glb replaces the built-in one.
  const model = useModel('warden');
  const speedRef = useRef(0);

  useFrame(({ clock }, frameDelta) => {
    const node = root.current;
    if (!node) return;
    const dt = Math.min(0.05, Math.max(0.001, frameDelta));
    const s = state.current;
    const { x, z, facing } = sim.captainTransform;
    const moved = Math.hypot(x - s.x, z - s.z);
    const speed = moved > 2 ? 0 : moved / dt;
    const accel = (speed - s.speed) / dt;
    s.speed += (speed - s.speed) * Math.min(1, dt * 10);
    s.x = x;
    s.z = z;
    s.phase += s.speed * dt * STRIDE;
    const turnBy = Math.atan2(Math.sin(facing - s.facing), Math.cos(facing - s.facing));
    const turnStep = turnBy * Math.min(1, dt * 12);
    s.facing += turnStep;
    s.turn += (turnStep / dt - s.turn) * Math.min(1, dt * 8);
    const gait = Math.min(1, s.speed / 7);
    const time = clock.elapsedTime;

    node.position.set(x, heightAt(sim.level, x, z), z);
    node.rotation.set(0, s.facing, 0);
    node.visible = Math.floor(sim.captainState.invuln * 12) % 2 === 0;
    speedRef.current = s.speed;
    if (!hips.current || !torso.current || !head.current) return;
    // Bob on each footfall; breathe when standing still.
    hips.current.position.y =
      0.42 + Math.abs(Math.sin(s.phase)) * 0.08 * gait + Math.sin(time * 2) * 0.01 * (1 - gait);
    torso.current.rotation.set(
      0.05 + 0.18 * gait,
      Math.sin(s.phase) * 0.12 * gait,
      -s.turn * 0.05 * gait,
    );
    head.current.rotation.set(-0.12 * gait, 0, s.turn * 0.03);

    legs.forEach((leg, i) => {
      if (!leg.current) return;
      const swing = Math.sin(s.phase + i * Math.PI) * 0.75 * gait;
      leg.current.rotation.x = swing;
    });
    arms.forEach((arm, i) => {
      if (!arm.current) return;
      const swing = -Math.sin(s.phase + i * Math.PI) * 0.6 * gait;
      // The lantern hand rides a little higher, held out to light the way.
      arm.current.rotation.set(swing + (i === 1 ? -0.5 : 0), 0, (i === 0 ? 1 : -1) * 0.12);
    });

    // Springs: they lag behind changes in speed and swing out on turns.
    stepSpring(s.hat, -accel * 0.02 + s.turn * 0.4, dt);
    stepSpring(s.lamp, -accel * 0.03, dt);
    stepSpring(s.tail, -accel * 0.02, dt);
    if (hat.current) hat.current.rotation.set(s.hat.x * 0.5, 0, -s.turn * 0.02 + s.hat.x * 0.2);
    if (lamp.current) lamp.current.rotation.set(s.lamp.x + Math.sin(s.phase) * 0.1 * gait, 0, 0);
    if (tails.current) {
      tails.current.rotation.x =
        0.15 + 0.5 * gait + s.tail.x * 0.6 + Math.sin(time * 9) * 0.04 * gait;
    }
  });

  if (model) {
    return (
      <group ref={root}>
        <RiggedModel model={model} speed={speedRef} />
      </group>
    );
  }

  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.42, 0]}>
        {/* Legs: trousers and boots, swinging from the hip. */}
        {[-1, 1].map((side, i) => (
          <group key={side} ref={legs[i]} position={[side * 0.15, 0, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              <capsuleGeometry args={[0.09, 0.18, 4, 10]} />
              <meshStandardMaterial color="#3a3440" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.36, 0.05]} scale={[1, 0.7, 1.4]} castShadow>
              <sphereGeometry args={[0.11, 12, 8]} />
              <meshStandardMaterial color="#4a3020" roughness={0.6} />
            </mesh>
          </group>
        ))}
        <group ref={torso}>
          {/* Coat, belt and buckle. */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <capsuleGeometry args={[0.3, 0.32, 8, 18]} />
            <meshStandardMaterial color={look.suit} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <torusGeometry args={[0.31, 0.05, 8, 24]} />
            <meshStandardMaterial color={look.trim} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.12, 0.31]}>
            <boxGeometry args={[0.1, 0.08, 0.03]} />
            <meshStandardMaterial color="#e8d07a" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* Brass buttons down the front. */}
          {[0.28, 0.42, 0.56].map((y) => (
            <mesh key={y} position={[0, y, 0.3]}>
              <sphereGeometry args={[0.025, 8, 6]} />
              <meshStandardMaterial color={look.trim} metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          {/* Coat tails flutter behind. */}
          <group ref={tails} position={[0, 0.12, -0.2]}>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.1, -0.16, -0.02]} castShadow>
                <boxGeometry args={[0.16, 0.32, 0.03]} />
                <meshStandardMaterial color={look.suit} roughness={0.6} />
              </mesh>
            ))}
          </group>
          {/* Arms: sleeves and gloves; the right hand holds the lantern. */}
          {[-1, 1].map((side, i) => (
            <group key={side} ref={arms[i]} position={[side * 0.36, 0.52, 0]}>
              <mesh position={[0, -0.16, 0]} castShadow>
                <capsuleGeometry args={[0.07, 0.2, 4, 8]} />
                <meshStandardMaterial color={look.suit} roughness={0.55} />
              </mesh>
              <mesh position={[0, -0.34, 0.02]}>
                <sphereGeometry args={[0.075, 10, 8]} />
                <meshStandardMaterial color="#6a4a36" roughness={0.7} />
              </mesh>
              {i === 1 && (
                <group position={[0, -0.46, 0.06]}>
                  <mesh>
                    <cylinderGeometry args={[0.06, 0.07, 0.14, 8]} />
                    <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, -0.02, 0]}>
                    <sphereGeometry args={[0.08, 12, 10]} />
                    <meshBasicMaterial color={look.lamp} toneMapped={false} />
                  </mesh>
                  <pointLight color={look.lamp} intensity={3} distance={5} decay={2} />
                </group>
              )}
            </group>
          ))}
          {/* Pack with a lamp on a sprung pole. */}
          <mesh position={[0, 0.38, -0.32]} castShadow>
            <boxGeometry args={[0.42, 0.46, 0.22]} />
            <meshStandardMaterial color="#6b4a2e" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.5, -0.44]}>
            <boxGeometry args={[0.3, 0.16, 0.04]} />
            <meshStandardMaterial color="#5a3a22" roughness={0.85} />
          </mesh>
          <group ref={lamp} position={[0.16, 0.6, -0.36]}>
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.015, 0.02, 0.5, 6]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.52, 0]}>
              <sphereGeometry args={[0.07, 10, 8]} />
              <meshBasicMaterial color={look.lamp} toneMapped={false} />
            </mesh>
          </group>
          {/* Head under a glass dome, with a wide-brimmed hat on a spring. */}
          <group ref={head} position={[0, 0.92, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.25, 20, 16]} />
              <meshStandardMaterial color="#f2d3b1" roughness={0.6} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.085, 0.03, 0.22]}>
                <sphereGeometry args={[0.035, 8, 6]} />
                <meshBasicMaterial color="#1c1410" />
              </mesh>
            ))}
            <mesh position={[0, -0.06, 0.24]} scale={[1, 0.5, 0.6]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshStandardMaterial color="#e2a888" roughness={0.6} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.36, 28, 20]} />
              <meshPhysicalMaterial
                color="#dff4ff"
                transparent
                opacity={0.22}
                roughness={0.05}
                clearcoat={1}
                envMapIntensity={2}
                depthWrite={false}
              />
            </mesh>
            <group ref={hat} position={[0, 0.36, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.62, 0.62, 0.04, 28]} />
                <meshStandardMaterial color={look.hat} roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.14, 0]} castShadow>
                <coneGeometry args={[0.32, 0.36, 24]} />
                <meshStandardMaterial color={look.hat} roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.3, 0.32, 0.07, 24]} />
                <meshStandardMaterial color={look.trim} roughness={0.5} />
              </mesh>
              {/* A sprig in the hatband: this is a botanical academy. */}
              <mesh position={[0.26, 0.12, 0.12]} rotation={[0, 0, -0.6]} scale={[1, 0.25, 0.5]}>
                <sphereGeometry args={[0.1, 8, 6]} />
                <meshStandardMaterial color="#6ab04a" roughness={0.6} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
