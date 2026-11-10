import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, LatheGeometry, Object3D, Vector2, type InstancedMesh } from 'three';
import { WORKER } from '../core/config';
import type { WorkerState } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';

const BODY_PROFILE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.2, 0.04],
  [0.27, 0.22],
  [0.21, 0.46],
  [0.09, 0.66],
  [0, 0.72],
];
const SQUAD_BODY = new Color('#e8432d');
const WORKING_BODY = new Color('#a3271b');
const IDLE_BODY = new Color('#d9a79c');
const LIT_TIP = new Color('#ffd257');
const IDLE_TIP = new Color('#8fa3ad');
const dummy = new Object3D();

function bodyColor(state: WorkerState): Color {
  if (state === 'follow' || state === 'thrown') return SQUAD_BODY;
  return state === 'idle' ? IDLE_BODY : WORKING_BODY;
}

/**
 * Draws every Emberling with two instanced meshes (body and ember tip), so a full
 * field of workers costs two draw calls. Idle workers are pale with a cold tip.
 */
export function WorkerInstances({ sim }: { sim: Simulation }) {
  const bodies = useRef<InstancedMesh>(null);
  const tips = useRef<InstancedMesh>(null);
  const bodyGeometry = useMemo(
    () =>
      new LatheGeometry(
        BODY_PROFILE.map(([x, y]) => new Vector2(x, y)),
        10,
      ),
    [],
  );

  useFrame(({ clock }) => {
    const body = bodies.current;
    const tip = tips.current;
    if (!body || !tip) return;
    let index = 0;
    for (const [entity, worker] of sim.workers.entries()) {
      const { x, y, z, facing } = sim.transforms.require(entity);
      const moving = worker.state !== 'idle' && worker.state !== 'attacking';
      const hop = moving ? Math.abs(Math.sin(clock.elapsedTime * 12 + entity)) * 0.08 : 0;
      dummy.position.set(x, y + hop, z);
      dummy.rotation.set(0, facing, 0);
      dummy.updateMatrix();
      body.setMatrixAt(index, dummy.matrix);
      body.setColorAt(index, bodyColor(worker.state));
      dummy.position.y += 0.8;
      dummy.updateMatrix();
      tip.setMatrixAt(index, dummy.matrix);
      tip.setColorAt(index, worker.state === 'idle' ? IDLE_TIP : LIT_TIP);
      index++;
    }
    for (const mesh of [body, tip]) {
      mesh.count = index;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={bodies}
        args={[bodyGeometry, undefined, WORKER.maxOnField]}
        frustumCulled={false}
        castShadow
      >
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh
        ref={tips}
        args={[undefined, undefined, WORKER.maxOnField]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshBasicMaterial />
      </instancedMesh>
    </>
  );
}
