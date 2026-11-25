import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useGameStore } from '../core/gameStore';
import { decodeTrack, ghostAt } from '../modes/timeAttack';
import { splitKey } from '../save/saveManager';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

/**
 * Time Attack's ghost: the Warden's path through your fastest clear of this lesson, walked
 * again beside you as a pale figure, so you can see where you are ahead or behind. Or, raced
 * on purpose from the board, the path of another Warden's run (see ghostRace in the store).
 */
export function GhostWarden({ sim }: { sim: Simulation }) {
  const group = useRef<Group>(null);
  const track = useMemo(() => {
    const { save, playMode, settings, ghostRace } = useGameStore.getState();
    // A ghost from the board, raced on purpose, in Time Attack or a timed challenge.
    if (
      ghostRace &&
      ghostRace.level === sim.level.id &&
      ghostRace.difficulty === sim.level.difficulty
    ) {
      return ghostRace.track;
    }
    if (playMode !== 'lessons' || !settings.ghosts) return [];
    return decodeTrack(save.ghosts[splitKey(sim.level.id, sim.level.difficulty)]);
  }, [sim]);
  useFrame(({ clock }) => {
    const node = group.current;
    if (!node) return;
    const at = ghostAt(track, sim.elapsed);
    node.visible = at !== null;
    if (!at) return;
    const dx = at.x - node.position.x;
    const dz = at.z - node.position.z;
    if (Math.hypot(dx, dz) > 0.02) node.rotation.y = Math.atan2(dx, dz);
    node.position.set(
      at.x,
      heightAt(sim.level, at.x, at.z) + Math.sin(clock.elapsedTime * 3) * 0.03,
      at.z,
    );
  });
  if (track.length < 4) return null;
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.28, 0.5, 4, 10]} />
        <meshBasicMaterial color="#bfe6ff" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 16]} />
        <meshBasicMaterial color="#e8f6ff" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}
