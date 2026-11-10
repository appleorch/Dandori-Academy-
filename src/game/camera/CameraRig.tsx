import { useFrame } from '@react-three/fiber';
import type { InputController } from '../commands/input';
import type { Simulation } from '../simulation/Simulation';

interface CameraRigProps {
  sim: Simulation;
  input: InputController;
}

/** Fixed-angle overhead camera that eases after the captain. The wheel changes the distance. */
export function CameraRig({ sim, input }: CameraRigProps): null {
  useFrame(({ camera }, delta) => {
    const target = sim.captainTransform;
    const ease = 1 - Math.exp(-delta * 6);
    const { zoom } = input;
    camera.position.x += (target.x - camera.position.x) * ease;
    camera.position.y += (zoom * 0.85 - camera.position.y) * ease;
    camera.position.z += (target.z + zoom * 0.6 - camera.position.z) * ease;
    camera.lookAt(camera.position.x, 0, camera.position.z - zoom * 0.6);
  });
  return null;
}
