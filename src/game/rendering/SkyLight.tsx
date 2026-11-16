import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Color,
  Fog,
  Object3D,
  PMREMGenerator,
  type DirectionalLight,
  type HemisphereLight,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Simulation } from '../simulation/Simulation';

interface SkyStop {
  /** Fraction of the day elapsed. */
  at: number;
  sun: string;
  sunPower: number;
  sky: string;
  bounce: string;
  skyPower: number;
  /** Background and fog colour. */
  air: string;
}

/** Morning gold, white midday, then a long orange sunset as the day runs out. */
const STOPS: readonly SkyStop[] = [
  {
    at: 0,
    sun: '#ffd2a0',
    sunPower: 2.6,
    sky: '#cfe6ff',
    bounce: '#5d7a3a',
    skyPower: 1.1,
    air: '#9ec3d8',
  },
  {
    at: 0.2,
    sun: '#fff4e2',
    sunPower: 3.1,
    sky: '#d8ecff',
    bounce: '#6b8a42',
    skyPower: 1.25,
    air: '#a9d0e6',
  },
  {
    at: 0.65,
    sun: '#ffefd6',
    sunPower: 3,
    sky: '#d8ecff',
    bounce: '#6b8a42',
    skyPower: 1.2,
    air: '#a9d0e6',
  },
  {
    at: 0.85,
    sun: '#ffa45e',
    sunPower: 2.6,
    sky: '#f2c7a8',
    bounce: '#6a6a38',
    skyPower: 1,
    air: '#e0b08c',
  },
  {
    at: 1,
    sun: '#ff6a3c',
    sunPower: 1.9,
    sky: '#8f7fb8',
    bounce: '#4a4a3a',
    skyPower: 0.8,
    air: '#7c5f86',
  },
];
const SKY = STOPS.map((stop) => ({
  ...stop,
  sun: new Color(stop.sun),
  sky: new Color(stop.sky),
  bounce: new Color(stop.bounce),
  air: new Color(stop.air),
}));

/** Half-width of the area the sun's shadow map covers, centred on the captain. */
const SHADOW_REACH = 32;
const air = new Color();

interface SkyLightProps {
  sim: Simulation;
  shadowMapSize: number;
}

/**
 * Sun, sky light, fog and reflections that follow the day clock, so the light
 * itself says how late it is. The sun's shadow box follows the captain, which keeps
 * shadows crisp on large maps.
 */
export function SkyLight({ sim, shadowMapSize }: SkyLightProps) {
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.25;
    scene.fog = new Fog('#a9d0e6', 55, 160);
    return () => {
      scene.environment = null;
      scene.fog = null;
      scene.background = null;
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  useFrame(() => {
    if (!sun.current || !hemi.current) return;
    const day = 1 - sim.timeLeft / sim.level.dayLength;
    let index = 0;
    while (index < SKY.length - 2 && day > SKY[index + 1].at) index++;
    const from = SKY[index];
    const to = SKY[index + 1];
    const t = Math.min(1, Math.max(0, (day - from.at) / (to.at - from.at)));
    sun.current.color.lerpColors(from.sun, to.sun, t);
    sun.current.intensity = from.sunPower + (to.sunPower - from.sunPower) * t;
    hemi.current.color.lerpColors(from.sky, to.sky, t);
    hemi.current.groundColor.lerpColors(from.bounce, to.bounce, t);
    hemi.current.intensity = from.skyPower + (to.skyPower - from.skyPower) * t;
    air.lerpColors(from.air, to.air, t);
    if (scene.fog instanceof Fog) scene.fog.color.copy(air);

    const { x, z } = sim.captainTransform;
    target.position.set(x, 0, z);
    target.updateMatrixWorld();
    // The sun travels east to west and sinks toward the end of the day.
    sun.current.position.set(x + 30 - day * 60, 38 - day * day * 22, z + 18);
  });

  return (
    <>
      <primitive object={target} />
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        target={target}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-SHADOW_REACH}
        shadow-camera-right={SHADOW_REACH}
        shadow-camera-top={SHADOW_REACH}
        shadow-camera-bottom={-SHADOW_REACH}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        shadow-radius={4}
      />
    </>
  );
}
