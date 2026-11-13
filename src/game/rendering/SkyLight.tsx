import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type AmbientLight, type DirectionalLight } from 'three';
import type { Simulation } from '../simulation/Simulation';

interface SkyStop {
  /** Fraction of the day elapsed. */
  at: number;
  sun: Color;
  sunPower: number;
  ambient: Color;
  ambientPower: number;
  sky: Color;
}

/** Morning gold, white midday, then a long orange sunset as the day runs out. */
const SKY: readonly SkyStop[] = [
  { at: 0, sun: '#ffd9a8', sunPower: 1.9, ambient: '#fff1dd', ambientPower: 1, sky: '#24382c' },
  { at: 0.2, sun: '#fff6e6', sunPower: 2.3, ambient: '#ffffff', ambientPower: 1.1, sky: '#1b2a22' },
  {
    at: 0.65,
    sun: '#fff0d8',
    sunPower: 2.3,
    ambient: '#ffffff',
    ambientPower: 1.1,
    sky: '#1b2a22',
  },
  { at: 0.85, sun: '#ffab66', sunPower: 2, ambient: '#ffd9c2', ambientPower: 0.95, sky: '#33241f' },
  { at: 1, sun: '#e8573a', sunPower: 1.4, ambient: '#b9a3d0', ambientPower: 0.8, sky: '#2a1a2e' },
].map((stop) => ({
  ...stop,
  sun: new Color(stop.sun),
  ambient: new Color(stop.ambient),
  sky: new Color(stop.sky),
}));

const sky = new Color();

/** Sun and ambient light that follow the day clock, so the light itself says how late it is. */
export function SkyLight({ sim }: { sim: Simulation }) {
  const sun = useRef<DirectionalLight>(null);
  const ambient = useRef<AmbientLight>(null);

  useFrame(({ scene }) => {
    if (!sun.current || !ambient.current) return;
    const day = 1 - sim.timeLeft / sim.level.dayLength;
    let index = 0;
    while (index < SKY.length - 2 && day > SKY[index + 1].at) index++;
    const from = SKY[index];
    const to = SKY[index + 1];
    const t = Math.min(1, Math.max(0, (day - from.at) / (to.at - from.at)));
    sun.current.color.lerpColors(from.sun, to.sun, t);
    sun.current.intensity = from.sunPower + (to.sunPower - from.sunPower) * t;
    sun.current.position.set(28 - day * 56, 42 - day * day * 26, 15);
    ambient.current.color.lerpColors(from.ambient, to.ambient, t);
    ambient.current.intensity = from.ambientPower + (to.ambientPower - from.ambientPower) * t;
    scene.background = sky.lerpColors(from.sky, to.sky, t);
  });

  return (
    <>
      <ambientLight ref={ambient} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-far={140}
      />
    </>
  );
}
