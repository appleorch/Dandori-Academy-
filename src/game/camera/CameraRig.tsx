import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { InputController } from '../commands/input';
import { useGameStore } from '../core/gameStore';
import type { Feedback } from '../rendering/feedback';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

interface CameraRigProps {
  sim: Simulation;
  input: InputController;
  fx: Feedback;
}

/** How far the view leans toward where the Warden is aiming, as a share of the aim distance. */
const LOOK_AHEAD = 0.28;
/** How much closer a full camera punch brings the view, as a share of the zoom. */
const PUNCH = 0.12;
/** Co-op: the zoom needed per unit between the Wardens to keep both in view, and its limit. */
const COOP_FRAME = 0.95;
const COOP_MAX_ZOOM = 70;

/** Middle of the idle Emberlings, or the Kiln when nobody is idle: where Tab looks. */
function idleSpot(sim: Simulation): { x: number; z: number } {
  let x = 0;
  let z = 0;
  let count = 0;
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state !== 'idle') continue;
    const at = sim.transforms.require(entity);
    x += at.x;
    z += at.z;
    count++;
  }
  return count > 0 ? { x: x / count, z: z / count } : sim.level.kiln;
}

/**
 * Fixed-angle overhead camera that eases after the captain and leans a little toward
 * where it is aiming. The wheel changes the distance, big moments punch it in, hits
 * shake it, and holding Tab swings it over to the idle Emberlings. While the briefing
 * is up it circles high over the whole field, so the player sees the day's map first.
 */
export function CameraRig({ sim, input, fx }: CameraRigProps): null {
  const lean = useRef({ x: 0, z: 0 });
  const lift = useRef(0);
  // Mounted mid-day means the Warden just went down or came back up: cut, do not pan across.
  const cut = useRef(!useGameStore.getState().briefing);

  useFrame(({ camera, clock }, delta) => {
    const { level } = sim;
    if (useGameStore.getState().briefing) {
      const span = Math.max(level.width, level.depth);
      const angle = clock.elapsedTime * 0.08;
      const height = span * 0.75;
      const ease = 1 - Math.exp(-delta * 1.5);
      camera.position.x += (Math.sin(angle) * span * 0.18 - camera.position.x) * ease;
      camera.position.y += (height - camera.position.y) * ease;
      camera.position.z +=
        (height * 0.55 + Math.cos(angle) * span * 0.1 - camera.position.z) * ease;
      camera.lookAt(0, 0, 0);
      return;
    }

    // A story scene: the camera looks where the line says.
    const playing = useGameStore.getState().scene;
    const look = playing?.scene.lines[playing.line]?.camera;
    if (look && look !== 'warden') {
      const ease = 1 - Math.exp(-delta * 2);
      const spot = look === 'kiln' ? level.kiln : look === 'wide' ? { x: 0, z: 0 } : look;
      const span = Math.max(level.width, level.depth);
      const height = look === 'wide' ? span * 0.55 : 14;
      const ground = heightAt(level, spot.x, spot.z);
      camera.position.x += (spot.x - camera.position.x) * ease;
      camera.position.y += (ground + height - camera.position.y) * ease;
      camera.position.z += (spot.z + height * 0.7 - camera.position.z) * ease;
      camera.lookAt(spot.x, ground, spot.z);
      cut.current = false;
      return;
    }
    // A boss's intro: the camera swoops low over it.
    const intro = useGameStore.getState().bossIntro;
    if (intro) {
      const ease = 1 - Math.exp(-delta * 2.2);
      const swing = clock.elapsedTime * 0.35;
      const ground = heightAt(level, intro.x, intro.z);
      camera.position.x += (intro.x + Math.sin(swing) * 9 - camera.position.x) * ease;
      camera.position.y += (ground + 7 - camera.position.y) * ease;
      camera.position.z += (intro.z + 10 + Math.cos(swing) * 3 - camera.position.z) * ease;
      camera.lookAt(intro.x, ground + 1.5, intro.z);
      cut.current = false;
      return;
    }

    const captain = sim.captainTransform;
    const peek = input.peek;
    const tactical = input.tactical;
    // The tactical view looks down on the middle of the course, between it and the Warden.
    // Co-op frames both Wardens: the point between them, drawn back far enough to see both.
    const partner = sim.partnerWarden;
    const target = tactical
      ? { x: captain.x * 0.35, z: captain.z * 0.35 }
      : peek
        ? idleSpot(sim)
        : partner
          ? { x: (captain.x + partner.x) / 2, z: (captain.z + partner.z) / 2 }
          : captain;
    const apart = partner ? Math.hypot(captain.x - partner.x, captain.z - partner.z) : 0;
    // The lean is eased on its own, so a flick of the mouse does not jerk the view.
    const leanTo = peek || tactical || partner ? 0 : LOOK_AHEAD;
    const follow = 1 - Math.exp(-delta * 3);
    lean.current.x += ((sim.cursor.x - captain.x) * leanTo - lean.current.x) * follow;
    lean.current.z += ((sim.cursor.z - captain.z) * leanTo - lean.current.z) * follow;

    const ease = cut.current ? 1 : 1 - Math.exp(-delta * (tactical ? 3 : 6));
    cut.current = false;
    const overview = Math.max(level.width * 0.5, level.depth * 0.75);
    const framed = Math.min(COOP_MAX_ZOOM, Math.max(input.zoom, apart * COOP_FRAME));
    const zoom = (tactical ? overview : framed) * (1 - fx.punch * PUNCH);
    const x = target.x + lean.current.x;
    const z = target.z + lean.current.z;
    // The view rises with the ground under it, so a terrace never fills the screen.
    lift.current += (heightAt(sim.level, target.x, target.z) - lift.current) * ease;
    camera.position.x += (x - camera.position.x) * ease;
    camera.position.y += (zoom * 0.85 + lift.current - camera.position.y) * ease;
    camera.position.z += (z + zoom * 0.6 - camera.position.z) * ease;
    camera.lookAt(camera.position.x, lift.current, camera.position.z - zoom * 0.6);
    // Shake is applied after aiming, so the view jolts without drifting.
    camera.position.x += Math.sin(clock.elapsedTime * 71) * fx.shake;
    camera.position.y += Math.sin(clock.elapsedTime * 93) * fx.shake * 0.6;
  });
  return null;
}
