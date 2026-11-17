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
import { themeOf } from './theme';

/** Half-width of the area the sun's shadow map covers, centred on the captain. */
const SHADOW_REACH = 32;
const air = new Color();

interface SkyLightProps {
  sim: Simulation;
  shadowMapSize: number;
}

/**
 * Sun, sky light, fog and reflections that follow the day clock and the setting, so the light
 * itself says how late it is. The sun's shadow box follows the captain, which keeps
 * shadows crisp on large maps.
 */
export function SkyLight({ sim, shadowMapSize }: SkyLightProps) {
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const { gl, scene } = useThree();
  const look = themeOf(sim.level.theme);
  const stops = useMemo(
    () =>
      look.sky.map((stop) => ({
        ...stop,
        sun: new Color(stop.sun),
        sky: new Color(stop.sky),
        bounce: new Color(stop.bounce),
        air: new Color(stop.air),
      })),
    [look],
  );

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.25;
    scene.fog = new Fog(look.sky[0].air, look.fog[0], look.fog[1]);
    return () => {
      scene.environment = null;
      scene.fog = null;
      scene.background = null;
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, look]);

  useFrame(() => {
    if (!sun.current || !hemi.current) return;
    const day = 1 - sim.timeLeft / sim.level.dayLength;
    let index = 0;
    while (index < stops.length - 2 && day > stops[index + 1].at) index++;
    const from = stops[index];
    const to = stops[index + 1];
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
