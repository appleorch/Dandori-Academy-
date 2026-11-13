import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshBasicMaterial, Sprite } from 'three';
import type { Entity } from '../core/ecs';
import { useGameStore } from '../core/gameStore';
import { ENEMY, ENEMY_SPECS } from '../enemies/enemyKinds';
import type { Enemy } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';

const BAR_WIDTH = 2.2;
/** Seconds before a shake during which the enemy visibly shudders. */
const SHAKE_WARNING = 0.9;
const CHARGE_LENGTH = ENEMY.chargeSpeed * ENEMY.chargeTime;

/** Slow grazer with a mossy shell. */
function MossbackBody({ r }: { r: number }) {
  return (
    <>
      <mesh position={[0, r * 0.7, 0]} scale={[1, 0.7, 1.15]} castShadow>
        <sphereGeometry args={[r, 20, 14]} />
        <meshStandardMaterial color="#5a4630" roughness={0.9} />
      </mesh>
      <mesh position={[0, r * 0.95, -r * 0.1]} scale={[0.9, 0.6, 1]} castShadow>
        <sphereGeometry args={[r, 12, 8]} />
        <meshStandardMaterial color="#3f7d3a" roughness={1} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * r * 0.4, r * 0.8, r * 1.02]}>
          <sphereGeometry args={[r * 0.16, 10, 8]} />
          <meshStandardMaterial color="#fff3c4" emissive="#ffb347" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </>
  );
}

/** Long, low charger with a single forward horn. */
function RamhornBody({ r }: { r: number }) {
  return (
    <>
      <mesh position={[0, r * 0.75, -r * 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[r * 0.72, r * 1.1, 6, 14]} />
        <meshStandardMaterial color="#7a3b2e" roughness={0.85} />
      </mesh>
      <mesh position={[0, r * 0.8, r * 0.95]} castShadow>
        <sphereGeometry args={[r * 0.55, 14, 10]} />
        <meshStandardMaterial color="#8f4a38" roughness={0.85} />
      </mesh>
      <mesh position={[0, r * 0.95, r * 1.65]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[r * 0.22, r * 1.1, 10]} />
        <meshStandardMaterial color="#f1e6cc" roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * r * 0.3, r * 0.98, r * 1.3]}>
          <sphereGeometry args={[r * 0.1, 8, 6]} />
          <meshStandardMaterial color="#ffe08a" emissive="#ff6a2a" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {[-1, 1].flatMap((side) =>
        [-1, 0.6].map((along) => (
          <mesh key={`${side}:${along}`} position={[side * r * 0.6, r * 0.25, along * r * 0.7]}>
            <cylinderGeometry args={[r * 0.16, r * 0.2, r * 0.5, 8]} />
            <meshStandardMaterial color="#4a241c" roughness={1} />
          </mesh>
        )),
      )}
    </>
  );
}

/** Swollen bulb with a spout that lobs globs. */
function SpitterBody({ r }: { r: number }) {
  return (
    <>
      <mesh position={[0, r * 1.05, 0]} scale={[1, 1.2, 1]} castShadow>
        <sphereGeometry args={[r, 18, 14]} />
        <meshStandardMaterial color="#6b4a8a" roughness={0.7} />
      </mesh>
      <mesh position={[0, r * 1.9, r * 0.55]} rotation={[0.7, 0, 0]} castShadow>
        <cylinderGeometry args={[r * 0.34, r * 0.22, r * 0.9, 12, 1, true]} />
        <meshStandardMaterial color="#3d2a52" roughness={0.8} side={2} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * r * 0.45, r * 1.25, r * 0.85]}>
          <sphereGeometry args={[r * 0.15, 8, 6]} />
          <meshStandardMaterial color="#f6ff9a" emissive="#b6e02a" emissiveIntensity={1} />
        </mesh>
      ))}
    </>
  );
}

interface EnemyMeshProps {
  sim: Simulation;
  entity: Entity;
  enemy: Enemy;
}

/**
 * One enemy. Every attack is telegraphed: a biter rears back, a charger paws the
 * ground and paints its charge lane, a spitter swells, and all of them shudder
 * just before shaking attackers off.
 */
function EnemyMesh({ sim, entity, enemy }: EnemyMeshProps) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const bar = useRef<Sprite>(null);
  const barGroup = useRef<Group>(null);
  const lane = useRef<Mesh>(null);
  const r = enemy.radius;
  const spec = ENEMY_SPECS[enemy.kind];
  const showHealth = useGameStore((state) => state.settings.healthBars);

  useFrame(({ clock }) => {
    const node = group.current;
    const model = body.current;
    const transform = sim.transforms.get(entity);
    if (!node || !model || !bar.current || !barGroup.current) return;
    node.visible = transform !== undefined;
    if (!transform) return;
    const time = clock.elapsedTime;
    node.position.set(transform.x, 0, transform.z);
    model.rotation.set(0, transform.facing, 0);
    model.position.set(0, 0, 0);
    model.scale.setScalar(1);

    const windingUp = enemy.state === 'windup';
    if (spec.attack === 'bite') {
      model.rotation.x = windingUp ? -0.4 : 0;
    } else if (spec.attack === 'charge') {
      if (windingUp) model.position.y = Math.abs(Math.sin(time * 18)) * 0.12;
      if (enemy.state === 'recover') model.scale.y = 0.92 + Math.sin(time * 9) * 0.05;
    } else if (windingUp) {
      model.scale.setScalar(1 + (1 - enemy.timer / spec.windup) * 0.3);
    }
    const aboutToShake =
      enemy.latched.length > 0 && enemy.shake > spec.shakeInterval - SHAKE_WARNING;
    const jitter = enemy.latched.length === 0 ? 0 : aboutToShake ? 0.14 : 0.03;
    model.position.x += Math.sin(time * 40) * jitter;

    const health = Math.max(0, enemy.hp / enemy.maxHp);
    barGroup.current.visible = showHealth && health < 1;
    bar.current.scale.set(BAR_WIDTH * health, 0.22, 1);

    if (lane.current) {
      // The lane lies in a ground-plane group whose local +y is world -z.
      lane.current.visible = windingUp;
      lane.current.rotation.z = Math.atan2(-enemy.aimX, -enemy.aimZ);
      lane.current.position.set(
        (enemy.aimX * CHARGE_LENGTH) / 2,
        (-enemy.aimZ * CHARGE_LENGTH) / 2,
        0,
      );
      (lane.current.material as MeshBasicMaterial).opacity =
        0.2 + Math.abs(Math.sin(time * 10)) * 0.2;
    }
  });

  return (
    <group ref={group}>
      <group ref={body}>
        {enemy.kind === 'mossback' && <MossbackBody r={r} />}
        {enemy.kind === 'ramhorn' && <RamhornBody r={r} />}
        {enemy.kind === 'spitter' && <SpitterBody r={r} />}
      </group>
      {spec.attack === 'charge' && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <mesh ref={lane} visible={false}>
            <planeGeometry args={[r * 2, CHARGE_LENGTH]} />
            <meshBasicMaterial color="#ff5a3c" transparent opacity={0.28} depthTest={false} />
          </mesh>
        </group>
      )}
      <group ref={barGroup} position={[0, r * 2.4 + 1, 0]}>
        <sprite scale={[BAR_WIDTH + 0.12, 0.34, 1]}>
          <spriteMaterial color="#1c1410" depthTest={false} />
        </sprite>
        <sprite ref={bar} renderOrder={1}>
          <spriteMaterial color="#e5533d" depthTest={false} />
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
