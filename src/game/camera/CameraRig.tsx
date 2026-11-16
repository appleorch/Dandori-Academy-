import { useFrame } from '@react-three/fiber';
import type { InputController } from '../commands/input';
import type { Feedback } from '../rendering/feedback';
import type { Simulation } from '../simulation/Simulation';

interface CameraRigProps {
  sim: Simulation;
  input: InputController;
  fx: Feedback;
}

/** Fixed-angle overhead camera that eases after the captain. The wheel changes the distance,
 * and hits shake it. */
export function CameraRig({ sim, input, fx }: CameraRigProps): null {
  useFrame(({ camera, clock }, delta) => {
    const target = sim.captainTransform;
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
