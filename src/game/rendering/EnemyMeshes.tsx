import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Sprite } from 'three';
import type { Entity } from '../core/ecs';
import { useGameStore } from '../core/gameStore';
import type { Enemy } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';

const BAR_WIDTH = 2.2;

interface EnemyMeshProps {
  sim: Simulation;
  entity: Entity;
  enemy: Enemy;
}

/** A Mossback. It rears back before biting, which is the cue to get out of the way. */
function EnemyMesh({ sim, entity, enemy }: EnemyMeshProps) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const bar = useRef<Sprite>(null);
  const barGroup = useRef<Group>(null);
  const r = enemy.radius;
  const showHealth = useGameStore((state) => state.settings.healthBars);

  useFrame(({ clock }) => {
    const node = group.current;
    const transform = sim.transforms.get(entity);
    if (!node || !body.current || !bar.current || !barGroup.current) return;
    node.visible = transform !== undefined;
    if (!transform) return;
    node.position.set(transform.x, 0, transform.z);
    body.current.rotation.y = transform.facing;
    body.current.rotation.x = enemy.state === 'windup' ? -0.35 : 0;
    const shaking = enemy.latched.length > 0 ? Math.sin(clock.elapsedTime * 30) * 0.04 : 0;
    body.current.position.x = shaking;
    const health = Math.max(0, enemy.hp / enemy.maxHp);
    barGroup.current.visible = showHealth && health < 1;
    bar.current.scale.set(BAR_WIDTH * health, 0.22, 1);
  });

  return (
    <group ref={group}>
      <group ref={body}>
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
      </group>
      <group ref={barGroup} position={[0, r * 2 + 1, 0]}>
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
