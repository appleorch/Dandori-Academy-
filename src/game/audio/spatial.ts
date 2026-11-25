import type { EnemyKind } from '../enemies/enemyKinds';
import type { LevelDefinition } from '../world/levelTypes';

/**
 * The world, heard: where the field's ambient sounds come from, how many of one sound may play
 * at once, and how every beast sounds. Pure data and arithmetic, so it can be tested; the
 * audio manager does the playing.
 */

/** A steady sound with a place in the world. */
export type EmitterKind = 'stream' | 'wind' | 'drip' | 'buzz' | 'crackle';

export interface Emitter {
  kind: EmitterKind;
  x: number;
  z: number;
}

/** The most emitters a field keeps going at once. */
export const MAX_EMITTERS = 14;

/**
 * Ambient emitters placed from the level's own features: water burbles along its length, a
 * hedge rustles, a drip drips, a spark coil buzzes, a flame vent crackles.
 */
export function ambientEmitters(level: LevelDefinition): Emitter[] {
  const out: Emitter[] = [];
  for (const water of level.water ?? []) {
    // A stream every 20 units along a long stretch of water, one in the middle of a pond.
    const long = Math.max(water.w, water.d);
    const count = Math.max(1, Math.round(long / 20));
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count - 0.5;
      out.push({
        kind: 'stream',
        x: water.x + (water.w >= water.d ? t * water.w : 0),
        z: water.z + (water.w < water.d ? t * water.d : 0),
      });
    }
  }
  for (const wall of level.obstacles) {
    const hedge = (wall.look ?? level.wallLook) === 'hedge';
    if (hedge && wall.w * wall.d >= 12) out.push({ kind: 'wind', x: wall.x, z: wall.z });
  }
  for (const drip of level.drips ?? []) out.push({ kind: 'drip', x: drip.x, z: drip.z });
  for (const coil of level.coils ?? [])
    out.push({ kind: 'buzz', x: (coil.a.x + coil.b.x) / 2, z: (coil.a.z + coil.b.z) / 2 });
  for (const vent of level.vents ?? []) out.push({ kind: 'crackle', x: vent.x, z: vent.z });
  return out;
}

/** The emitters nearest a point, up to the limit: the ones worth keeping going. */
export function nearestEmitters(all: readonly Emitter[], x: number, z: number): Emitter[] {
  return [...all]
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
    .slice(0, MAX_EMITTERS);
}

/** How many of one sound may ring at once; threats are always let through. */
export const SOUND_CAP = 4;

/**
 * Whether another copy of a sound may start now, given when the copies already playing end.
 * Prunes `endings` in place. A priority sound (a threat's tell) is always admitted.
 */
export function admit(endings: number[], now: number, priority: boolean): boolean {
  for (let i = endings.length - 1; i >= 0; i--) if (endings[i] <= now) endings.splice(i, 1);
  return priority || endings.length < SOUND_CAP;
}

/** What a beast says: when idle, when it notices you, as it winds up, when hurt, and dying. */
export type CreatureLine = 'idle' | 'alert' | 'tell' | 'hurt' | 'death';

export interface CreatureVoice {
  /** Base pitch, its waveform and its mouth (two formants). */
  pitch: number;
  wave: OscillatorType;
  formants: readonly [number, number];
  /** Its attack tell: a pitch glide [from, to] (times the base pitch) over `length` seconds. */
  tell: readonly [number, number, number];
}

/** Every beast's voice. Each tell is its own shape, so a beast can be told apart by ear. */
export const CREATURE_VOICES: Record<EnemyKind, CreatureVoice> = {
  mossback: { pitch: 110, wave: 'sawtooth', formants: [400, 900], tell: [1, 0.6, 0.6] },
  ramhorn: { pitch: 90, wave: 'sawtooth', formants: [300, 700], tell: [0.7, 1.6, 0.8] },
  spitter: { pitch: 220, wave: 'square', formants: [700, 1600], tell: [1, 2, 0.5] },
  gate: { pitch: 80, wave: 'triangle', formants: [200, 500], tell: [1, 1, 0.1] },
  mound: { pitch: 80, wave: 'triangle', formants: [200, 500], tell: [1, 1, 0.1] },
  gravelmaw: { pitch: 60, wave: 'sawtooth', formants: [250, 600], tell: [1.4, 0.5, 1.1] },
  lanternroot: { pitch: 160, wave: 'triangle', formants: [500, 1300], tell: [0.8, 1.5, 0.8] },
  rootknot: { pitch: 140, wave: 'triangle', formants: [400, 1000], tell: [1, 1, 0.1] },
  bellwether: { pitch: 70, wave: 'sawtooth', formants: [300, 800], tell: [1, 1.05, 1] },
  skitter: { pitch: 420, wave: 'square', formants: [1500, 3200], tell: [1.6, 1.2, 0.25] },
  snuffer: { pitch: 55, wave: 'sawtooth', formants: [220, 520], tell: [0.6, 1.3, 1.1] },
  moth: { pitch: 300, wave: 'triangle', formants: [900, 2400], tell: [1.8, 0.9, 0.7] },
  grub: { pitch: 95, wave: 'sawtooth', formants: [300, 650], tell: [0.6, 0.9, 1.1] },
  shellback: { pitch: 130, wave: 'square', formants: [450, 1100], tell: [1, 0.7, 0.5] },
  slug: { pitch: 120, wave: 'sine', formants: [350, 800], tell: [1.2, 0.8, 0.6] },
  newt: { pitch: 240, wave: 'triangle', formants: [800, 1900], tell: [1.3, 2.1, 0.4] },
  hedgehog: { pitch: 260, wave: 'square', formants: [1000, 2500], tell: [1, 1.8, 0.5] },
  mimic: { pitch: 200, wave: 'square', formants: [900, 2000], tell: [2.2, 1, 0.2] },
  waspnest: { pitch: 180, wave: 'sawtooth', formants: [800, 1800], tell: [1, 1, 0.1] },
  sparkwasp: { pitch: 520, wave: 'sawtooth', formants: [1800, 3600], tell: [1.2, 1.6, 0.3] },
  galewing: { pitch: 140, wave: 'triangle', formants: [600, 1500], tell: [2, 0.8, 1.2] },
  mirelord: { pitch: 75, wave: 'sawtooth', formants: [280, 700], tell: [0.8, 1.4, 0.9] },
  hollowwarden: { pitch: 65, wave: 'square', formants: [300, 900], tell: [1.5, 0.75, 1.1] },
};
