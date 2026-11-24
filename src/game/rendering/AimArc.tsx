import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Object3D, type InstancedMesh } from 'three';
import { THROW } from '../core/config';
import { useGameStore } from '../core/gameStore';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

const DOTS = 12;
const dummy = new Object3D();

/**
 * Dotted preview of the arc a thrown worker will follow to the cursor. It shows while there is
 * someone to throw and the whistle is not blowing, or always if the player asked for that.
 */
export function AimArc({ sim }: { sim: Simulation }) {
  const mesh = useRef<InstancedMesh>(null);
  const always = useGameStore((state) => state.settings.alwaysShowArc);

  useFrame(({ clock }) => {
    const node = mesh.current;
    if (!node) return;
    node.visible = always || (sim.squadSize > 0 && sim.captainState.whistleRadius === 0);
    if (!node.visible) return;
    const from = sim.captainTransform;
    const slide = (clock.elapsedTime * 1.5) % 1;
    const low = heightAt(sim.level, from.x, from.z);
    const high = heightAt(sim.level, sim.cursor.x, sim.cursor.z);
    for (let i = 0; i < DOTS; i++) {
      const u = (i + slide) / DOTS;
      dummy.position.set(
        from.x + (sim.cursor.x - from.x) * u,
        0.6 + low + (high - low) * u + 4 * THROW.arcHeight * u * (1 - u),
        from.z + (sim.cursor.z - from.z) * u,
      );
      dummy.scale.setScalar(0.5 + 0.5 * Math.sin(u * Math.PI));
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
    }
    node.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, DOTS]} frustumCulled={false}>
      <sphereGeometry args={[0.11, 8, 6]} />
      <meshBasicMaterial color="#fff6dc" transparent opacity={0.65} depthWrite={false} />
    </instancedMesh>
  );
}
