import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore } from '../core/gameStore';
import { GRAPHICS_LEVELS, type GraphicsLevel } from '../core/settings';

/** Frames left out at the start of the day while shaders compile and the camera swoops in. */
const WARM_UP = 90;
/** Frames measured. */
const SAMPLES = 180;
/** A median frame slower than this (under about 25 fps) lowers the graphics one level. */
const SLOW_MS = 40;
/** Slower than this (under about 16 fps) lowers it two. */
const VERY_SLOW_MS = 62;

/** The level to settle on after measuring `frames` (milliseconds each) at `current`: never higher. */
export function tunedLevel(current: GraphicsLevel, frames: readonly number[]): GraphicsLevel {
  if (frames.length === 0) return current;
  const sorted = [...frames].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const drop = median > VERY_SLOW_MS ? 2 : median > SLOW_MS ? 1 : 0;
  return GRAPHICS_LEVELS[Math.max(0, GRAPHICS_LEVELS.indexOf(current) - drop)];
}

/**
 * On a device that has never had its graphics settled, measures the first day's frame times
 * once and lowers the graphics level if the day runs slowly. It never raises a level, and once
 * the player has chosen one (see Settings.graphicsTuned) it never runs again.
 */
export function QualityTuner(): null {
  const frames = useRef<number[]>([]);
  const counted = useRef(0);
  useFrame((_, delta) => {
    const store = useGameStore.getState();
    if (store.settings.graphicsTuned) return;
    // Only time real play: menus over the field and paused days say nothing about speed.
    if (store.phase !== 'playing' || store.paused || store.briefing) return;
    if (counted.current++ < WARM_UP) return;
    frames.current.push(delta * 1000);
    if (frames.current.length < SAMPLES) return;
    const level = tunedLevel(store.settings.graphics, frames.current);
    store.updateSettings({ graphics: level, graphicsTuned: true });
    if (level !== store.settings.graphics) {
      store.say({
        text: `The day was running slowly, so the graphics are set to ${level} now. Settings can change it back.`,
        mood: 'muse',
      });
    }
  });
  return null;
}
