import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { OVERLAY_LAYER } from './overlay';

/** Without post-processing there is no separate overlay pass: the camera draws labels itself. */
export function OverlayInMainPass(): null {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.layers.enable(OVERLAY_LAYER);
    return () => camera.layers.disable(OVERLAY_LAYER);
  }, [camera]);
  return null;
}
