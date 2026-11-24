import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../core/gameStore';
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
/** In the story, the sun takes this long to set: the last stretch of every day. */
export const STORY_SUNSET_SECONDS = 90;
/** Where sunset begins in a setting's sky stops (see theme.ts). */
const SUNSET_STOP = 0.85;
/** The canvas's exposure at full day (GameCanvas sets the same). */
const BASE_EXPOSURE = 0.92;

/**
 * How far through the day the sky is, 0 to 1. Normally the share of the day gone. In the story,
 * sunset (and the dusk after it) fills exactly the last 90 seconds, since that is when the
 * Sproutlings must be gathered in, and the rest of the day spreads over the time before it.
 */
export function dayPhase(
  sim: Pick<Simulation, 'timeLeft'> & { level: { dayLength: number } },
  story: boolean,
): number {
  const length = sim.level.dayLength;
  if (length <= 0) return 0.35;
  if (!story || length <= STORY_SUNSET_SECONDS * 2) return 1 - sim.timeLeft / length;
  if (sim.timeLeft > STORY_SUNSET_SECONDS) {
    const before = length - STORY_SUNSET_SECONDS;
    return (SUNSET_STOP * (length - sim.timeLeft)) / before;
  }
  return SUNSET_STOP + (1 - SUNSET_STOP) * (1 - sim.timeLeft / STORY_SUNSET_SECONDS);
}

export function SkyLight({ sim, shadowMapSize }: SkyLightProps) {
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const { gl, scene } = useThree();
  const look = themeOf(sim.level.theme);
  // Fixed for the day: the mode a day is played in never changes during it.
  const [story] = useState(() => useGameStore.getState().playMode === 'campaign');
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
      gl.toneMappingExposure = BASE_EXPOSURE;
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, look]);

  useFrame(() => {
    if (!sun.current || !hemi.current) return;
    const day = dayPhase(sim, story);
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
    // Evening draws in: the even light of the sky fades and the whole picture darkens a touch, so
    // the orange of the low sun is what the eye reads (otherwise the green turf swamps it).
    const dusk = Math.min(1, Math.max(0, (day - SUNSET_STOP) / (1 - SUNSET_STOP)));
    scene.environmentIntensity = 0.25 - dusk * 0.15;
    gl.toneMappingExposure = BASE_EXPOSURE - dusk * 0.2;

    const { x, z } = sim.captainTransform;
    target.position.set(x, 0, z);
    target.updateMatrixWorld();
    // The sun travels east to west and sinks toward the end of the day.
    // Low at the end of the day, so sunset throws long shadows.
    sun.current.position.set(x + 30 - day * 60, 38 - day * day * 28, z + 18);
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
