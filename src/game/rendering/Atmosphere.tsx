import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
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

const MOTES = 160;
const MOTE_BOX = 36;
const zenith = new Color();

/**
 * Sky dome shaded from the fog colour at the horizon to a deeper zenith, and
 * pollen motes drifting in the light around the captain.
 */
export function Atmosphere({ sim }: { sim: Simulation }) {
  const dome = useRef<Mesh>(null);
  const motes = useRef<Points>(null);
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
    return geometry;
  }, []);

  useFrame(({ camera, scene, clock }, delta) => {
    if (dome.current) dome.current.position.copy(camera.position);
    if (scene.fog instanceof Fog) {
      skyMaterial.uniforms.horizon.value.copy(scene.fog.color);
      zenith.copy(scene.fog.color).lerp(new Color('#3f7fa8'), 0.55);
      skyMaterial.uniforms.zenith.value.copy(zenith);
    }
    const points = motes.current;
    if (!points) return;
    const { x, z } = sim.captainTransform;
    points.position.set(x, 0, z);
    const positions = moteGeometry.getAttribute('position') as BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < MOTES; i++) {
      let px = positions.getX(i) + Math.sin(t * 0.3 + i) * delta * 0.4 + delta * 0.25;
      let py = positions.getY(i) + Math.sin(t * 0.7 + i * 1.7) * delta * 0.2;
      if (px > MOTE_BOX / 2) px -= MOTE_BOX;
      if (py > 6) py = 0.5;
      positions.setXY(i, px, py);
    }
    positions.needsUpdate = true;
  });

  return (
    <>
      <mesh ref={dome} material={skyMaterial} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[250, 32, 16]} />
      </mesh>
      <points ref={motes} geometry={moteGeometry} frustumCulled={false}>
        <pointsMaterial
          color="#fff3c4"
          size={0.09}
          transparent
          opacity={0.75}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}
