import type { LevelDefinition } from './levelTypes';

type Ground = Pick<LevelDefinition, 'plateaus' | 'ramps'>;

/**
 * The height of the ground anywhere on a level: plateau tops, ramp slopes, and zero
 * everywhere else. The rules never use it (movement is decided on the flat nav grid);
 * it is what lifts models, effects and the camera onto raised ground.
 */
export function heightAt(level: Ground, x: number, z: number): number {
  // Ramps first: one may lie on top of a lower plateau.
  for (const ramp of level.ramps ?? []) {
    const ox = x - ramp.x;
    const oz = z - ramp.z;
    if (Math.abs(ox) > ramp.w / 2 || Math.abs(oz) > ramp.d / 2) continue;
    // 0 at the foot, 1 where it meets the plateau.
    const along = ramp.dx !== 0 ? (ox * ramp.dx) / ramp.w + 0.5 : (oz * ramp.dz) / ramp.d + 0.5;
    const base = ramp.base ?? 0;
    return base + (ramp.height - base) * Math.min(1, Math.max(0, along));
  }
  // Where plateaus overlap (a tier on a tier), the highest one is the ground.
  let height = 0;
  for (const plateau of level.plateaus ?? []) {
    if (Math.abs(x - plateau.x) <= plateau.w / 2 && Math.abs(z - plateau.z) <= plateau.d / 2) {
      height = Math.max(height, plateau.height);
    }
  }
  return height;
}
