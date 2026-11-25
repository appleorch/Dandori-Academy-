import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { campaignAbilities, HARD_SAFE, SAFE_RADIUS } from '../campaign/campaign';
import { UPGRADE_EFFECT } from '../campaign/upgrades';
import { useGameStore } from '../core/gameStore';
import { FIRST_DAY_WARNING } from '../story/guide';
import type { Simulation } from '../simulation/Simulation';

/** Seconds before sunset the rings appear on any day after the first. */
const LAST_MINUTE = 60;

/**
 * The story's safe rings at sunset: round the Kiln and every lit beacon, how close a
 * Sproutling must be to make it through the night. They glow in over the last minute of each
 * day, and from three minutes out on the first, when Ashwick explains them.
 */
export function SafeRings({ sim }: { sim: Simulation }) {
  const group = useRef<Group>(null);
  const { radius, from } = useMemo(() => {
    const campaign = useGameStore.getState().save.campaign;
    const gift = campaignAbilities(campaign).has('sunset') ? UPGRADE_EFFECT.sunsetRadius : 1;
    const hard = campaign.difficulty === 'hard' ? HARD_SAFE : 1;
    return {
      radius: SAFE_RADIUS * gift * hard,
      from: campaign.day === 0 ? FIRST_DAY_WARNING : LAST_MINUTE,
    };
  }, []);
  const spots = [sim.level.kiln, ...sim.beacons];
  useFrame(({ clock }) => {
    const rings = group.current;
    if (!rings) return;
    const show = sim.story && !sim.ended && sim.timeLeft <= from;
    rings.visible = show;
    if (!show) return;
    const pulse = 0.55 + Math.sin(clock.elapsedTime * 3) * 0.15;
    rings.children.forEach((ring, i) => {
      const beacon = i > 0 ? sim.beacons[i - 1] : null;
      ring.visible = beacon === null || beacon.lit;
      ring.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2 + i) * 0.015);
      const material = (ring as unknown as { material?: { opacity: number } }).material;
      if (material) material.opacity = pulse;
    });
  });
  if (!sim.story) return null;
  return (
    <group ref={group} visible={false}>
      {spots.map((spot, i) => (
        <mesh key={i} position={[spot.x, 0.12, spot.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.35, radius, 64]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
