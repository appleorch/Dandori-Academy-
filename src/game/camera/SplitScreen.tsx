import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { PerspectiveCamera } from 'three';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';
import { OVERLAY_LAYER } from '../rendering/overlay';

/** Co-op: the screen splits once the two Wardens are this far apart, and joins again closer. */
export const SPLIT_AT = 30;

/** How far apart the two Wardens stand; 0 outside co-op. */
export function wardensApart(sim: Simulation): number {
  const partner = sim.partnerWarden;
  if (!partner) return 0;
  return Math.hypot(sim.captainTransform.x - partner.x, sim.captainTransform.z - partner.z);
}

/**
 * Co-op's screen: one view framing both Wardens while they are close (the camera rig draws
 * back to fit them), and two side by side once they part, the first player's on the left. Takes
 * over drawing the frame, so it is used without the post-processing pass.
 */
export function SplitScreen({ sim, zoom }: { sim: Simulation; zoom: () => number }) {
  const { gl, scene, camera, size } = useThree();
  const second = useMemo(() => {
    const made = new PerspectiveCamera(42, 1, 1, 320);
    // Labels and markers, drawn by the camera itself without the overlay pass.
    made.layers.enable(OVERLAY_LAYER);
    return made;
  }, []);
  const view = useRef<{ x: number; z: number } | null>(null);
  useFrame((_, delta) => {
    const main = camera as PerspectiveCamera;
    const { width, height } = size;
    const partner = sim.partnerWarden;
    if (!partner || wardensApart(sim) <= SPLIT_AT) {
      view.current = null;
      gl.setScissorTest(false);
      gl.setViewport(0, 0, width, height);
      if (main.aspect !== width / height) {
        main.aspect = width / height;
        main.updateProjectionMatrix();
      }
      gl.render(scene, main);
      return;
    }
    // The second player's camera, eased after their Warden as the rig eases after the first.
    const ease = view.current ? 1 - Math.exp(-delta * 6) : 1;
    const at = view.current ?? { x: partner.x, z: partner.z };
    at.x += (partner.x - at.x) * ease;
    at.z += (partner.z - at.z) * ease;
    view.current = at;
    const distance = zoom();
    const ground = heightAt(sim.level, at.x, at.z);
    second.position.set(at.x, ground + distance * 0.85, at.z + distance * 0.6);
    second.lookAt(at.x, ground, at.z);
    const half = Math.floor(width / 2);
    main.aspect = half / height;
    main.updateProjectionMatrix();
    second.aspect = (width - half) / height;
    second.updateProjectionMatrix();
    gl.setScissorTest(true);
    gl.setViewport(0, 0, half, height);
    gl.setScissor(0, 0, half, height);
    gl.render(scene, main);
    gl.setViewport(half, 0, width - half, height);
    gl.setScissor(half, 0, width - half, height);
    gl.render(scene, second);
    gl.setScissorTest(false);
  }, 1);
  return null;
}
