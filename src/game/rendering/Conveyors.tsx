import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, type Texture } from 'three';
import type { Simulation } from '../simulation/Simulation';
import { CONVEYOR_SPEED } from '../world/conveyorSystem';
import { heightAt } from '../world/heightMap';

/** Chevrons painted once, scrolled along each belt in the direction it runs. */
function chevrons(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const pen = canvas.getContext('2d');
  if (!pen) return null;
  pen.fillStyle = '#3a3430';
  pen.fillRect(0, 0, 64, 64);
  pen.strokeStyle = '#d8a84a';
  pen.lineWidth = 7;
  pen.beginPath();
  pen.moveTo(12, 52);
  pen.lineTo(32, 18);
  pen.lineTo(52, 52);
  pen.stroke();
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

/** The field's conveyor belts, their chevrons running the way the belt carries. */
export function Conveyors({ sim }: { sim: Simulation }) {
  const belts = useMemo(() => sim.level.conveyors ?? [], [sim.level]);
  const textures = useMemo(
    () =>
      belts.map((belt) => {
        const base = chevrons();
        if (!base) return null;
        const length = belt.dx !== 0 ? belt.w : belt.d;
        const across = belt.dx !== 0 ? belt.d : belt.w;
        base.repeat.set(across / 2, length / 2);
        return base;
      }),
    [belts],
  );
  useEffect(() => () => textures.forEach((t: Texture | null) => t?.dispose()), [textures]);
  useFrame((_, delta) => {
    textures.forEach((texture, i) => {
      if (texture) texture.offset.y -= (delta * CONVEYOR_SPEED) / 2;
      void belts[i];
    });
  });
  return (
    <>
      {belts.map((belt, i) => {
        // The texture's chevrons point along its v axis; turn the belt so v runs with it.
        const turn = Math.atan2(belt.dx, -belt.dz) + Math.PI;
        const length = belt.dx !== 0 ? belt.w : belt.d;
        const across = belt.dx !== 0 ? belt.d : belt.w;
        return (
          <mesh
            key={i}
            position={[belt.x, heightAt(sim.level, belt.x, belt.z) + 0.04, belt.z]}
            rotation={[-Math.PI / 2, 0, turn]}
            receiveShadow
          >
            <planeGeometry args={[across, length]} />
            <meshStandardMaterial map={textures[i] ?? undefined} roughness={0.7} metalness={0.2} />
          </mesh>
        );
      })}
    </>
  );
}
