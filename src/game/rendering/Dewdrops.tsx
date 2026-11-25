import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Object3D, type InstancedMesh } from 'three';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

/** The most Dewdrops drawn at once. */
const MAX_DROPS = 48;

/**
 * Story only: Dewdrops of nectar lying on the field, bobbing and glowing a little so they read
 * from the camera. A Sproutling that walks into one drinks it and grows (see workers/growth.ts).
 */
export function Dewdrops({ sim }: { sim: Simulation }) {
  const drops = useRef<InstancedMesh>(null);
  const dummy = useRef(new Object3D());
  useFrame(({ clock }) => {
    const mesh = drops.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const count = Math.min(MAX_DROPS, sim.dewdrops.length);
    for (let i = 0; i < count; i++) {
      const drop = sim.dewdrops[i];
      const d = dummy.current;
      d.position.set(
        drop.x,
        heightAt(sim.level, drop.x, drop.z) + 0.35 + Math.sin(t * 2 + i) * 0.06,
        drop.z,
      );
      d.rotation.set(0, t * 0.8 + i, 0);
      d.scale.set(1, 1.25, 1);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });
  if (!sim.story) return null;
  return (
    <instancedMesh ref={drops} args={[undefined, undefined, MAX_DROPS]} frustumCulled={false}>
      <sphereGeometry args={[0.18, 12, 8]} />
      <meshStandardMaterial
        color="#ffd36a"
        emissive="#ffb030"
        emissiveIntensity={0.9}
        roughness={0.15}
        transparent
        opacity={0.88}
      />
    </instancedMesh>
  );
}
