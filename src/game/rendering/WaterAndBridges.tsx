import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { MeshStandardMaterial, type Group } from 'three';
import type { Box } from '../navigation/NavGrid';
import type { Simulation } from '../simulation/Simulation';
import { TextSprite } from './TextSprite';
import { themeOf, type ThemeLook } from './theme';

/** Water that gently shimmers: one shared material whose glow pulses. */
function useWaterMaterial(look: ThemeLook): MeshStandardMaterial {
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: look.water,
        emissive: look.waterGlow,
        emissiveIntensity: 0.25,
        roughness: 0.08,
        metalness: 0.1,
        transparent: true,
        opacity: 0.88,
      }),
    [look],
  );
  useFrame(({ clock }) => {
    material.emissiveIntensity = 0.22 + Math.sin(clock.elapsedTime * 1.7) * 0.06;
  });
  return material;
}

function WaterPlane({ box, material }: { box: Box; material: MeshStandardMaterial }) {
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
      {/* Muddy banks along the long sides. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={
            box.w < box.d
              ? [side * (box.w / 2 + 0.15), 0.03, 0]
              : [0, 0.03, side * (box.d / 2 + 0.15)]
          }
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={box.w < box.d ? [0.5, box.d] : [box.w, 0.5]} />
          <meshStandardMaterial color="#6b5236" roughness={1} />
        </mesh>
      ))}
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
  const material = useWaterMaterial(themeOf(sim.level.theme));
  const water = sim.level.water ?? [];
  return (
    <>
      {water.map((box) => (
        <WaterPlane key={`${box.x}:${box.z}`} box={box} material={material} />
      ))}
      {sim.bridges.map((site, index) => (
        <group key={index}>
          <WaterPlane box={site.box} material={material} />
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
