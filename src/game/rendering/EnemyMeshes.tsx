import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Sprite } from 'three';
import type { Entity } from '../core/ecs';
import { useGameStore } from '../core/gameStore';
import { HARD } from '../core/difficulty';
import { isShielded } from '../enemies/combat';
import { ENEMY_SPECS, type EnemyKind } from '../enemies/enemyKinds';
import type { Box } from '../navigation/NavGrid';
import type { Enemy } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';

const BAR_WIDTH = 2.2;
/** Seconds before a shake during which the enemy visibly shudders. */
const SHAKE_WARNING = 0.9;

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
function BellwetherBody({ r, bell }: { r: number; bell: React.Ref<Group> }) {
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
      {[-1, 1].flatMap((side) =>
        [-1, 0.6].map((along) => (
          <mesh key={`${side}:${along}`} position={[side * r * 0.55, r * 0.3, along * r * 0.7]}>
            <cylinderGeometry args={[r * 0.15, r * 0.2, r * 0.6, 8]} />
            <meshStandardMaterial color="#3a2a22" roughness={1} />
          </mesh>
        )),
      )}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * r * 0.24, r * 1.05, r * 1.4]}>
          <sphereGeometry args={[r * 0.07, 8, 6]} />
          <meshStandardMaterial color="#ffe08a" emissive="#ff4a1a" emissiveIntensity={1.6} />
        </mesh>
      ))}
    </>
  );
}

/** A wall of thorny bramble filling a gate's box. */
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
  gravelmaw: 2,
  lanternroot: 2.6,
  rootknot: 1.6,
  bellwether: 2.6,
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

  useFrame(({ clock }) => {
    const node = group.current;
    const model = body.current;
    const transform = sim.transforms.get(entity);
    if (!node || !model || !bar.current || !barGroup.current) return;
    node.visible = transform !== undefined;
    if (!transform) return;
    const time = clock.elapsedTime;
    node.position.set(transform.x, 0, transform.z);
    model.rotation.set(0, enemy.shape ? 0 : transform.facing, 0);
    model.position.set(0, 0, 0);
    model.scale.setScalar(1);

    const windingUp = enemy.state === 'windup';
    const winded = enemy.state === 'recover';
    if (spec.attack === 'bite') {
      model.rotation.x = windingUp ? -0.4 : 0;
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
    if (enemy.kind === 'rootknot') {
      const withered = enemy.hp <= 0;
      model.scale.setScalar(withered ? 0.45 : 1);
      model.rotation.z = withered ? 0.6 : 0;
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
        {enemy.kind === 'mossback' && <MossbackBody r={r} />}
        {enemy.kind === 'ramhorn' && <RamhornBody r={r} />}
        {enemy.kind === 'spitter' && <SpitterBody r={r} />}
        {enemy.kind === 'gravelmaw' && <GravelmawBody r={r} belly={belly} />}
        {enemy.kind === 'lanternroot' && <LanternrootBody r={r} />}
        {enemy.kind === 'rootknot' && <KnotBody r={r} />}
        {enemy.kind === 'bellwether' && <BellwetherBody r={r} bell={bell} />}
        {enemy.shape && <GateBody box={enemy.shape} />}
      </group>
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
      {spec.attack === 'charge' && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <mesh ref={lane} visible={false}>
            <planeGeometry args={[r * 2, chargeLength]} />
            <meshBasicMaterial
              color="#ff5a3c"
              transparent
              opacity={0.28}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
      <group ref={barGroup} position={[0, r * BAR_HEIGHT[enemy.kind] + 1, 0]}>
        <sprite scale={[BAR_WIDTH + 0.12, 0.34, 1]}>
          <spriteMaterial color="#1c1410" depthTest={false} depthWrite={false} />
        </sprite>
        <sprite ref={bar} renderOrder={1}>
          <spriteMaterial color="#e5533d" depthTest={false} depthWrite={false} />
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
