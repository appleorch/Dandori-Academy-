/**
 * All game audio, synthesised with Web Audio so the game ships no sound files.
 * Nothing plays until `unlock` has run inside a user gesture, as browsers require.
 */

export type SoundName =
  | 'throw'
  | 'land'
  | 'latch'
  | 'grab'
  | 'deliver'
  | 'grow'
  | 'spawn'
  | 'workerLost'
  | 'bite'
  | 'shake'
  | 'enemyDefeated'
  | 'captainHurt'
  | 'chargeWindup'
  | 'slam'
  | 'spit'
  | 'splat'
  | 'rush'
  | 'dismiss'
  | 'warning'
  | 'dayEnd';

/** Identical sounds closer together than this are dropped, so volleys do not stack up. */
const MIN_REPEAT_SECONDS = 0.045;
const STEP_SECONDS = 0.42;
const STEPS_PER_BAR = 8;

const A2 = 110;
const semitone = (base: number, steps: number): number => base * 2 ** (steps / 12);

/** A minor, F, C, G: bass note and four chord tones per bar, as semitones above A2. */
const BARS: readonly { bass: number; chord: readonly number[] }[] = [
  { bass: 0, chord: [12, 15, 19, 24] },
  { bass: -4, chord: [8, 12, 15, 20] },
  { bass: 3, chord: [10, 15, 19, 22] },
  { bass: -2, chord: [10, 14, 17, 22] },
];
const ARPEGGIO = [0, 2, 1, 2, 3, 2, 1, 2];
/** Sparse lead line over the four bars, as semitones above A2; null is a rest. */
const MELODY: readonly (number | null)[] = [
  31,
  null,
  null,
  29,
  null,
  27,
  null,
  null,
  24,
  null,
  27,
  null,
  null,
  null,
  29,
  null,
  31,
  null,
  34,
  null,
  31,
  null,
  null,
  null,
  29,
  null,
  null,
  null,
  27,
  null,
  29,
  null,
];

class AudioManager {
  private ctx: AudioContext | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private sfxVolume = 0.7;
  private musicVolume = 0.35;
  private readonly lastPlayed = new Map<SoundName, number>();
  private whistle: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;
  private musicTimer: number | null = null;
  private nextStepTime = 0;
  private step = 0;

  /** Creates the audio context. Call from a click or key press; later calls are free. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Context = window.AudioContext;
    if (!Context) return;
    const ctx = new Context();
    this.ctx = ctx;
    const limiter = ctx.createDynamicsCompressor();
    limiter.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.music = ctx.createGain();
    this.sfx.connect(limiter);
    this.music.connect(limiter);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    this.applyVolumes();
  }

  setVolumes(sfxVolume: number, musicVolume: number): void {
    this.sfxVolume = sfxVolume;
    this.musicVolume = musicVolume;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (this.sfx) this.sfx.gain.value = this.sfxVolume;
    if (this.music) this.music.gain.value = this.musicVolume;
  }

  private tone(
    out: GainNode,
    from: number,
    to: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private burst(duration: number, cutoff: number, volume: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || !this.noise) return;
    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.sfx);
    source.start(start, Math.random() * 0.5, duration + 0.02);
  }

  private notes(
    frequencies: readonly number[],
    spacing: number,
    length: number,
    volume: number,
  ): void {
    if (!this.sfx) return;
    frequencies.forEach((frequency, i) => {
      this.tone(
        this.sfx as GainNode,
        frequency,
        frequency,
        length,
        'triangle',
        volume,
        i * spacing,
      );
    });
  }

  play(name: SoundName): void {
    const ctx = this.ctx;
    const sfx = this.sfx;
    if (!ctx || !sfx || ctx.state !== 'running') return;
    const last = this.lastPlayed.get(name);
    if (last !== undefined && ctx.currentTime - last < MIN_REPEAT_SECONDS) return;
    this.lastPlayed.set(name, ctx.currentTime);

    switch (name) {
      case 'throw':
        this.tone(sfx, 520, 900, 0.09, 'sine', 0.22);
        break;
      case 'land':
        this.tone(sfx, 190, 90, 0.08, 'sine', 0.28);
        break;
      case 'latch':
        this.tone(sfx, 920, 700, 0.04, 'square', 0.07);
        break;
      case 'grab':
        this.tone(sfx, 620, 780, 0.06, 'triangle', 0.16);
        break;
      case 'deliver':
        this.notes([523, 659, 784, 1047], 0.07, 0.16, 0.28);
        break;
      case 'grow':
        this.notes([784, 988, 1175], 0.06, 0.1, 0.2);
        break;
      case 'spawn':
        this.tone(sfx, 700, 1250, 0.07, 'sine', 0.14);
        break;
      case 'workerLost':
        this.tone(sfx, 780, 230, 0.32, 'sine', 0.22);
        break;
      case 'bite':
        this.burst(0.12, 900, 0.5);
        this.tone(sfx, 120, 60, 0.15, 'square', 0.22);
        break;
      case 'shake':
        this.burst(0.35, 420, 0.45);
        break;
      case 'enemyDefeated':
        this.tone(sfx, 220, 50, 0.6, 'sawtooth', 0.26);
        this.notes([392, 523, 659], 0.09, 0.18, 0.22);
        break;
      case 'captainHurt':
        this.tone(sfx, 310, 110, 0.3, 'square', 0.26);
        this.burst(0.1, 1200, 0.3);
        break;
      case 'chargeWindup':
        this.tone(sfx, 70, 190, 0.85, 'sawtooth', 0.2);
        break;
      case 'slam':
        this.burst(0.3, 260, 0.7);
        this.tone(sfx, 95, 40, 0.3, 'sine', 0.5);
        break;
      case 'spit':
        this.tone(sfx, 480, 200, 0.16, 'sine', 0.24);
        break;
      case 'splat':
        this.burst(0.22, 700, 0.5);
        break;
      case 'rush':
        this.notes([659, 880, 1047], 0.07, 0.1, 0.22);
        break;
      case 'dismiss':
        this.notes([660, 440], 0.09, 0.12, 0.2);
        break;
      case 'warning':
        this.notes([880, 880, 880], 0.28, 0.2, 0.22);
        break;
      case 'dayEnd':
        this.notes([523, 659, 784, 1047, 1319], 0.11, 0.3, 0.24);
        break;
    }
  }

  /** The captain's whistle: a held, warbling tone for as long as `on` stays true. */
  setWhistle(on: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    if (on && !this.whistle && ctx.state === 'running') {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      const gain = ctx.createGain();
      osc.frequency.value = 1480;
      lfo.frequency.value = 13;
      depth.gain.value = 70;
      lfo.connect(depth).connect(osc.frequency);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
      osc.connect(gain).connect(this.sfx);
      osc.start();
      lfo.start();
      this.whistle = { osc, lfo, gain };
    } else if (!on && this.whistle) {
      const { osc, lfo, gain } = this.whistle;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
      osc.stop(ctx.currentTime + 0.15);
      lfo.stop(ctx.currentTime + 0.15);
      this.whistle = null;
    }
  }

  private scheduleStep(time: number): void {
    const music = this.music;
    const ctx = this.ctx;
    if (!music || !ctx) return;
    const delay = Math.max(0, time - ctx.currentTime);
    const bar = BARS[Math.floor(this.step / STEPS_PER_BAR) % BARS.length];
    const beat = this.step % STEPS_PER_BAR;
    if (beat === 0) {
      const bass = semitone(A2, bar.bass);
      this.tone(music, bass, bass, STEP_SECONDS * 7, 'sine', 0.3, delay);
    }
    const arp = semitone(A2, bar.chord[ARPEGGIO[beat]]);
    this.tone(music, arp, arp, STEP_SECONDS * 1.6, 'triangle', 0.09, delay);
    const lead = MELODY[this.step % MELODY.length];
    if (lead !== null) {
      const pitch = semitone(A2, lead);
      this.tone(music, pitch, pitch, STEP_SECONDS * 3, 'sine', 0.12, delay);
    }
    this.step++;
  }

  /** Starts the looping background tune, or does nothing if it is already playing. */
  startMusic(): void {
    const ctx = this.ctx;
    if (!ctx || this.musicTimer !== null) return;
    this.nextStepTime = ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => {
      while (this.nextStepTime < ctx.currentTime + 0.3) {
        this.scheduleStep(this.nextStepTime);
        this.nextStepTime += STEP_SECONDS;
      }
    }, 100);
  }

  stopMusic(): void {
    if (this.musicTimer === null) return;
    window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}

export const audio = new AudioManager();
