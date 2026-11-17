import { useFrame } from '@react-three/fiber';
import type { InputController } from '../commands/input';
import type { Feedback } from '../rendering/feedback';
import type { Simulation } from '../simulation/Simulation';

interface CameraRigProps {
  sim: Simulation;
  input: InputController;
  fx: Feedback;
}

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

/** Fixed-angle overhead camera that eases after the captain. The wheel changes the distance,
 * hits shake it, and holding Tab swings it over to the idle Emberlings. */
export function CameraRig({ sim, input, fx }: CameraRigProps): null {
  useFrame(({ camera, clock }, delta) => {
    const target = input.peek ? idleSpot(sim) : sim.captainTransform;
    const ease = 1 - Math.exp(-delta * 6);
    const { zoom } = input;
    camera.position.x += (target.x - camera.position.x) * ease;
    camera.position.y += (zoom * 0.85 - camera.position.y) * ease;
    camera.position.z += (target.z + zoom * 0.6 - camera.position.z) * ease;
    camera.lookAt(camera.position.x, 0, camera.position.z - zoom * 0.6);
    // Shake is applied after aiming, so the view jolts without drifting.
    camera.position.x += Math.sin(clock.elapsedTime * 71) * fx.shake;
    camera.position.y += Math.sin(clock.elapsedTime * 93) * fx.shake * 0.6;
  });
  return null;
}
