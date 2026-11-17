import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import type { Entity } from '../core/ecs';
import { useGameStore } from '../core/gameStore';
import type { HazardKind } from '../enemies/enemyKinds';
import type { Hazard } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

interface HazardMeshProps {
  sim: Simulation;
  entity: Entity;
  hazard: Hazard;
}

const LOOK: Record<
  HazardKind,
  { body: string; ring: string; size: number } | { body: null; ring: string; size: 0 }
> = {
  glob: { body: '#7d9c38', ring: '#ff5a3c', size: 0.45 },
  pebble: { body: '#8a8378', ring: '#ff5a3c', size: 0.4 },
  drip: { body: '#cfeaff', ring: '#5ab8ff', size: 0.35 },
  slam: { body: null, ring: '#ff3a2a', size: 0 },
  stomp: { body: null, ring: '#ffb02a', size: 0 },
};

/**
 * Something about to land: the projectile in the air, if there is one, and on the
 * ground the circle it will hit, filling up as impact approaches.
 */
function HazardMesh({ sim, entity, hazard }: HazardMeshProps) {
  const projectile = useRef<Mesh>(null);
  const fill = useRef<Mesh>(null);
  const marker = useRef<Group>(null);
  const look = LOOK[hazard.kind];

  useFrame(({ clock }) => {
    const at = sim.transforms.get(entity);
    const started = hazard.time >= 0;
    if (marker.current) marker.current.visible = started;
    if (projectile.current) {
      projectile.current.visible = at !== undefined && started;
      if (at) {
        // Lifted by the ground under its start and its landing spot, in proportion to the flight.
        const u = Math.max(0, Math.min(1, hazard.time / hazard.duration));
        const from = heightAt(sim.level, hazard.fromX, hazard.fromZ);
        const to = heightAt(sim.level, hazard.toX, hazard.toZ);
        projectile.current.position.set(at.x, at.y + from + (to - from) * u, at.z);
      }
    }
    if (fill.current) {
      const progress = Math.max(0, Math.min(1, hazard.time / hazard.duration));
      fill.current.scale.setScalar(Math.max(0.01, progress) * hazard.radius);
      (fill.current.material as MeshBasicMaterial).opacity =
        0.22 + (progress > 0.75 ? Math.abs(Math.sin(clock.elapsedTime * 20)) * 0.25 : 0);
    }
  });

  return (
    <>
      {look.body && (
        <mesh ref={projectile} castShadow visible={false}>
          <sphereGeometry args={[look.size, 14, 10]} />
          {hazard.kind === 'drip' ? (
            <meshPhysicalMaterial
              color={look.body}
              transparent
              opacity={0.7}
              roughness={0.05}
              clearcoat={1}
            />
          ) : (
            <meshStandardMaterial
              color={look.body}
              roughness={0.7}
              flatShading={hazard.kind === 'pebble'}
            />
          )}
        </mesh>
      )}
      <group
        ref={marker}
        position={[hazard.toX, heightAt(sim.level, hazard.toX, hazard.toZ) + 0.07, hazard.toZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <mesh>
          <ringGeometry args={[hazard.radius - 0.14, hazard.radius, 48]} />
          <meshBasicMaterial
            color={look.ring}
            transparent
            opacity={0.9}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={fill}>
          <circleGeometry args={[1, 40]} />
          <meshBasicMaterial
            color={look.ring}
            transparent
            opacity={0.25}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  );
}

/** Damp patches marking where drips fall, so the danger can be learned before it lands. */
function DripSpots({ sim }: { sim: Simulation }) {
  return (
    <>
      {(sim.level.drips ?? []).map((drip) => (
        <mesh
          key={`${drip.x}:${drip.z}`}
          position={[drip.x, heightAt(sim.level, drip.x, drip.z) + 0.03, drip.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[1.3, 32]} />
          <meshStandardMaterial
            color="#2f4a3c"
            transparent
            opacity={0.45}
            roughness={0.15}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

export function HazardMeshes({ sim }: { sim: Simulation }) {
  useGameStore((state) => state.entityVersion);
  return (
    <>
      <DripSpots sim={sim} />
      {[...sim.hazards.entries()].map(([entity, hazard]) => (
        <HazardMesh key={entity} sim={sim} entity={entity} hazard={hazard} />
      ))}
    </>
  );
}
