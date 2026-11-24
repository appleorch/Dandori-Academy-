import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  MeshBasicMaterial,
  ShaderMaterial,
  type Group,
} from 'three';
import { Rng } from '../core/rng';
import type { Simulation } from '../simulation/Simulation';

/**
 * Weather that belongs to a setting, on top of the drifting motes every setting has (see
 * Atmosphere.tsx): low banks of mist creeping over the marsh and at dusk, and shafts of light
 * slanting through the glasshouse roof of the Terrarium.
 */

/** A soft round puff, painted once. */
function puffTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const pen = canvas.getContext('2d');
  if (!pen) return null;
  const gradient = pen.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  pen.fillStyle = gradient;
  pen.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

/** How many banks of mist, per thousand square units of field. */
const MIST_PER_AREA = 2.5;

/** Low banks of mist that creep across the field and wrap round at its edges. */
function Mist({ sim, color, opacity }: { sim: Simulation; color: string; opacity: number }) {
  const group = useRef<Group>(null);
  const { width, depth, seed } = sim.level;
  const banks = useMemo(() => {
    const rng = new Rng(seed * 71 + 9);
    const count = Math.max(4, Math.round(((width * depth) / 1000) * MIST_PER_AREA));
    return Array.from({ length: count }, () => ({
      x: rng.range(-width / 2, width / 2),
      z: rng.range(-depth / 2, depth / 2),
      y: rng.range(0.35, 1.4),
      size: rng.range(9, 20),
      speed: rng.range(0.25, 0.6),
      turn: rng.range(0, Math.PI),
    }));
  }, [width, depth, seed]);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        map: puffTexture(),
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
      }),
    [color, opacity],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    node.children.forEach((child, i) => {
      const bank = banks[i];
      bank.x += bank.speed * delta;
      if (bank.x > width / 2 + 10) bank.x = -width / 2 - 10;
      child.position.set(bank.x, bank.y, bank.z);
    });
  });
  return (
    <group ref={group}>
      {banks.map((bank, i) => (
        <mesh
          key={i}
          material={material}
          position={[bank.x, bank.y, bank.z]}
          rotation={[-Math.PI / 2, 0, bank.turn]}
          renderOrder={2}
        >
          <planeGeometry args={[bank.size, bank.size * 0.6]} />
        </mesh>
      ))}
    </group>
  );
}

/** Shafts of light through the glasshouse roof, slanting with the sun, near wherever the Warden is. */
function LightShafts({ sim }: { sim: Simulation }) {
  const group = useRef<Group>(null);
  const shafts = useMemo(() => {
    const rng = new Rng(sim.level.seed * 41 + 2);
    return Array.from({ length: 6 }, () => ({
      dx: rng.range(-22, 22),
      dz: rng.range(-16, 16),
      radius: rng.range(1.6, 3.2),
      phase: rng.range(0, Math.PI * 2),
    }));
  }, [sim.level.seed]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: { strength: { value: 0.1 } },
        vertexShader: `varying float vHeight;
          varying float vFacing;
          void main() {
            vHeight = uv.y;
            // How squarely this side of the shaft faces the camera: the edges fade to nothing.
            vFacing = abs( normalize( normalMatrix * normal ).z );
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }`,
        fragmentShader: `uniform float strength;
          varying float vHeight;
          varying float vFacing;
          void main() {
            // Brightest high up where it comes through the glass, fading to nothing at the floor,
            // and soft at the sides, so it reads as light and not as a tube.
            float alpha = strength * smoothstep( 0.15, 0.85, vHeight ) * vFacing * vFacing;
            gl_FragColor = vec4( 1.0, 0.95, 0.8, alpha );
          }`,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    const node = group.current;
    if (!node) return;
    const { x, z } = sim.captainTransform;
    node.position.set(x, 0, z);
    material.uniforms.strength.value = 0.1 + Math.sin(clock.elapsedTime * 0.3) * 0.02;
  });
  return (
    <group ref={group}>
      {shafts.map((shaft, i) => (
        <mesh
          key={i}
          material={material}
          position={[shaft.dx + 6, 14, shaft.dz]}
          rotation={[0.18, 0, -0.42]}
          renderOrder={3}
        >
          <cylinderGeometry args={[shaft.radius * 0.7, shaft.radius, 30, 16, 1, true]} />
        </mesh>
      ))}
    </group>
  );
}

/** The weather a setting has, if any, on top of its motes. */
export function Weather({ sim }: { sim: Simulation }) {
  switch (sim.level.theme) {
    case 'marsh':
      return <Mist sim={sim} color="#e6f0ea" opacity={0.07} />;
    case 'dusk':
      return <Mist sim={sim} color="#d8d0f0" opacity={0.05} />;
    case 'terrarium':
      return <LightShafts sim={sim} />;
    default:
      return null;
  }
}
