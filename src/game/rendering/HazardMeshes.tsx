import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import type { Entity } from '../core/ecs';
import { useGameStore } from '../core/gameStore';
import { HAZARDS, type HazardKind } from '../enemies/enemyKinds';
import type { Hazard } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';
import { PALETTE_SETS, type HazardColours } from './palette';

interface HazardMeshProps {
  sim: Simulation;
  entity: Entity;
  hazard: Hazard;
}

/** What each hazard looks like: its projectile, if any, and which warning colour rings its landing. */
const LOOK: Record<
  HazardKind,
  | { body: string; ring: keyof HazardColours; size: number }
  | { body: null; ring: keyof HazardColours; size: 0 }
> = {
  glob: { body: '#7d9c38', ring: 'danger', size: 0.45 },
  pebble: { body: '#8a8378', ring: 'danger', size: 0.4 },
  drip: { body: '#cfeaff', ring: 'drip', size: 0.35 },
  slam: { body: null, ring: 'danger', size: 0 },
  stomp: { body: null, ring: 'stomp', size: 0 },
  flame: { body: null, ring: 'flame', size: 0 },
  arc: { body: null, ring: 'arc', size: 0 },
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
  const palette = useGameStore((state) => state.settings.palette);
  const ring = PALETTE_SETS[palette].hazards[look.ring];

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
            color={ring}
            transparent
            opacity={0.9}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={fill}>
          <circleGeometry args={[1, 40]} />
          <meshBasicMaterial
            color={ring}
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

/** Where a repeating fixture is in its cycle: seconds since it last came round. */
function phaseOf(sim: Simulation, period: number, offset: number): number {
  if (sim.elapsed < offset) return -1;
  return (sim.elapsed - offset) % period;
}

/**
 * Flame vents: an iron grate over a glowing pit. The glow brightens as the next burst comes,
 * and when it comes a column of flame stands over the grate for a moment.
 */
function Vents({ sim }: { sim: Simulation }) {
  const flames = useRef<(Group | null)[]>([]);
  const glows = useRef<(MeshBasicMaterial | null)[]>([]);
  const vents = sim.level.vents ?? [];
  useFrame(({ clock }) => {
    vents.forEach((vent, i) => {
      const phase = phaseOf(sim, vent.period, vent.offset);
      const flight = HAZARDS.flame.flight;
      const burning = phase >= flight && phase < flight + 0.8;
      const flame = flames.current[i];
      if (flame) {
        flame.visible = burning;
        const k = burning ? (phase - flight) / 0.8 : 0;
        flame.scale.set(1, Math.max(0.05, Math.sin(k * Math.PI) * 1.2), 1);
        flame.rotation.y = clock.elapsedTime * 3;
      }
      const glow = glows.current[i];
      if (glow) glow.opacity = phase >= 0 && phase < flight ? 0.3 + (phase / flight) * 0.6 : 0.2;
    });
  });
  return (
    <>
      {vents.map((vent, i) => {
        const y = heightAt(sim.level, vent.x, vent.z);
        return (
          <group key={`${vent.x}:${vent.z}`} position={[vent.x, y, vent.z]}>
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[1.2, 24]} />
              <meshBasicMaterial
                ref={(node) => {
                  glows.current[i] = node;
                }}
                color="#ff5a1a"
                transparent
                opacity={0.2}
                toneMapped={false}
              />
            </mesh>
            {[-0.6, -0.2, 0.2, 0.6].map((x) => (
              <mesh key={x} position={[x, 0.06, 0]}>
                <boxGeometry args={[0.12, 0.08, 2]} />
                <meshStandardMaterial color="#2a2420" metalness={0.6} roughness={0.5} />
              </mesh>
            ))}
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.15, 1.35, 24]} />
              <meshStandardMaterial color="#4a3a30" metalness={0.5} roughness={0.6} />
            </mesh>
            <group
              ref={(node) => {
                flames.current[i] = node;
              }}
              visible={false}
            >
              {[0, 1, 2, 3, 4].map((k) => (
                <mesh
                  key={k}
                  position={[
                    Math.sin(k * 1.26) * 0.5 * (k ? 1 : 0),
                    1.2,
                    Math.cos(k * 1.26) * 0.5 * (k ? 1 : 0),
                  ]}
                >
                  <coneGeometry args={[k ? 0.45 : 0.7, k ? 2 : 2.8, 7]} />
                  <meshBasicMaterial
                    color={k % 2 ? '#ffd27a' : '#ff6a1a'}
                    toneMapped={false}
                    transparent
                    opacity={0.85}
                  />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
    </>
  );
}

/**
 * Spark coils: two brass pylons wound with copper. Their tops glow as a discharge builds, then
 * a jagged arc snaps across the gap between them.
 */
function Coils({ sim }: { sim: Simulation }) {
  const arcs = useRef<(Group | null)[]>([]);
  const tops = useRef<(MeshBasicMaterial | null)[]>([]);
  const coils = sim.level.coils ?? [];
  useFrame(({ clock }) => {
    coils.forEach((coil, i) => {
      const phase = phaseOf(sim, coil.period, coil.offset);
      const flight = HAZARDS.arc.flight;
      const arcing = phase >= flight && phase < flight + 0.35;
      const arc = arcs.current[i];
      if (arc) {
        arc.visible = arcing;
        // A new jag every frame it is up.
        arc.children.forEach((piece, k) => {
          piece.position.y = 1.6 + Math.sin(clock.elapsedTime * 60 + k * 2.1) * 0.25;
        });
      }
      for (const end of [0, 1]) {
        const top = tops.current[i * 2 + end];
        if (top) top.opacity = phase >= 0 && phase < flight ? 0.4 + (phase / flight) * 0.6 : 0.25;
      }
    });
  });
  return (
    <>
      {coils.map((coil, i) => {
        const dx = coil.b.x - coil.a.x;
        const dz = coil.b.z - coil.a.z;
        const length = Math.hypot(dx, dz);
        const pieces = Math.max(3, Math.round(length / 0.8));
        const angle = Math.atan2(dx, dz);
        return (
          <group key={i}>
            {[coil.a, coil.b].map((end, k) => (
              <group key={k} position={[end.x, heightAt(sim.level, end.x, end.z), end.z]}>
                <mesh position={[0, 0.8, 0]} castShadow>
                  <cylinderGeometry args={[0.18, 0.28, 1.6, 10]} />
                  <meshStandardMaterial color="#b08a48" metalness={0.8} roughness={0.35} />
                </mesh>
                {[0.4, 0.7, 1.0, 1.3].map((y) => (
                  <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.28, 0.05, 6, 16]} />
                    <meshStandardMaterial color="#c8642a" metalness={0.7} roughness={0.4} />
                  </mesh>
                ))}
                <mesh position={[0, 1.7, 0]}>
                  <sphereGeometry args={[0.2, 12, 10]} />
                  <meshBasicMaterial
                    ref={(node) => {
                      tops.current[i * 2 + k] = node;
                    }}
                    color="#fff27a"
                    transparent
                    opacity={0.25}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            ))}
            <group
              ref={(node) => {
                arcs.current[i] = node;
              }}
              position={[coil.a.x, heightAt(sim.level, coil.a.x, coil.a.z), coil.a.z]}
              rotation={[0, angle, 0]}
              visible={false}
            >
              {Array.from({ length: pieces }, (_, k) => (
                <mesh
                  key={k}
                  position={[0, 1.6, ((k + 0.5) / pieces) * length]}
                  rotation={[0, 0, k % 2 ? 0.6 : -0.6]}
                >
                  <boxGeometry args={[0.08, 0.5, length / pieces + 0.1]} />
                  <meshBasicMaterial color={[3, 2.8, 1.2]} toneMapped={false} />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
    </>
  );
}

export function HazardMeshes({ sim }: { sim: Simulation }) {
  useGameStore((state) => state.entityVersion);
  return (
    <>
      <DripSpots sim={sim} />
      <Vents sim={sim} />
      <Coils sim={sim} />
      {[...sim.hazards.entries()].map(([entity, hazard]) => (
        <HazardMesh key={entity} sim={sim} entity={entity} hazard={hazard} />
      ))}
    </>
  );
}
