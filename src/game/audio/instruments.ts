/**
 * The music's instruments, made without downloading anything: each is one note, rendered once
 * into a sample buffer by plain arithmetic (plucked strings by Karplus-Strong, mallets and
 * bells as decaying partials, winds as shaped harmonics with breath), then played back at any
 * pitch by changing its rate, as a sampler does. Rendering is pure (no Web Audio needed), so
 * it can be tested; the synthesised voices in music.ts stay as the fallback whenever a sample
 * is missing.
 */

export type Instrument =
  | 'piano'
  | 'pizzicato'
  | 'harp'
  | 'celesta'
  | 'marimba'
  | 'flute'
  | 'clarinet'
  | 'upright'
  | 'brush';

export const INSTRUMENTS: readonly Instrument[] = [
  'piano',
  'pizzicato',
  'harp',
  'celesta',
  'marimba',
  'flute',
  'clarinet',
  'upright',
  'brush',
];

/** The note each sample is rendered at: middle C, an octave lower for the bass. */
export const SAMPLE_HZ: Record<Instrument, number> = {
  piano: 261.63,
  pizzicato: 261.63,
  harp: 261.63,
  celesta: 523.25,
  marimba: 261.63,
  flute: 523.25,
  clarinet: 261.63,
  upright: 65.41,
  brush: 1,
};

/** How long each sample is, in seconds. */
const LENGTH: Record<Instrument, number> = {
  piano: 2.4,
  pizzicato: 0.7,
  harp: 2,
  celesta: 1.8,
  marimba: 1,
  flute: 1.6,
  clarinet: 1.6,
  upright: 1.2,
  brush: 0.3,
};

/** A repeatable noise source, so a sample renders the same every time. */
function noise(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 4294967296) * 2 - 1;
  };
}

/** A plucked string: a burst of noise round a delay line that loses its brightness. */
function pluck(data: Float32Array, rate: number, hz: number, damping: number, seed: number) {
  const period = Math.max(2, Math.round(rate / hz));
  const line = new Float32Array(period);
  const random = noise(seed);
  for (let i = 0; i < period; i++) line[i] = random();
  let at = 0;
  for (let i = 0; i < data.length; i++) {
    const next = (at + 1) % period;
    const value = line[at];
    line[at] = (value + line[next]) * 0.5 * damping;
    data[i] = value;
    at = next;
  }
}

/** Decaying sine partials: [ratio to the note, level, decay per second]. */
function partials(
  data: Float32Array,
  rate: number,
  hz: number,
  list: readonly (readonly [number, number, number])[],
  attack = 0.003,
) {
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    const rise = Math.min(1, t / attack);
    let value = 0;
    for (const [ratio, level, decay] of list) {
      value += Math.sin(2 * Math.PI * hz * ratio * t) * level * Math.exp(-decay * t);
    }
    data[i] = value * rise;
  }
}

/** A wind: harmonics under a slow attack and gentle vibrato, with a little breath. */
function wind(
  data: Float32Array,
  rate: number,
  hz: number,
  harmonics: readonly number[],
  breath: number,
  seed: number,
) {
  const random = noise(seed);
  let air = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    const swell = Math.min(1, t / 0.08) * Math.min(1, (data.length / rate - t) / 0.25);
    const vibrato = 1 + Math.sin(2 * Math.PI * 5 * t) * 0.004 * Math.min(1, t / 0.4);
    let value = 0;
    harmonics.forEach((level, n) => {
      value += Math.sin(2 * Math.PI * hz * (n + 1) * vibrato * t) * level;
    });
    air = air * 0.9 + random() * 0.1;
    data[i] = (value + air * breath) * swell;
  }
}

/** Renders one instrument's sample at `rate` samples a second, peaking at about 0.8. */
export function renderInstrument(name: Instrument, rate: number): Float32Array {
  const data = new Float32Array(Math.round(LENGTH[name] * rate));
  const hz = SAMPLE_HZ[name];
  switch (name) {
    case 'pizzicato':
      pluck(data, rate, hz, 0.985, 11);
      break;
    case 'harp':
      pluck(data, rate, hz, 0.997, 12);
      break;
    case 'upright':
      pluck(data, rate, hz, 0.994, 13);
      break;
    case 'celesta':
      partials(data, rate, hz, [
        [1, 1, 2.2],
        [4, 0.35, 6],
        [10.2, 0.12, 14],
      ]);
      break;
    case 'marimba':
      partials(data, rate, hz, [
        [1, 1, 4.5],
        [3.9, 0.4, 14],
        [9.2, 0.12, 30],
      ]);
      break;
    case 'piano':
      partials(
        data,
        rate,
        hz,
        [
          [1, 1, 1.4],
          [2.002, 0.55, 2.2],
          [3.004, 0.3, 3.4],
          [4.01, 0.16, 5],
          [5.02, 0.08, 7],
        ],
        0.002,
      );
      break;
    case 'flute':
      wind(data, rate, hz, [1, 0.25, 0.08], 0.06, 14);
      break;
    case 'clarinet':
      // Mostly odd harmonics: the clarinet's hollow sound.
      wind(data, rate, hz, [1, 0.04, 0.5, 0.03, 0.28, 0.02, 0.14], 0.03, 15);
      break;
    case 'brush': {
      const random = noise(16);
      let low = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / rate;
        const value = random();
        low = low * 0.6 + value * 0.4;
        // A brush is a hiss: noise with its lows taken out, swept and fading.
        data[i] = (value - low) * Math.exp(-t * 14) * Math.min(1, t / 0.01);
      }
      break;
    }
  }
  let peak = 0;
  for (const value of data) peak = Math.max(peak, Math.abs(value));
  if (peak > 0) for (let i = 0; i < data.length; i++) data[i] = (data[i] / peak) * 0.8;
  return data;
}

/** Bytes the whole set would take as raw 32-bit samples at `rate`: what it costs in memory. */
export function instrumentBytes(rate: number): number {
  return INSTRUMENTS.reduce((sum, name) => sum + Math.round(LENGTH[name] * rate) * 4, 0);
}
