import { useLayoutEffect, type RefObject } from 'react';
import type { Object3D } from 'three';

/**
 * Render layer for labels, health bars and score popups. Post-processing renders
 * only the default layer; this one is drawn afterwards, straight to the screen, so
 * text is never blurred by the tilt-shift or smeared by bloom.
 */
export const OVERLAY_LAYER = 1;

/** Moves an object and everything under it onto the overlay layer. */
export function useOverlayLayer(ref: RefObject<Object3D | null>): void {
  useLayoutEffect(() => {
    ref.current?.traverse((object) => object.layers.set(OVERLAY_LAYER));
  }, [ref]);
}
