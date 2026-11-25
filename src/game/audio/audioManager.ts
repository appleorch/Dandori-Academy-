import type { SproutKind } from '../workers/sprouts';
import { MusicPlayer, type DayPhase, type Intensity, type Motif, type TrackName } from './music';

/**
 * All game audio, synthesised with Web Audio so the game ships no sound files.
 * Nothing plays until `unlock` has run inside a user gesture, as browsers require.
 *
 * Effects go through a small mixer: each sound is panned by where it happened, a
 * share of it is sent to a reverb whose size depends on the setting, and a looping
 * ambience (birds, wind, crickets, dripping rock) sits underneath.
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
  | 'splash'
  | 'slamWindup'
  | 'stomp'
  | 'phase'
  | 'gateBroken'
  | 'shieldDown'
  | 'regrow'
  | 'bloom'
  | 'wilt'
  | 'dug'
  | 'crack'
  | 'sap'
  | 'twin'
  | 'logPlaced'
  | 'bridgeBuilt'
  | 'beaconLit'
  | 'chain'
  | 'rescued'
  | 'burned'
  | 'pluck'
  | 'nectar'
  | 'bossSting'
  | 'drowned'
  | 'ignite'
  | 'zap'
  | 'flare'
  | 'select'
  | 'snuff'
  | 'warning'
  | 'tick'
  | 'dayEnd'
  | 'rankCopper'
  | 'rankBronze'
  | 'rankSilver'
  | 'rankGold'
  | 'rankPlatinum'
  | 'rankDiamond'
  | 'fail'
  | 'step'
  | 'uiClick'
  | 'uiHover'
  | 'page'
  | 'hint'
  | 'fastOn'
  | 'fastOff'
  | 'knock'
  | 'doorOpen'
  | 'shuffle'
  | 'cardDeal'
  | 'cardFlip'
  | 'chip'
  | 'chips'
  | 'check'
  | 'fold'
  | 'pokerWin'
  | 'pokerLose'
  | 'yourTurn'
  | 'allIn'
  | 'rake'
  | 'voice';

/** Where the game is: it sets the reverb and the ambience. */
export type AudioScene =
  'meadow' | 'autumn' | 'marsh' | 'dusk' | 'cave' | 'terrarium' | 'room' | 'menu';

export interface PlayOptions {
  /** Stereo position, -1 (left) to 1 (right). */
  pan?: number;
  /** Volume multiplier, for distance. */
  gain?: number;
  /** Pitch multiplier, for sounds that have a speaker. */
  pitch?: number;
}

/** Identical sounds closer together than this are dropped, so volleys do not stack up. */
const MIN_REPEAT_SECONDS = 0.045;

interface SceneSound {
  /** Share of every effect sent to the reverb. */
  reverb: number;
  /** Reverb tail in seconds. */
  tail: number;
  /** Seconds between ambience events, low and high. */
  gap: readonly [number, number];
}

const SCENES: Record<AudioScene, SceneSound> = {
  menu: { reverb: 0.12, tail: 1.2, gap: [4, 9] },
  meadow: { reverb: 0.1, tail: 1, gap: [1.5, 5] },
  autumn: { reverb: 0.12, tail: 1.2, gap: [2.5, 6] },
  marsh: { reverb: 0.18, tail: 1.6, gap: [0.8, 2.6] },
  dusk: { reverb: 0.14, tail: 1.4, gap: [1, 3] },
  cave: { reverb: 0.45, tail: 3.2, gap: [1.2, 4] },
  terrarium: { reverb: 0.22, tail: 1.8, gap: [1, 3.2] },
  room: { reverb: 0.22, tail: 0.9, gap: [0.3, 1.4] },
};

const rand = (low: number, high: number): number => low + Math.random() * (high - low);

/** The things a Sproutling says. */
export type VoiceLine =
  'throw' | 'land' | 'lift' | 'heave' | 'alarm' | 'death' | 'pluck' | 'relief' | 'cheer' | 'gulp';

/**
 * Each kind's voice: a pitched buzz through two formant filters (its mouth), so the same line
 * sounds bright from an Emberling, low from a Stoneling, bubbly from a Dewling (a fast wobble)
 * and buzzy from a Sparkling (a square wave).
 */
const VOICES: Record<
  SproutKind,
  { pitch: number; wave: OscillatorType; formants: [number, number]; wobble: number }
> = {
  ember: { pitch: 560, wave: 'triangle', formants: [1100, 2700], wobble: 0 },
  dew: { pitch: 620, wave: 'sine', formants: [800, 2000], wobble: 22 },
  stone: { pitch: 240, wave: 'sawtooth', formants: [520, 1300], wobble: 0 },
  spark: { pitch: 720, wave: 'square', formants: [1400, 3200], wobble: 6 },
};

/** Each line as syllables: [pitch from, pitch to (times the voice's pitch), length, delay]. */
const LINES: Record<VoiceLine, readonly (readonly [number, number, number, number])[]> = {
  throw: [[1, 1.5, 0.09, 0]],
  land: [[1.1, 0.8, 0.07, 0]],
  lift: [[0.95, 1.15, 0.08, 0]],
  heave: [
    [1, 1.1, 0.1, 0],
    [1.25, 1.05, 0.13, 0.16],
  ],
  alarm: [
    [1.5, 1.7, 0.06, 0],
    [1.6, 1.8, 0.06, 0.08],
    [1.7, 1.9, 0.07, 0.16],
  ],
  death: [[1.3, 0.5, 0.5, 0]],
  pluck: [[0.9, 1.6, 0.11, 0]],
  relief: [
    [1.2, 0.95, 0.12, 0],
    [1.05, 1.3, 0.12, 0.15],
  ],
  cheer: [
    [1, 1.2, 0.08, 0],
    [1.2, 1.4, 0.08, 0.1],
    [1.4, 1.8, 0.14, 0.2],
  ],
  gulp: [
    [0.9, 0.7, 0.06, 0],
    [1.2, 1.6, 0.1, 0.1],
  ],
};

/** The people of the story, for `speak`. */
const SPEAKERS: Record<
  string,
  { pitch: number; wave: OscillatorType; formants: [number, number]; gap: number }
> = {
  sprocket: { pitch: 280, wave: 'triangle', formants: [700, 1900], gap: 0.11 },
  ashwick: { pitch: 150, wave: 'sawtooth', formants: [900, 1400], gap: 0.12 },
  tindle: { pitch: 560, wave: 'triangle', formants: [1100, 2700], gap: 0.08 },
  quill: { pitch: 380, wave: 'square', formants: [1000, 2300], gap: 0.09 },
};

/** At most this many voice lines start in any VOICE_WINDOW seconds, so a crowd never becomes noise. */
const VOICE_BUDGET = 5;
const VOICE_WINDOW = 0.3;

class AudioManager {
  private ctx: AudioContext | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private ambience: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private noise: AudioBuffer | null = null;
  private player: MusicPlayer | null = null;
  private sfxVolume = 0.7;
  private musicVolume = 0.35;
  private readonly lastPlayed = new Map<SoundName, number>();
  private readonly lastVoice = new Map<string, number>();
  private voiceTimes: number[] = [];
  private whistle: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;
  private scene: AudioScene = 'menu';
  private ambienceTimer: number | null = null;
  private drone: { osc: OscillatorNode; gain: GainNode } | null = null;
  /** Music, mood and ambience asked for before the context existed; started on unlock. */
  private wanted: TrackName | null = null;
  private bossMusic = { key: 0, phase: 0 };
  private voices: GainNode | null = null;
  private ducker: GainNode | null = null;
  private dayPhase: DayPhase = 'day';
  private lastMotif = new Map<string, number>();
  private mood: { intensity: Intensity; urgent: boolean } = { intensity: 1, urgent: false };
  private ambienceWanted = false;

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
    limiter.threshold.value = -14;
    limiter.ratio.value = 6;
    limiter.connect(ctx.destination);
    // Four buses into the limiter: effects, music (through a ducker that dips it under voices
    // and big stingers), ambience, and the characters' voices.
    this.sfx = ctx.createGain();
    this.music = ctx.createGain();
    this.ambience = ctx.createGain();
    this.voices = ctx.createGain();
    this.ducker = ctx.createGain();
    this.sfx.connect(limiter);
    this.music.connect(this.ducker).connect(limiter);
    this.ambience.connect(limiter);
    this.voices.connect(limiter);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    this.convolver = ctx.createConvolver();
    this.reverbSend = ctx.createGain();
    this.sfx.connect(this.reverbSend);
    this.ambience.connect(this.reverbSend);
    this.reverbSend.connect(this.convolver).connect(limiter);
    this.player = new MusicPlayer(ctx, this.music, this.noise);
    // The instruments are rendered a little after the first menu is up, a few at a time.
    window.setTimeout(() => this.player?.loadInstruments(), 1500);
    this.player.setDayPhase(this.dayPhase);
    this.applyVolumes();
    this.applyScene();
    this.player.setMood(this.mood.intensity, this.mood.urgent);
    this.player.setBoss(this.bossMusic.key, this.bossMusic.phase);
    if (this.wanted) this.player.play(this.wanted);
    if (this.ambienceWanted) this.startAmbience();
  }

  setVolumes(sfxVolume: number, musicVolume: number): void {
    this.sfxVolume = sfxVolume;
    this.musicVolume = musicVolume;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (this.sfx) this.sfx.gain.value = this.sfxVolume;
    if (this.music) this.music.gain.value = this.musicVolume;
    if (this.ambience) this.ambience.gain.value = this.sfxVolume * 1.3;
    if (this.voices) this.voices.gain.value = this.sfxVolume;
  }

  /** Changes the setting: reverb size and the ambience underneath everything. */
  setScene(scene: AudioScene): void {
    if (scene === this.scene) return;
    this.scene = scene;
    this.applyScene();
  }

  /** An impulse response made of decaying noise: cheap, and plenty for a sense of space. */
  private applyScene(): void {
    const { ctx, convolver, reverbSend } = this;
    if (!ctx || !convolver || !reverbSend) return;
    const spec = SCENES[this.scene];
    const length = Math.floor(ctx.sampleRate * spec.tail);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6;
      }
    }
    convolver.buffer = impulse;
    reverbSend.gain.value = spec.reverb;
  }

  /** A sound's own output: its volume and stereo position, feeding the effects bus. */
  private channel(options: PlayOptions | undefined, bus: GainNode): AudioNode {
    const ctx = this.ctx as AudioContext;
    const gain = ctx.createGain();
    gain.gain.value = options?.gain ?? 1;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, options?.pan ?? 0));
      gain.connect(panner).connect(bus);
    } else {
      gain.connect(bus);
    }
    return gain;
  }

  private tone(
    out: AudioNode,
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

  /** Filtered noise. `sweepTo` slides the filter, for whooshes. */
  private burst(
    out: AudioNode,
    duration: number,
    cutoff: number,
    volume: number,
    delay = 0,
    type: BiquadFilterType = 'lowpass',
    sweepTo = cutoff,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(cutoff, start);
    if (sweepTo !== cutoff)
      filter.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
    if (type === 'bandpass') filter.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(out);
    source.start(start, Math.random() * 0.5, duration + 0.02);
  }

  private notes(
    out: AudioNode,
    frequencies: readonly number[],
    spacing: number,
    length: number,
    volume: number,
    type: OscillatorType = 'triangle',
  ): void {
    frequencies.forEach((frequency, i) => {
      this.tone(out, frequency, frequency, length, type, volume, i * spacing);
    });
  }

  /** A struck bell: a sine with an inharmonic partial that dies faster. */
  private bell(out: AudioNode, hz: number, length: number, volume: number, delay = 0): void {
    this.tone(out, hz, hz, length, 'sine', volume, delay);
    this.tone(out, hz * 2.76, hz * 2.76, length * 0.45, 'sine', volume * 0.35, delay);
    this.tone(out, hz * 5.4, hz * 5.4, length * 0.2, 'sine', volume * 0.15, delay);
  }

  /**
   * An Emberling's voice: a short squeak that bends from one pitch to another, through
   * a band-pass that gives it a mouth. Every call is pitched a little differently.
   */
  private chirp(
    out: AudioNode,
    from: number,
    to: number,
    length: number,
    volume: number,
    delay = 0,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const pitch = rand(0.92, 1.1);
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from * pitch, start);
    osc.frequency.exponentialRampToValueAtTime(to * pitch, start + length);
    const mouth = ctx.createBiquadFilter();
    mouth.type = 'bandpass';
    mouth.frequency.setValueAtTime(1500, start);
    mouth.frequency.exponentialRampToValueAtTime(2600, start + length);
    mouth.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(mouth).connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  /**
   * A Sproutling says something. Lines from many at once are thinned: the same line from the
   * same kind no faster than every 0.12 s, and only a handful of lines in any third of a second.
   */
  voice(kind: SproutKind, line: VoiceLine, options?: PlayOptions): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const key = `${kind}:${line}`;
    const last = this.lastVoice.get(key);
    if (last !== undefined && now - last < 0.12) return;
    this.voiceTimes = this.voiceTimes.filter((t) => now - t < VOICE_WINDOW);
    // Deaths always get through: nobody is lost without a sound.
    if (this.voiceTimes.length >= VOICE_BUDGET && line !== 'death') return;
    this.voiceTimes.push(now);
    this.lastVoice.set(key, now);
    const out = this.channel(options, this.sfx);
    const voice = VOICES[kind];
    const pitch = voice.pitch * rand(0.9, 1.12);
    const volume = line === 'death' ? 0.1 : 0.07;
    for (const [from, to, length, delay] of LINES[line]) {
      const start = now + delay;
      const osc = ctx.createOscillator();
      osc.type = voice.wave;
      osc.frequency.setValueAtTime(pitch * from, start);
      osc.frequency.exponentialRampToValueAtTime(pitch * to, start + length);
      if (voice.wobble > 0) {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = voice.wobble;
        depth.gain.value = pitch * 0.06;
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(start);
        lfo.stop(start + length + 0.03);
      }
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      for (const formant of voice.formants) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = formant;
        filter.Q.value = 5;
        osc.connect(filter).connect(gain);
      }
      gain.connect(out);
      osc.start(start);
      osc.stop(start + length + 0.03);
    }
    // A lost Sproutling's spirit leaves with a soft bell.
    if (line === 'death') this.bell(out, 1319, 1.4, 0.07, 0.3);
  }

  /**
   * A character speaks: a run of formant blips, one per syllable or so, in their own voice.
   * Sprocket warm and wobbly, Ashwick low and thin as a radio, Tindle high and bright, Quill
   * clipped. The Warden says nothing aloud.
   */
  speak(who: string, text: string): void {
    const ctx = this.ctx;
    const voice = SPEAKERS[who];
    if (!ctx || !this.sfx || ctx.state !== 'running' || !voice) return;
    const out = this.channel(undefined, this.voices ?? this.sfx);
    const syllables = Math.min(14, Math.max(3, Math.round(text.split(/\s+/).length * 0.9)));
    const now = ctx.currentTime;
    // The music steps back while someone speaks; a character's motif now and then, not always.
    this.duck(syllables * voice.gap + 0.3, 0.6);
    const motif = (['ashwick', 'sprocket'] as const).find((m) => m === who);
    if (motif && now - (this.lastMotif.get(motif) ?? -99) > 20) {
      this.lastMotif.set(motif, now);
      this.player?.sting(motif);
    }
    for (let i = 0; i < syllables; i++) {
      const start = now + i * voice.gap * rand(0.85, 1.15);
      const pitch = voice.pitch * rand(0.85, 1.2) * (i === syllables - 1 ? 0.85 : 1);
      const osc = ctx.createOscillator();
      osc.type = voice.wave;
      osc.frequency.setValueAtTime(pitch, start);
      osc.frequency.exponentialRampToValueAtTime(pitch * rand(0.85, 1.1), start + voice.gap * 0.8);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + voice.gap * 0.85);
      for (const formant of voice.formants) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = formant;
        filter.Q.value = 4;
        osc.connect(filter).connect(gain);
      }
      gain.connect(out);
      osc.start(start);
      osc.stop(start + voice.gap);
    }
  }

  play(name: SoundName, options?: PlayOptions): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || ctx.state !== 'running') return;
    const last = this.lastPlayed.get(name);
    if (last !== undefined && ctx.currentTime - last < MIN_REPEAT_SECONDS) return;
    this.lastPlayed.set(name, ctx.currentTime);
    const out = this.channel(options, this.sfx);
    // A few percent of pitch drift keeps repeated sounds from sounding stamped out.
    const d = rand(0.96, 1.04);

    switch (name) {
      case 'throw':
        this.burst(out, 0.14, 900, 0.16, 0, 'bandpass', 2600);
        this.chirp(out, 620, 1050, 0.11, 0.2);
        break;
      case 'land':
        this.tone(out, 190 * d, 90, 0.08, 'sine', 0.26);
        this.burst(out, 0.06, 1400, 0.12);
        break;
      case 'latch':
        this.chirp(out, 900, 700, 0.06, 0.13);
        this.tone(out, 240 * d, 150, 0.05, 'square', 0.06);
        break;
      case 'grab':
        this.tone(out, 620 * d, 780 * d, 0.06, 'triangle', 0.14);
        this.chirp(out, 700, 880, 0.07, 0.09, 0.03);
        break;
      case 'deliver':
        [523, 659, 784, 1047].forEach((hz, i) => this.bell(out, hz, 0.5, 0.2, i * 0.07));
        this.burst(out, 0.4, 3000, 0.08, 0.05, 'highpass');
        break;
      case 'grow':
        [784, 988, 1175].forEach((hz, i) => this.bell(out, hz, 0.35, 0.16, i * 0.06));
        break;
      case 'spawn':
        this.tone(out, 300 * d, 900 * d, 0.07, 'sine', 0.14);
        this.chirp(out, 800, 1300, 0.09, 0.14, 0.05);
        break;
      case 'bossSting':
        // A roar, then a falling brass stab over a low drum.
        this.burst(out, 0.9, 260, 0.5);
        this.tone(out, 110, 55, 1.1, 'sawtooth', 0.28);
        [392, 370, 311].forEach((hz, i) =>
          this.tone(out, hz, hz * 0.98, 0.5, 'square', 0.1, 0.35 + i * 0.18),
        );
        this.tone(out, 60, 40, 0.8, 'sine', 0.5, 0.35);
        break;
      case 'pluck':
        this.burst(out, 0.08, 1600, 0.14, 0, 'bandpass', 900);
        this.tone(out, 260 * d, 520 * d, 0.07, 'sine', 0.14);
        break;
      case 'nectar':
        [988, 1319, 1568].forEach((hz, i) => this.bell(out, hz, 0.3, 0.13, i * 0.05));
        break;
      case 'workerLost':
        this.chirp(out, 900, 320, 0.36, 0.2);
        this.tone(out, 780 * d, 230, 0.4, 'sine', 0.1, 0.02);
        break;
      case 'bite':
        this.burst(out, 0.12, 900, 0.5);
        this.tone(out, 120 * d, 60, 0.15, 'square', 0.22);
        this.burst(out, 0.05, 4000, 0.25, 0.02, 'highpass');
        break;
      case 'shake':
        this.burst(out, 0.4, 420, 0.45);
        this.tone(out, 90 * d, 140, 0.3, 'sawtooth', 0.12);
        break;
      case 'enemyDefeated':
        this.tone(out, 220 * d, 50, 0.7, 'sawtooth', 0.24);
        this.burst(out, 0.5, 500, 0.3, 0.05);
        this.notes(out, [392, 523, 659], 0.09, 0.2, 0.2);
        break;
      case 'captainHurt':
        this.tone(out, 310, 110, 0.3, 'square', 0.26);
        this.burst(out, 0.1, 1200, 0.3);
        break;
      case 'chargeWindup':
        this.tone(out, 70, 190, 0.85, 'sawtooth', 0.2);
        this.bell(out, 311, 0.8, 0.14);
        break;
      case 'slam':
        this.burst(out, 0.35, 260, 0.7);
        this.tone(out, 95 * d, 40, 0.32, 'sine', 0.5);
        this.burst(out, 0.2, 2200, 0.12, 0.03, 'highpass');
        break;
      case 'spit':
        this.tone(out, 480 * d, 200, 0.16, 'sine', 0.22);
        this.burst(out, 0.1, 1800, 0.14, 0, 'bandpass', 700);
        break;
      case 'splat':
        this.burst(out, 0.24, 700, 0.5);
        this.tone(out, 160 * d, 70, 0.14, 'sine', 0.2);
        break;
      case 'rush':
        this.chirp(out, 660, 990, 0.09, 0.16);
        this.chirp(out, 740, 1100, 0.09, 0.14, 0.06);
        this.chirp(out, 880, 1320, 0.11, 0.14, 0.12);
        break;
      case 'dismiss':
        this.notes(out, [660, 440], 0.09, 0.12, 0.18);
        break;
      case 'splash':
        this.tone(out, 1300 * d, 500, 0.12, 'sine', 0.2);
        this.burst(out, 0.14, 2500, 0.18, 0, 'bandpass', 900);
        break;
      case 'slamWindup':
        this.tone(out, 55, 140, 1.1, 'sawtooth', 0.22);
        this.burst(out, 1, 200, 0.14, 0, 'lowpass', 900);
        break;
      case 'stomp':
        this.burst(out, 0.45, 200, 0.75);
        this.tone(out, 70, 32, 0.5, 'sine', 0.55);
        break;
      case 'phase':
        // A roar: two rough tones falling together under a burst of breath.
        this.tone(out, 160, 70, 0.9, 'sawtooth', 0.28);
        this.tone(out, 243, 96, 0.9, 'square', 0.12, 0.03);
        this.burst(out, 0.8, 900, 0.3, 0, 'bandpass', 300);
        break;
      case 'gateBroken':
        this.burst(out, 0.5, 1200, 0.55);
        this.burst(out, 0.2, 3000, 0.2, 0.1, 'highpass');
        this.notes(out, [392, 494, 587], 0.06, 0.12, 0.16);
        break;
      case 'shieldDown':
        [1047, 784, 1319, 1568].forEach((hz, i) => this.bell(out, hz, 0.5, 0.18, i * 0.08));
        break;
      case 'regrow':
        this.tone(out, 200, 420, 0.5, 'triangle', 0.18);
        break;
      case 'bloom':
        [1319, 1568, 2093].forEach((hz, i) => this.bell(out, hz, 0.7, 0.13, i * 0.1));
        break;
      case 'wilt':
        this.notes(out, [784, 622, 523], 0.1, 0.2, 0.14);
        break;
      case 'dug':
        this.burst(out, 0.3, 600, 0.4);
        this.notes(out, [523, 784], 0.08, 0.15, 0.18);
        break;
      case 'crack':
        this.burst(out, 0.08, 5000, 0.45, 0, 'highpass');
        this.tone(out, 2400, 900, 0.18, 'square', 0.1);
        break;
      case 'sap':
        [392, 523, 659, 784, 1047].forEach((hz, i) => this.bell(out, hz, 0.4, 0.15, i * 0.05));
        break;
      case 'twin':
        [784, 988, 1175, 1568].forEach((hz, i) => this.bell(out, hz, 0.6, 0.18, i * 0.06));
        break;
      case 'logPlaced':
        this.tone(out, 180 * d, 120, 0.2, 'triangle', 0.3);
        this.burst(out, 0.1, 800, 0.25);
        break;
      case 'bridgeBuilt':
        this.notes(out, [392, 494, 587, 784], 0.09, 0.3, 0.22);
        this.burst(out, 0.35, 700, 0.35);
        break;
      case 'beaconLit':
        // A whoomph of flame, then a chord that hangs in the air.
        this.burst(out, 0.5, 300, 0.4, 0, 'lowpass', 2400);
        [440, 554, 659, 880].forEach((hz, i) => this.bell(out, hz, 1.2, 0.14, 0.1 + i * 0.05));
        break;
      case 'snuff':
        this.burst(out, 0.7, 3000, 0.4, 0, 'lowpass', 150);
        this.tone(out, 500, 60, 0.7, 'sine', 0.2);
        break;
      case 'warning':
        this.notes(out, [880, 880, 880], 0.28, 0.2, 0.2);
        break;
      case 'tick':
        this.tone(out, 1400, 1100, 0.04, 'square', 0.1);
        break;
      case 'dayEnd':
        this.notes(out, [523, 659, 784], 0.11, 0.3, 0.16);
        break;
      case 'rankCopper':
        [349, 440].forEach((hz, i) => this.bell(out, hz, 0.6, 0.18, 0.4 + i * 0.16));
        break;
      case 'rankBronze':
        [392, 494, 587].forEach((hz, i) => this.bell(out, hz, 0.7, 0.2, 0.4 + i * 0.14));
        break;
      case 'rankSilver':
        [440, 554, 659, 880].forEach((hz, i) => this.bell(out, hz, 0.8, 0.2, 0.4 + i * 0.13));
        break;
      case 'rankGold':
        [523, 659, 784, 1047, 1319].forEach((hz, i) =>
          this.bell(out, hz, 0.9, 0.2, 0.4 + i * 0.12),
        );
        this.notes(out, [262, 392], 0.6, 1.2, 0.12, 'sawtooth');
        break;
      case 'rankPlatinum':
        [523, 659, 784, 1047, 1319, 1568, 2093].forEach((hz, i) =>
          this.bell(out, hz, 1.1, 0.19, 0.4 + i * 0.1),
        );
        this.notes(out, [262, 330, 392, 523], 0.3, 1.4, 0.1, 'sawtooth');
        this.burst(out, 1.4, 6000, 0.07, 1, 'highpass');
        break;
      case 'rankDiamond':
        // Platinum's fanfare, then a glassy shimmer climbing over it.
        [523, 659, 784, 1047, 1319, 1568, 2093].forEach((hz, i) =>
          this.bell(out, hz, 1.2, 0.19, 0.4 + i * 0.1),
        );
        [2637, 3136, 3520, 4186].forEach((hz, i) => this.bell(out, hz, 1.6, 0.1, 1.1 + i * 0.08));
        this.notes(out, [262, 330, 392, 523, 659], 0.3, 1.6, 0.1, 'sawtooth');
        this.burst(out, 1.8, 7000, 0.08, 1, 'highpass');
        break;
      case 'fail':
        this.notes(out, [392, 349, 311, 262], 0.22, 0.5, 0.18);
        break;
      case 'step':
        this.burst(out, 0.045, this.scene === 'cave' ? 1700 : 900, 0.07, 0, 'bandpass');
        break;
      case 'uiClick':
        this.tone(out, 660, 990, 0.05, 'triangle', 0.12);
        break;
      case 'uiHover':
        this.tone(out, 880, 880, 0.025, 'sine', 0.04);
        break;
      case 'page':
        this.burst(out, 0.16, 1200, 0.14, 0, 'bandpass', 3200);
        break;
      case 'hint':
        this.bell(out, 988, 0.4, 0.1);
        this.bell(out, 1319, 0.5, 0.1, 0.09);
        break;
      case 'fastOn':
        this.tone(out, 300, 900, 0.18, 'sawtooth', 0.07);
        break;
      case 'fastOff':
        this.tone(out, 900, 300, 0.18, 'sawtooth', 0.07);
        break;
      case 'knock':
        this.tone(out, 150 * d, 90, 0.07, 'sine', 0.5);
        this.burst(out, 0.04, 1500, 0.3);
        break;
      case 'doorOpen':
        this.tone(out, 180, 420, 0.7, 'sawtooth', 0.06);
        this.burst(out, 0.6, 500, 0.12, 0.1, 'bandpass', 1400);
        break;
      case 'shuffle':
        for (let i = 0; i < 9; i++) this.burst(out, 0.03, 3500, 0.16, i * 0.045, 'highpass');
        break;
      case 'cardDeal':
        this.burst(out, 0.07, 2600, 0.24, 0, 'bandpass', 5200);
        break;
      case 'cardFlip':
        this.burst(out, 0.05, 4200, 0.22, 0, 'highpass');
        this.tone(out, 500 * d, 300, 0.03, 'triangle', 0.08, 0.03);
        break;
      case 'chip':
        this.bell(out, 2900 * d, 0.09, 0.14);
        this.bell(out, 4100 * d, 0.06, 0.09, 0.012);
        break;
      case 'chips':
        for (let i = 0; i < 5; i++)
          this.bell(out, rand(2600, 4400), 0.08, 0.11, i * rand(0.03, 0.05));
        break;
      case 'check':
        this.tone(out, 170, 110, 0.05, 'sine', 0.4);
        this.tone(out, 170, 110, 0.05, 'sine', 0.3, 0.11);
        break;
      case 'fold':
        this.burst(out, 0.16, 3200, 0.16, 0, 'bandpass', 900);
        break;
      case 'pokerWin':
        [587, 740, 880, 1175].forEach((hz, i) => this.bell(out, hz, 0.6, 0.18, i * 0.09));
        for (let i = 0; i < 6; i++) this.bell(out, rand(2600, 4400), 0.08, 0.08, 0.3 + i * 0.05);
        break;
      case 'rescued':
        // A relieved little chirp, and the hiss of a flame put out or water shaken off.
        this.burst(out, 0.18, 3200, 0.12, 0, 'highpass');
        this.chirp(out, 700, 1100, 0.12, 0.16, 0.04);
        break;
      case 'burned':
        this.burst(out, 0.5, 1600, 0.3, 0, 'bandpass', 400);
        this.chirp(out, 900, 260, 0.4, 0.18);
        break;
      case 'drowned':
        this.tone(out, 600, 140, 0.45, 'sine', 0.18);
        for (let i = 0; i < 4; i++)
          this.tone(out, rand(500, 900), rand(900, 1400), 0.06, 'sine', 0.06, 0.1 + i * 0.09);
        break;
      case 'ignite':
        // A whoomph and a frightened squeak.
        this.burst(out, 0.35, 300, 0.35, 0, 'lowpass', 2200);
        this.chirp(out, 1000, 1400, 0.1, 0.16, 0.05);
        break;
      case 'zap':
        for (let i = 0; i < 5; i++) this.burst(out, 0.03, 6000, 0.3, i * 0.035, 'highpass');
        this.tone(out, 1800, 220, 0.25, 'sawtooth', 0.14);
        break;
      case 'flare':
        this.burst(out, 0.6, 250, 0.4, 0, 'lowpass', 1800);
        this.tone(out, 80, 160, 0.5, 'sawtooth', 0.08);
        break;
      case 'select':
        this.tone(
          out,
          880 * (options?.pitch ?? 1),
          1100 * (options?.pitch ?? 1),
          0.06,
          'triangle',
          0.12,
        );
        break;
      case 'chain': {
        // Each link of the chain rings a step higher up the scale.
        const step = Math.min(10, (options?.pitch ?? 2) - 2);
        const hz = 784 * 2 ** ([0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17][step] / 12);
        this.bell(out, hz, 0.5, 0.16);
        this.bell(out, hz * 1.5, 0.4, 0.08, 0.05);
        break;
      }
      case 'yourTurn':
        this.bell(out, 659, 0.35, 0.09);
        this.bell(out, 880, 0.45, 0.09, 0.12);
        break;
      case 'allIn':
        this.tone(out, 110, 220, 0.7, 'sawtooth', 0.1);
        for (let i = 0; i < 12; i++) {
          this.bell(out, rand(2400, 4600), 0.08, 0.1, 0.15 + i * rand(0.03, 0.045));
        }
        break;
      case 'rake':
        this.burst(out, 0.5, 2200, 0.1, 0, 'bandpass', 900);
        for (let i = 0; i < 9; i++) this.bell(out, rand(2600, 4400), 0.07, 0.07, i * 0.05);
        break;
      case 'voice': {
        // An Emberling muttering: two or three squeaks at its own pitch.
        const p = options?.pitch ?? 1;
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const from = rand(520, 760) * p;
          this.chirp(out, from, from * rand(0.8, 1.3), rand(0.07, 0.12), 0.11, i * 0.12);
        }
        break;
      }
      case 'pokerLose':
        this.notes(out, [330, 294, 247], 0.2, 0.4, 0.14);
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
      osc.frequency.setValueAtTime(1180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1480, ctx.currentTime + 0.08);
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

  /** One ambience event for the current scene: a bird, a gust, a cricket, a drip. */
  private ambienceEvent(): void {
    const ctx = this.ctx;
    const out = this.ambience;
    if (!ctx || !out || ctx.state !== 'running') return;
    const voice = this.channel({ pan: rand(-0.9, 0.9), gain: rand(0.5, 1) }, out);
    const scene = this.scene;
    const roll = Math.random();
    if (scene === 'meadow' || (scene === 'autumn' && roll < 0.35) || scene === 'menu') {
      // A songbird: a handful of quick slides around one pitch.
      const base = rand(2400, 4200);
      const count = Math.floor(rand(2, 6));
      for (let i = 0; i < count; i++) {
        this.tone(
          voice,
          base * rand(0.9, 1.1),
          base * rand(1.05, 1.35),
          0.07,
          'sine',
          0.05,
          i * rand(0.09, 0.13),
        );
      }
    } else if (scene === 'autumn') {
      // A gust through dry leaves.
      this.burst(voice, rand(1.5, 2.8), 500, 0.09, 0, 'bandpass', rand(900, 1800));
    } else if (scene === 'marsh') {
      if (roll < 0.4) {
        // A frog: a short, rough, low croak, usually twice.
        const hz = rand(150, 240);
        this.tone(voice, hz, hz * 0.8, 0.12, 'square', 0.05);
        if (roll < 0.25) this.tone(voice, hz, hz * 0.8, 0.12, 'square', 0.05, 0.2);
      } else {
        const hz = rand(4200, 5200);
        for (let i = 0; i < 6; i++) this.tone(voice, hz, hz, 0.03, 'sine', 0.025, i * 0.055);
      }
    } else if (scene === 'terrarium') {
      if (roll < 0.5) {
        // Old clockwork somewhere in the glasshouse: a few ticks and a soft chime.
        for (let i = 0; i < 4; i++) this.tone(voice, 2200, 1800, 0.02, 'square', 0.015, i * 0.25);
        if (roll < 0.15) this.bell(voice, rand(1200, 1800), 0.8, 0.03, 1);
      } else {
        const base = rand(2600, 3800);
        for (let i = 0; i < 3; i++) {
          this.tone(voice, base, base * rand(1.05, 1.25), 0.07, 'sine', 0.045, i * 0.11);
        }
      }
    } else if (scene === 'dusk') {
      if (roll < 0.7) {
        const hz = rand(3800, 4600);
        for (let i = 0; i < 4; i++) this.tone(voice, hz, hz, 0.035, 'sine', 0.025, i * 0.07);
      } else {
        this.burst(voice, rand(1.5, 2.5), 400, 0.06, 0, 'bandpass', rand(700, 1200));
      }
    } else if (scene === 'cave') {
      // A drip somewhere in the dark; the reverb does the rest.
      const hz = rand(900, 1900);
      this.tone(voice, hz, hz * 0.55, 0.09, 'sine', 0.07);
      if (roll < 0.3) this.tone(voice, hz * 1.3, hz * 0.7, 0.07, 'sine', 0.04, rand(0.15, 0.3));
    } else {
      // The back room: the record crackles; now and then a chair creaks or a glass is set down.
      if (roll < 0.86) {
        const pops = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < pops; i++) {
          this.burst(voice, 0.012, 5200, rand(0.02, 0.05), i * rand(0.03, 0.2), 'highpass');
        }
        return;
      }
      if (roll < 0.93) this.tone(voice, rand(180, 260), rand(120, 160), 0.25, 'sawtooth', 0.012);
      else this.bell(voice, rand(1800, 2600), 0.3, 0.02);
    }
  }

  /** Starts the ambience for the current scene, or does nothing if it is already running. */
  startAmbience(): void {
    this.ambienceWanted = true;
    const ctx = this.ctx;
    if (!ctx || this.ambienceTimer !== null) return;
    const next = (): void => {
      this.ambienceEvent();
      const [low, high] = SCENES[this.scene].gap;
      this.ambienceTimer = window.setTimeout(next, rand(low, high) * 1000);
    };
    this.ambienceTimer = window.setTimeout(next, 600);
    if (this.scene === 'cave' && this.ambience && !this.drone) {
      // The weight of the rock overhead: a very low hum that slowly breathes.
      const osc = ctx.createOscillator();
      osc.frequency.value = 49;
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      gain.gain.setTargetAtTime(0.07, ctx.currentTime, 2);
      osc.connect(gain).connect(this.ambience);
      osc.start();
      this.drone = { osc, gain };
    }
  }

  stopAmbience(): void {
    this.ambienceWanted = false;
    if (this.ambienceTimer !== null) window.clearTimeout(this.ambienceTimer);
    this.ambienceTimer = null;
    if (this.drone && this.ctx) {
      this.drone.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
      this.drone.osc.stop(this.ctx.currentTime + 1);
      this.drone = null;
    }
  }

  /** Starts a track, or moves to it at the next bar line. Safe to call before `unlock`. */
  playMusic(track: TrackName): void {
    this.wanted = track;
    this.player?.play(track);
  }

  /** How busy and how urgent the music should sound right now. */
  setMusicMood(intensity: Intensity, urgent: boolean): void {
    this.mood = { intensity, urgent };
    this.player?.setMood(intensity, urgent);
  }

  /** Dips the music for a while, under a voice or a big stinger, and brings it back. */
  duck(seconds: number, depth = 0.45): void {
    const ctx = this.ctx;
    if (!ctx || !this.ducker) return;
    const gain = this.ducker.gain;
    gain.cancelScheduledValues(ctx.currentTime);
    gain.setTargetAtTime(depth, ctx.currentTime, 0.05);
    gain.setTargetAtTime(1, ctx.currentTime + seconds, 0.3);
  }

  /** Arranges the music for the part of the day: morning, the working day, or sunset. */
  setDayPhase(phase: DayPhase): void {
    this.dayPhase = phase;
    this.player?.setDayPhase(phase);
  }

  /** A stinger over the music: a part home, a boss, or a character's motif. */
  sting(kind: 'part' | 'boss' | Motif): void {
    if (!this.player) return;
    this.duck(kind === 'part' || kind === 'boss' ? 2.4 : 1.4, kind === 'part' ? 0.35 : 0.55);
    this.player.sting(kind);
  }

  /** Boss music: the boss's own key and the fight's phase (see MusicPlayer.setBoss). */
  setBossMusic(key: number, phase: number): void {
    this.bossMusic = { key, phase };
    this.player?.setBoss(key, phase);
  }

  stopMusic(): void {
    this.wanted = null;
    this.player?.stop();
  }
}

export const audio = new AudioManager();
