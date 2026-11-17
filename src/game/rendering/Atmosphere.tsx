import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  NormalBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Fog,
  ShaderMaterial,
  type Mesh,
  type Points,
} from 'three';
import type { Simulation } from '../simulation/Simulation';
import { themeOf } from './theme';

const MOTE_BOX = 36;
const zenith = new Color();
const deep = new Color();

/**
 * Sky dome shaded from the fog colour at the horizon to a deeper zenith, and whatever
 * the setting has in its air around the captain: pollen, falling leaves, fireflies or dust.
 */
export function Atmosphere({ sim }: { sim: Simulation }) {
  const dome = useRef<Mesh>(null);
  const motes = useRef<Points>(null);
  const look = themeOf(sim.level.theme);
  const { style, count: MOTES } = look.motes;
  const skyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { horizon: { value: new Color() }, zenith: { value: new Color() } },
        vertexShader: `varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `uniform vec3 horizon;
          uniform vec3 zenith;
          varying vec3 vDir;
          void main() {
            float t = smoothstep(-0.05, 0.6, vDir.y);
            gl_FragColor = vec4(mix(horizon, zenith, t), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  const moteGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(MOTES * 3);
    for (let i = 0; i < MOTES; i++) {
      positions[i * 3] = (Math.random() - 0.5) * MOTE_BOX;
      positions[i * 3 + 1] = 0.5 + Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * MOTE_BOX;
    }
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(MOTES * 3).fill(1), 3));
    return geometry;
  }, [MOTES]);

  useFrame(({ camera, scene, clock }, delta) => {
    if (dome.current) dome.current.position.copy(camera.position);
    if (scene.fog instanceof Fog) {
      skyMaterial.uniforms.horizon.value.copy(scene.fog.color);
      zenith.copy(scene.fog.color).lerp(deep.set(look.zenith), 0.55);
      skyMaterial.uniforms.zenith.value.copy(zenith);
    }
    const points = motes.current;
    if (!points) return;
    const { x, z } = sim.captainTransform;
    points.position.set(x, 0, z);
    const positions = moteGeometry.getAttribute('position') as BufferAttribute;
    const t = clock.elapsedTime;
    const colors = moteGeometry.getAttribute('color') as BufferAttribute;
    for (let i = 0; i < MOTES; i++) {
      let px = positions.getX(i);
      let py = positions.getY(i);
      if (style === 'leaves') {
        // Leaves fall on a slant, rocking as they go.
        px += delta * (0.9 + Math.sin(t * 1.3 + i) * 0.6);
        py -= delta * (0.55 + (i % 5) * 0.08);
        if (py < 0.1) py = 6;
      } else if (style === 'fireflies') {
        px += Math.sin(t * 0.5 + i * 1.3) * delta * 0.5;
        py += Math.cos(t * 0.6 + i * 2.1) * delta * 0.25;
        py = Math.min(3.2, Math.max(0.4, py));
        // Each one glows and fades on its own slow beat.
        const glow = Math.max(0, Math.sin(t * 1.4 + i * 2.4)) ** 2;
        colors.setXYZ(i, glow, glow, glow);
      } else {
        const drift = style === 'dust' ? 0.4 : 1;
        px += (Math.sin(t * 0.3 + i) * 0.4 + 0.25) * delta * drift;
        py += Math.sin(t * 0.7 + i * 1.7) * delta * 0.2;
        if (py > 6) py = 0.5;
      }
      if (px > MOTE_BOX / 2) px -= MOTE_BOX;
      positions.setXY(i, px, py);
    }
    if (style === 'fireflies') colors.needsUpdate = true;
    positions.needsUpdate = true;
  });

  return (
    <>
      <mesh ref={dome} material={skyMaterial} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[250, 32, 16]} />
      </mesh>
      <points ref={motes} geometry={moteGeometry} frustumCulled={false}>
        <pointsMaterial
          color={look.motes.color}
          size={look.motes.size}
          vertexColors
          transparent
          opacity={style === 'leaves' ? 0.9 : 0.75}
          blending={style === 'leaves' ? NormalBlending : AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}
