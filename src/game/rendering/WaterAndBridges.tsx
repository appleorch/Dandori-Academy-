import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MeshStandardMaterial, Vector4, type Group } from 'three';
import type { Box } from '../navigation/NavGrid';
import type { Simulation } from '../simulation/Simulation';
import { TextSprite } from './TextSprite';
import { themeOf, type ThemeLook } from './theme';

/** Most Sproutlings whose wading rings show at once. */
const WADERS = 16;

/** What every water plane shares: the time, and where Sproutlings are wading. */
interface WaterShared {
  time: { value: number };
  waders: { value: Vector4[] };
}

/** Which sides of a box run into other water, so no foam is drawn along them: N, S, E, W. */
function openSides(box: Box, others: readonly Box[]): Vector4 {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.06;
  const overlaps = (a0: number, a1: number, b0: number, b1: number) =>
    a0 < b1 - 0.05 && b0 < a1 - 0.05;
  const side = (test: (other: Box) => boolean) =>
    others.some((o) => o !== box && test(o)) ? 1 : 0;
  const x0 = box.x - box.w / 2;
  const x1 = box.x + box.w / 2;
  const z0 = box.z - box.d / 2;
  const z1 = box.z + box.d / 2;
  return new Vector4(
    side((o) => near(o.z + o.d / 2, z0) && overlaps(x0, x1, o.x - o.w / 2, o.x + o.w / 2)),
    side((o) => near(o.z - o.d / 2, z1) && overlaps(x0, x1, o.x - o.w / 2, o.x + o.w / 2)),
    side((o) => near(o.x - o.w / 2, x1) && overlaps(z0, z1, o.z - o.d / 2, o.z + o.d / 2)),
    side((o) => near(o.x + o.w / 2, x0) && overlaps(z0, z1, o.z - o.d / 2, o.z + o.d / 2)),
  );
}

/**
 * Water: deeper and darker away from the banks, broken foam along every shore, slow ripples
 * over the surface, and rings round each Sproutling wading through it.
 */
function waterMaterial(look: ThemeLook, box: Box, open: Vector4, shared: WaterShared) {
  const material = new MeshStandardMaterial({
    color: look.water,
    emissive: look.waterGlow,
    emissiveIntensity: 0.22,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.time;
    shader.uniforms.uWaders = shared.waders;
    shader.uniforms.uBox = { value: new Vector4(box.x, box.z, box.w, box.d) };
    shader.uniforms.uOpen = { value: open };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWaterWorld;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform vec4 uWaders[${WADERS}];
        uniform vec4 uBox;
        uniform vec4 uOpen;
        varying vec3 vWaterWorld;
        float waterShore() {
          vec2 p = vWaterWorld.xz - uBox.xy;
          vec2 extent = uBox.zw * 0.5;
          float far = 1e4;
          float north = mix( p.y + extent.y, far, uOpen.x );
          float south = mix( extent.y - p.y, far, uOpen.y );
          float east = mix( extent.x - p.x, far, uOpen.z );
          float west = mix( p.x + extent.x, far, uOpen.w );
          return min( min( north, south ), min( east, west ) );
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float shore = waterShore();
        // Shallow by the banks, deep in the middle.
        float deep = smoothstep( 0.2, 2.6, shore );
        diffuseColor.rgb *= mix( vec3( 1.25, 1.2, 1.05 ), vec3( 0.62, 0.72, 0.85 ), deep );
        float ripple = sin( vWaterWorld.x * 1.3 + uTime * 1.1 ) * sin( vWaterWorld.z * 1.7 - uTime * 0.9 );
        diffuseColor.rgb *= 1.0 + ripple * 0.06;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          // Foam along the shore, broken up so it laps rather than lines the bank.
          float lap = 0.55 + 0.45 * sin( vWaterWorld.x * 2.3 + vWaterWorld.z * 1.9 + uTime * 1.6 );
          float foam = ( 1.0 - smoothstep( 0.0, 0.5 + 0.25 * lap, shore ) ) * lap;
          // Rings spreading from every Sproutling wading here.
          float rings = 0.0;
          for ( int i = 0; i < ${WADERS}; i++ ) {
            vec4 w = uWaders[i];
            if ( w.z <= 0.0 ) continue;
            float d = distance( vWaterWorld.xz, w.xy );
            rings += max( 0.0, sin( d * 7.0 - uTime * 6.0 ) ) * exp( -d * 1.3 ) * w.z;
          }
          totalEmissiveRadiance += vec3( 0.9, 0.95, 1.0 ) * ( foam * 0.55 + min( rings, 1.0 ) * 0.35 );
        }`,
      );
  };
  return material;
}

function WaterPlane({ box, material }: { box: Box; material: MeshStandardMaterial }) {
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group position={[box.x, 0, box.z]}>
      <mesh
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={material}
        receiveShadow
      >
        <planeGeometry args={[box.w, box.d]} />
      </mesh>
    </group>
  );
}

/** Planks laid across a finished bridge, rising out of the water once built. */
function BridgeDeck({ box, built }: { box: Box; built: () => boolean }) {
  const deck = useRef<Group>(null);
  const across = box.w < box.d ? 'x' : 'z';
  const planks = Math.max(3, Math.round((across === 'x' ? box.d : box.w) / 0.6));
  useFrame((_, delta) => {
    if (!deck.current) return;
    const target = built() ? 1 : 0;
    deck.current.scale.y += (target - deck.current.scale.y) * Math.min(1, delta * 4);
    deck.current.visible = deck.current.scale.y > 0.02;
  });
  return (
    <group ref={deck} position={[box.x, 0, box.z]} scale={[1, 0.001, 1]} visible={false}>
      {Array.from({ length: planks }, (_, i) => {
        const t = ((i + 0.5) / planks - 0.5) * (across === 'x' ? box.d : box.w);
        return (
          <mesh
            key={i}
            position={across === 'x' ? [0, 0.18, t] : [t, 0.18, 0]}
            rotation={[0, ((i % 3) - 1) * 0.04, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={across === 'x' ? [box.w + 1.2, 0.18, 0.5] : [0.5, 0.18, box.d + 1.2]}
            />
            <meshStandardMaterial color={i % 2 ? '#7a5a3a' : '#8a6a46'} roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Rivers, bridge sites with their log drop-off marker, and decks once built. */
export function WaterAndBridges({ sim }: { sim: Simulation }) {
  const look = themeOf(sim.level.theme);
  const water = useMemo(() => sim.level.water ?? [], [sim]);
  const shared = useMemo<WaterShared>(
    () => ({
      time: { value: 0 },
      waders: { value: Array.from({ length: WADERS }, () => new Vector4()) },
    }),
    [],
  );
  const materials = useMemo(() => {
    const all = [...water, ...sim.bridges.map((site) => site.box)];
    return new Map(all.map((box) => [box, waterMaterial(look, box, openSides(box, all), shared)]));
  }, [water, sim, look, shared]);
  useFrame(({ clock }) => {
    shared.time.value = clock.elapsedTime;
    // The Sproutlings standing in water, nearest the Warden first, make the rings.
    const slots = shared.waders.value;
    let used = 0;
    for (const [entity] of sim.workers.entries()) {
      if (used >= WADERS) break;
      const at = sim.transforms.require(entity);
      if (!sim.inWater(at.x, at.z)) continue;
      slots[used++].set(at.x, at.z, 1, 0);
    }
    for (let i = used; i < WADERS; i++) slots[i].z = 0;
  });
  return (
    <>
      {water.map(
        (box) =>
          materials.get(box) && (
            <WaterPlane
              key={`${box.x}:${box.z}`}
              box={box}
              material={materials.get(box) as MeshStandardMaterial}
            />
          ),
      )}
      {sim.bridges.map((site, index) => (
        <group key={index}>
          {materials.get(site.box) && (
            <WaterPlane box={site.box} material={materials.get(site.box) as MeshStandardMaterial} />
          )}
          <BridgeDeck box={site.box} built={() => site.built} />
          <group position={[site.bank.x, 0, site.bank.z]}>
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.1, 1.4, 32]} />
              <meshBasicMaterial color="#c9a46a" transparent opacity={0.8} toneMapped={false} />
            </mesh>
            <TextSprite
              y={2.2}
              getText={() => (site.built ? '' : `Bridge ${site.delivered}/${site.needs}`)}
            />
          </group>
        </group>
      ))}
    </>
  );
}
