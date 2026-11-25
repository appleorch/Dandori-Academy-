import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { DoubleSide, type Group } from 'three';
import { Rng } from '../core/rng';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

/**
 * Butterflies, out of doors: a few flutter low over the field on wandering loops. Idle
 * Sproutlings nearby notice one and hop after it (see WorkerInstances.tsx), so where they are is
 * shared here. Art only: the rules never see them.
 */

/** Where each butterfly is this frame, for the Sproutlings that chase them. */
export const butterflySpots: { x: number; z: number }[] = [];

const OUTDOORS = new Set(['meadow', 'autumn', 'marsh', 'dusk']);
const COLOURS = ['#ffd84a', '#ffffff', '#ff9ac2', '#9ad0ff', '#ffb04a'];

export function Butterflies({ sim }: { sim: Simulation }) {
  const group = useRef<Group>(null);
  const { width, depth, seed, theme } = sim.level;
  const flock = useMemo(() => {
    const rng = new Rng(seed * 29 + 5);
    const count = Math.min(10, Math.max(3, Math.round((width * depth) / 900)));
    return Array.from({ length: count }, () => ({
      x: rng.range(-width / 2.4, width / 2.4),
      z: rng.range(-depth / 2.4, depth / 2.4),
      rx: rng.range(3, 7),
      rz: rng.range(2, 6),
      speed: rng.range(0.25, 0.5),
      phase: rng.range(0, Math.PI * 2),
      colour: COLOURS[Math.floor(rng.range(0, COLOURS.length))],
    }));
  }, [width, depth, seed]);
  const outdoors = OUTDOORS.has(theme ?? 'meadow');

  useFrame(({ clock }) => {
    const node = group.current;
    butterflySpots.length = 0;
    if (!node || !outdoors) return;
    const t = clock.elapsedTime;
    node.children.forEach((child, i) => {
      const fly = flock[i];
      const a = t * fly.speed + fly.phase;
      const x = fly.x + Math.sin(a) * fly.rx + Math.sin(a * 2.3) * 0.8;
      const z = fly.z + Math.sin(a * 1.4) * fly.rz;
      const y = heightAt(sim.level, x, z) + 0.9 + Math.sin(t * 3 + i) * 0.25;
      const ahead = Math.atan2(Math.cos(a) * fly.rx, Math.cos(a * 1.4) * fly.rz * 1.4);
      child.position.set(x, y, z);
      child.rotation.set(0, ahead, 0);
      const flap = Math.sin(t * 22 + i) * 0.9;
      child.children[0].rotation.z = 0.2 + flap;
      child.children[1].rotation.z = -0.2 - flap;
      butterflySpots.push({ x, z });
    });
  });

  if (!outdoors) return null;
  return (
    <group ref={group}>
      {flock.map((fly, i) => (
        <group key={i}>
          {[1, -1].map((side) => (
            <group key={side}>
              <mesh position={[side * 0.13, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.14, 8]} />
                <meshBasicMaterial color={fly.colour} side={DoubleSide} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
