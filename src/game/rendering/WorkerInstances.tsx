import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, LatheGeometry, Object3D, Vector2, type InstancedMesh } from 'three';
import { WORKER } from '../core/config';
import type { WorkerState } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';

const BODY_PROFILE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.19, 0.03],
  [0.27, 0.18],
  [0.26, 0.36],
  [0.18, 0.56],
  [0.08, 0.68],
  [0, 0.71],
];
const SQUAD_BODY = new Color('#e8432d');
const WORKING_BODY = new Color('#b8301f');
const IDLE_BODY = new Color('#d9a79c');
const LIT_FLAME = new Color('#ffb02e');
const COLD_FLAME = new Color('#8fa3ad');
const EYE_WHITE = new Color('#fff8ec');
const dummy = new Object3D();
const flame = new Color();

/** Eye offsets from the body origin when facing +z: left and right. */
const EYES = [-0.09, 0.09] as const;
const EYE_HEIGHT = 0.46;
const EYE_FORWARD = 0.22;

function bodyColor(state: WorkerState): Color {
  if (state === 'follow' || state === 'thrown' || state === 'rush') return SQUAD_BODY;
  return state === 'idle' ? IDLE_BODY : WORKING_BODY;
}

/**
 * Draws every Emberling with instanced meshes: body, eyes, pupils, the stalk and
 * flickering ember on its head, and a soft contact shadow. A full field costs six
 * draw calls. Idle workers are pale with a cold ember, and dazed ones lie flat.
 */
export function WorkerInstances({ sim }: { sim: Simulation }) {
  const bodies = useRef<InstancedMesh>(null);
  const embers = useRef<InstancedMesh>(null);
  const stalks = useRef<InstancedMesh>(null);
  const eyes = useRef<InstancedMesh>(null);
  const pupils = useRef<InstancedMesh>(null);
  const blobs = useRef<InstancedMesh>(null);
  const bodyGeometry = useMemo(
    () =>
      new LatheGeometry(
        BODY_PROFILE.map(([x, y]) => new Vector2(x, y)),
        14,
      ),
    [],
  );

  useFrame(({ clock }) => {
    const body = bodies.current;
    const ember = embers.current;
    const stalk = stalks.current;
    const eye = eyes.current;
    const pupil = pupils.current;
    const blob = blobs.current;
    if (!body || !ember || !stalk || !eye || !pupil || !blob) return;
    const time = clock.elapsedTime;
    let index = 0;
    for (const [entity, worker] of sim.workers.entries()) {
      const { x, y, z, facing } = sim.transforms.require(entity);
      const dazed = worker.stun > 0;
      let hop = 0;
      if (worker.state === 'attacking') hop = Math.sin(time * 38 + entity) * 0.05;
      else if (worker.state !== 'idle') hop = Math.abs(Math.sin(time * 12 + entity)) * 0.08;
      else if (!dazed) hop = Math.abs(Math.sin(time * 2.5 + entity)) * 0.03;
      const squash = worker.state === 'thrown' ? 0.9 : 1 - hop * 0.6;
      const by = y + (dazed ? 0.2 : hop);
      // Dazed workers lie flat, which is the cue to whistle them up.
      dummy.position.set(x, by, z);
      dummy.rotation.set(dazed ? 1.45 : 0, facing, 0, 'YXZ');
      dummy.scale.set(1, squash, 1);
      dummy.updateMatrix();
      body.setMatrixAt(index, dummy.matrix);
      body.setColorAt(index, bodyColor(worker.state));
      const bodyMatrix = dummy.matrix.clone();

      // Parts are placed in the body's local space, so they lie down with it.
      dummy.position.set(0, 0.86, 0);
      dummy.rotation.set(Math.sin(time * 5 + entity) * 0.12, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stalk.setMatrixAt(index, dummy.matrix.premultiply(bodyMatrix));

      const lit = worker.state !== 'idle';
      const flicker = lit ? 1 + Math.sin(time * 17 + entity * 3.1) * 0.12 : 0.75;
      dummy.position.set(0, 1.06, 0);
      dummy.rotation.set(0, time * 2 + entity, 0);
      dummy.scale.set(flicker, flicker * 1.25, flicker);
      dummy.updateMatrix();
      ember.setMatrixAt(index, dummy.matrix.premultiply(bodyMatrix));
      ember.setColorAt(
        index,
        flame.copy(lit ? LIT_FLAME : COLD_FLAME).multiplyScalar(lit ? 2.2 : 0.9),
      );

      for (let side = 0; side < 2; side++) {
        const slot = index * 2 + side;
        const blink = (time + entity * 0.37) % 4 < 0.12 ? 0.15 : 1;
        dummy.position.set(EYES[side], EYE_HEIGHT, EYE_FORWARD);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, dazed ? 0.15 : blink, 1);
        dummy.updateMatrix();
        eye.setMatrixAt(slot, dummy.matrix.clone().premultiply(bodyMatrix));
        dummy.position.z += 0.045;
        dummy.updateMatrix();
        pupil.setMatrixAt(slot, dummy.matrix.premultiply(bodyMatrix));
      }

      const lift = Math.max(0, y);
      dummy.position.set(x, 0.02, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(Math.max(0.3, 1 - lift * 0.18));
      dummy.updateMatrix();
      blob.setMatrixAt(index, dummy.matrix);
      index++;
    }
    for (const mesh of [body, ember, stalk, blob]) {
      mesh.count = index;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (const mesh of [eye, pupil]) {
      mesh.count = index * 2;
      mesh.instanceMatrix.needsUpdate = true;
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
        <meshStandardMaterial roughness={0.45} metalness={0.05} />
      </instancedMesh>
      <instancedMesh
        ref={stalks}
        args={[undefined, undefined, WORKER.maxOnField]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.025, 0.035, 0.32, 5]} />
        <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={embers}
        args={[undefined, undefined, WORKER.maxOnField]}
        frustumCulled={false}
      >
        <coneGeometry args={[0.1, 0.24, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={eyes}
        args={[undefined, undefined, WORKER.maxOnField * 2]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.065, 10, 8]} />
        <meshStandardMaterial color={EYE_WHITE} roughness={0.2} />
      </instancedMesh>
      <instancedMesh
        ref={pupils}
        args={[undefined, undefined, WORKER.maxOnField * 2]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.033, 8, 6]} />
        <meshBasicMaterial color="#1c1410" />
      </instancedMesh>
      <instancedMesh
        ref={blobs}
        args={[undefined, undefined, WORKER.maxOnField]}
        frustumCulled={false}
      >
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
