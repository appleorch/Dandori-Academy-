import { RENDER_LEVELS, type RenderLevel } from '../core/settings';

/**
 * Auto graphics: a first guess from what the device says about itself, then a governor that
 * watches the frame rate (see `QualityGovernor`). Resolution goes down first, since it costs
 * nothing to change; only if the game is still slow at the lowest resolution does the level
 * drop, which rebuilds the scene.
 */
export interface DeviceHints {
  /** The GPU's name as WebGL reports it, or '' if hidden. */
  renderer: string;
  /** Logical CPU cores. */
  cores: number;
  /** Gigabytes of memory, where the browser says (Chromium only). */
  memory?: number;
  /** A phone or tablet. */
  touch: boolean;
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;
const DISCRETE = /nvidia|geforce|rtx|gtx|quadro|radeon (rx|pro)|radeon\(tm\) rx|arc a\d|apple m\d/i;
const WEAK_MOBILE = /mali-[gt]\d{1,2}\b|adreno \(tm\) [2-5]\d\d|powervr/i;

export function guessLevel(hints: DeviceHints): RenderLevel {
  const { renderer, cores, memory, touch } = hints;
  if (SOFTWARE.test(renderer)) return 'low';
  if ((memory !== undefined && memory <= 2) || cores <= 2) return 'low';
  if (touch) {
    if (WEAK_MOBILE.test(renderer) || (memory !== undefined && memory <= 4) || cores <= 4) {
      return 'low';
    }
    return 'medium';
  }
  if (DISCRETE.test(renderer) && cores >= 6) return 'high';
  return 'medium';
}

/** What this browser says about its device. */
export function readDeviceHints(): DeviceHints {
  let renderer = '';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (gl) {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // No WebGL details: guess from the rest.
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  let touch = false;
  try {
    touch = window.matchMedia('(pointer: coarse)').matches;
  } catch {
    // No matchMedia: treat as a desktop.
  }
  return { renderer, cores: nav.hardwareConcurrency || 4, memory: nav.deviceMemory, touch };
}

/** The level Auto is drawing at this session: guessed once, lowered by the governor. */
let autoLevel: RenderLevel | null = null;

export function currentAutoLevel(): RenderLevel {
  autoLevel ??= guessLevel(readDeviceHints());
  return autoLevel;
}

/** One level down from Auto's current one, or null at the bottom. Remembered for the session. */
export function lowerAutoLevel(): RenderLevel | null {
  const index = RENDER_LEVELS.indexOf(currentAutoLevel());
  if (index <= 0) return null;
  autoLevel = RENDER_LEVELS[index - 1];
  return autoLevel;
}

/** Frame rates the governor aims between. */
export const SLOW_FPS = 40;
export const SMOOTH_FPS = 57;
/** How far the governor may drop the resolution, as a fraction of the screen's pixels. */
export const MIN_DPR = 0.6;
export const DPR_STEP = 0.2;

export type GovernorStep = 'lower-dpr' | 'lower-level' | 'raise-dpr' | null;

/**
 * What to do after a two-second window of frames: drop the resolution when slow, then the level
 * after two slow windows at the bottom; raise the resolution again after three smooth windows.
 */
export function governorStep(
  fps: number,
  dpr: number,
  maxDpr: number,
  slowAtBottom: number,
  smoothStreak: number,
): GovernorStep {
  if (fps < SLOW_FPS) {
    if (dpr - DPR_STEP >= MIN_DPR - 1e-6) return 'lower-dpr';
    return slowAtBottom >= 1 ? 'lower-level' : null;
  }
  if (fps >= SMOOTH_FPS && smoothStreak >= 2 && dpr + DPR_STEP <= maxDpr + 1e-6) {
    return 'raise-dpr';
  }
  return null;
}
