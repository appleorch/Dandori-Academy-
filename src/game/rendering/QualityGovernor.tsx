import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { DPR_STEP, governorStep, SLOW_FPS, SMOOTH_FPS } from './autoQuality';

const WINDOW_SECONDS = 2;

/**
 * Auto graphics only: keeps the frame rate up by changing the resolution, and asks for a lower
 * level (`onTooSlow`) when even the lowest resolution is too slow.
 */
export function QualityGovernor({ maxDpr, onTooSlow }: { maxDpr: number; onTooSlow: () => void }) {
  const setDpr = useThree((state) => state.setDpr);
  const dpr = useThree((state) => state.viewport.dpr);
  const stats = useRef({ time: 0, frames: 0, slowAtBottom: 0, smoothStreak: 0, settle: 2 });

  useFrame((_, delta) => {
    const w = stats.current;
    // A long gap is a pause, a hidden tab or a loading hitch, not the game's pace.
    if (delta > 0.25) return;
    w.time += delta;
    w.frames += 1;
    if (w.time < WINDOW_SECONDS) return;
    const fps = w.frames / w.time;
    w.time = 0;
    w.frames = 0;
    // The first windows after a change are shader compiles and warm-up: skip them.
    if (w.settle > 0) {
      w.settle -= 1;
      return;
    }
    const step = governorStep(fps, dpr, maxDpr, w.slowAtBottom, w.smoothStreak);
    w.smoothStreak = fps >= SMOOTH_FPS ? w.smoothStreak + 1 : 0;
    if (step === null && fps < SLOW_FPS) w.slowAtBottom += 1;
    if (step === 'lower-dpr') {
      setDpr(Math.round((dpr - DPR_STEP) * 100) / 100);
      w.settle = 1;
    } else if (step === 'raise-dpr') {
      setDpr(Math.round((dpr + DPR_STEP) * 100) / 100);
      w.smoothStreak = 0;
      w.settle = 1;
    } else if (step === 'lower-level') {
      w.slowAtBottom = 0;
      onTooSlow();
    }
  });
  return null;
}
