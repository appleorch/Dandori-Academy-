import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3, type Mesh } from 'three';

/**
 * Live performance figures for the F3 overlay: frame rate and frame time, what the last frame
 * drew, and how long the simulation's steps took. Smoothed, so the numbers can be read.
 */
export const perf = {
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  triangles: 0,
  /** Milliseconds spent stepping the simulation in the last frame, smoothed. */
  simMs: 0,
  steps: 0,
};

/** How quickly the smoothed figures follow the raw ones. */
const EASE = 0.1;

const ease = (from: number, to: number): number => from + (to - from) * EASE;

/** Records a frame's simulation work. Called by the game loop. */
export function recordSteps(ms: number, steps: number): void {
  perf.simMs = ease(perf.simMs, ms);
  perf.steps = steps;
}

/**
 * Inside the canvas: totals what each whole frame drew (every pass of the post-processing
 * included, which three.js would otherwise count one render at a time) and the frame time.
 */
export function PerfProbe(): null {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    // Development builds only: lets browser checks look through the scene.
    if (import.meta.env.DEV) (window as unknown as { __scene?: unknown }).__scene = scene;
  }, [scene]);
  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);
  // Runs first in each frame: what was counted since the last reset is the previous frame.
  useFrame((_, delta) => {
    perf.drawCalls = gl.info.render.calls;
    perf.triangles = gl.info.render.triangles;
    gl.info.reset();
    const ms = delta * 1000;
    perf.frameMs = ease(perf.frameMs || ms, ms);
    perf.fps = perf.frameMs > 0 ? 1000 / perf.frameMs : 0;
  }, -2);
  return null;
}

/** Parts smaller than this (world units, bounding radius) cast no shadow: eyes, teeth, trims. */
const SHADOW_MIN_RADIUS = 0.35;
/** Frames between looks for newly arrived meshes. */
const SHADOW_SCAN_FRAMES = 30;
const scale = new Vector3();

/**
 * Keeps the shadow pass to what shows in a shadow from the camera's height: every few frames,
 * meshes that arrived since the last look and are too small to cast a visible shadow stop
 * casting one. Each saves a draw call in the shadow pass.
 */
export function ShadowBudget(): null {
  const scene = useThree((state) => state.scene);
  const frame = useRef(0);
  useFrame(() => {
    if (frame.current++ % SHADOW_SCAN_FRAMES !== 0) return;
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.castShadow || mesh.userData.shadowChecked) return;
      mesh.userData.shadowChecked = true;
      // Instanced meshes stand for many objects at once; they keep their shadows.
      if ((mesh as { isInstancedMesh?: boolean }).isInstancedMesh) return;
      const geometry = mesh.geometry;
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      mesh.getWorldScale(scale);
      const radius =
        (geometry.boundingSphere?.radius ?? Infinity) * Math.max(scale.x, scale.y, scale.z);
      if (radius < SHADOW_MIN_RADIUS) mesh.castShadow = false;
    });
  });
  return null;
}
