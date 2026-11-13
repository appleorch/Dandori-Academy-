import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import type { ParticleSystem } from './particles';

const dummy = new Object3D();
const tint = new Color();

/** Draws a particle pool with a single instanced mesh. */
export function ParticleField({ particles }: { particles: ParticleSystem }) {
  const mesh = useRef<InstancedMesh>(null);

  useFrame(() => {
    const node = mesh.current;
    if (!node) return;
    for (let i = 0; i < particles.capacity; i++) {
      dummy.position.set(particles.x[i], particles.y[i], particles.z[i]);
      dummy.scale.setScalar(particles.scale[i]);
      dummy.updateMatrix();
      node.setMatrixAt(i, dummy.matrix);
      node.setColorAt(i, tint.fromArray(particles.color, i * 3));
    }
    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, particles.capacity]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}
