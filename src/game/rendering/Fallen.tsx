import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, Object3D, type InstancedMesh, type MeshStandardMaterial } from 'three';
import type { Simulation } from '../simulation/Simulation';
import type { DeathCause } from '../workers/squad';
import type { SproutKind } from '../workers/sprouts';
import { heightAt } from '../world/heightMap';

/**
 * The last moment of a lost Sproutling, drawn where it fell for a second or so after the rules
 * have taken it out of the world (`Simulation.fallen`): burned to ash, sinking under the water,
 * jolted by a spark, or flattened. One eaten whole leaves nothing behind. Its spirit and its cry
 * are in feedback.ts.
 */

const MAX_FALLEN = 32;
const SECONDS: Record<DeathCause, number> = {
  fire: 1.3,
  water: 1.5,
  shock: 1.1,
  crushed: 1,
  eaten: 0,
};
const BODY: Record<SproutKind, Color> = {
  ember: new Color('#e2553a'),
  dew: new Color('#5aa6e8'),
  stone: new Color('#9a8f80'),
  spark: new Color('#f0c83a'),
};
const ASH = new Color('#2a1d14');
const FLASH = new Color('#fffbe0');

interface Dying {
  x: number;
  z: number;
  kind: SproutKind;
  cause: DeathCause;
  age: number;
}

export function Fallen({ sim }: { sim: Simulation }) {
  const mesh = useRef<InstancedMesh>(null);
  const dying = useRef<Dying[]>([]);
  const seenTick = useRef(-1);
  const dummy = useRef(new Object3D());
  const tint = useRef(new Color());

  useFrame(({ clock }, delta) => {
    const bodies = mesh.current;
    if (!bodies) return;
    if (!bodies.instanceColor) {
      bodies.setColorAt(0, ASH);
      (bodies.material as MeshStandardMaterial).needsUpdate = true;
    }
    // Losses since the last frame.
    let newest = seenTick.current;
    for (const one of sim.fallen) {
      if (one.tick <= seenTick.current) continue;
      newest = Math.max(newest, one.tick);
      if (SECONDS[one.cause] > 0) dying.current.push({ ...one, age: 0 });
    }
    seenTick.current = newest;
    if (dying.current.length > MAX_FALLEN)
      dying.current.splice(0, dying.current.length - MAX_FALLEN);

    const t = clock.elapsedTime;
    const d = dummy.current;
    let count = 0;
    dying.current = dying.current.filter((one) => {
      // A slow frame never skips a last moment altogether.
      one.age += Math.min(delta, 0.1);
      const k = one.age / SECONDS[one.cause];
      if (k >= 1) return false;
      const ground = heightAt(sim.level, one.x, one.z);
      let x = one.x;
      let y = ground;
      let squashY = 1;
      let squashXZ = 1;
      let tilt = 0;
      const color = tint.current.copy(BODY[one.kind]);
      switch (one.cause) {
        case 'fire':
          // Blackens, flickers and crumbles to nothing.
          color.lerp(ASH, Math.min(1, k * 1.6));
          squashY = 1 - k * 0.85 + Math.sin(t * 40) * 0.03;
          squashXZ = 1 + k * 0.3;
          break;
        case 'water':
          // Sinks with its arms (well, its head-sprout) last to go, bobbing as it goes.
          y = ground - k * 0.8 + Math.sin(one.age * 9) * 0.05 * (1 - k);
          tilt = 0.4 * k;
          break;
        case 'shock':
          // Rigid and flashing for a moment, then it keels over.
          if (k < 0.55) {
            x += Math.sin(t * 90) * 0.04;
            if (Math.sin(t * 50) > 0) color.lerp(FLASH, 0.8);
            squashXZ = 0.9;
            squashY = 1.08;
          } else {
            color.lerp(ASH, 0.5);
            tilt = Math.min(1.5, (k - 0.55) * 6);
          }
          break;
        default:
          // Flattened at once, then gone.
          squashY = 0.18;
          squashXZ = 1.5;
          break;
      }
      const fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      // The egg is centred on its middle: lift it so it stands on the ground.
      d.position.set(x, y + 0.36 * squashY * fade, one.z);
      d.rotation.set(tilt, 0, 0);
      d.scale.set(0.27 * squashXZ * fade, 0.36 * squashY * fade, 0.27 * squashXZ * fade);
      d.updateMatrix();
      bodies.setMatrixAt(count, d.matrix);
      bodies.setColorAt(count, color);
      count++;
      return true;
    });
    bodies.count = count;
    bodies.instanceMatrix.needsUpdate = true;
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX_FALLEN]} frustumCulled={false}>
      {/* A body-shaped egg, standing on its base. */}
      <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}
