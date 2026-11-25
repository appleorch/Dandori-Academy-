/**
 * The music: a small step sequencer over Web Audio. Songs are written as data in scale
 * degrees, so every part stays in key whatever chord it plays over. Each part names the
 * lowest intensity it plays at, which is how the tune thickens when a fight starts.
 */

export type TrackName =
  'menu' | 'meadow' | 'autumn' | 'marsh' | 'dusk' | 'cave' | 'terrarium' | 'boss' | 'poker';

/** 0: calm (briefings, quiet moments). 1: a normal working day. 2: danger close by. */
export type Intensity = 0 | 1 | 2;

type Steps = readonly (number | null)[];
type Voice = 'pluck' | 'bell' | 'lead' | 'keys' | 'mallet' | 'sax';

interface Part {
  /** Lowest intensity at which the part plays. */
  from: Intensity;
  volume: number;
  octave: number;
}

interface Song {
  bpm: number;
  /** Fraction of a beat pair given to the first eighth; 0.5 is straight time. */
  swing: number;
  /** MIDI note of the scale's first degree. */
  root: number;
  /** Semitones of the seven scale degrees. */
  scale: readonly number[];
  /** Chord root per bar, as a scale degree. */
  bars: readonly number[];
  /** Scale steps stacked above the chord root: thirds for triads, a fourth entry for sevenths. */
  chord: readonly number[];
  pad?: Part & { cutoff: number };
  /** Sixteen steps per bar of chord-tone indexes. */
  bass?: Part & { steps: Steps };
  arp?: Part & { steps: Steps; voice: Voice };
  /** Chord stabs: steps on which the whole chord sounds. */
  comp?: Part & { steps: readonly number[]; voice: Voice };
  /** One 16-step phrase per bar, as scale steps above the bar's chord root. */
  lead?: Part & { phrases: readonly Steps[]; order: readonly number[]; voice: Voice };
  drums?: { kick?: Drum; snare?: Drum; hat?: Drum; ride?: Drum };
  /** Send level into the echo. */
  echo: number;
}

interface Drum {
  from: Intensity;
  /** Sixteen characters: `x` hits, `o` hits softly, anything else rests. */
  pattern: string;
  volume: number;
}

const _ = null;
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const TRIAD = [0, 2, 4];
const SEVENTH = [0, 2, 4, 6];

const SONGS: Record<TrackName, Song> = {
  /** Lessons list: a music box over a warm pad. */
  menu: {
    bpm: 84,
    swing: 0.5,
    root: 60,
    scale: MAJOR,
    bars: [0, 3, 5, 4, 0, 3, 1, 4],
    chord: TRIAD,
    echo: 0.35,
    pad: { from: 0, volume: 0.05, octave: -1, cutoff: 900 },
    bass: {
      from: 0,
      volume: 0.16,
      octave: -2,
      steps: [0, _, _, _, _, _, _, _, 2, _, _, _, _, _, _, _],
    },
    arp: {
      from: 0,
      volume: 0.1,
      octave: 0,
      voice: 'bell',
      steps: [0, _, 1, _, 2, _, 1, _, 3, _, 2, _, 1, _, 2, _],
    },
    lead: {
      from: 0,
      volume: 0.1,
      octave: 1,
      voice: 'bell',
      phrases: [
        [4, _, _, _, _, _, 2, _, 4, _, _, _, _, _, _, _],
        [2, _, _, _, 4, _, _, _, 5, _, 4, _, 2, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      ],
      order: [0, 2, 1, 2, 0, 2, 1, 2],
    },
  },
  /**
   * The Grand Curriculum, in the old Terrarium: a clockwork waltz. Ticking mallets keep
   * the time, bells carry the tune, and the bass turns over like a slow gear.
   */
  terrarium: {
    bpm: 96,
    swing: 0.5,
    root: 62,
    scale: MAJOR,
    bars: [0, 4, 5, 3, 0, 4, 1, 4],
    chord: TRIAD,
    echo: 0.3,
    pad: { from: 0, volume: 0.04, octave: -1, cutoff: 1000 },
    bass: {
      from: 1,
      volume: 0.19,
      octave: -2,
      steps: [0, _, _, _, 2, _, _, _, 1, _, _, _, 2, _, _, _],
    },
    arp: {
      from: 0,
      volume: 0.08,
      octave: 1,
      voice: 'mallet',
      steps: [0, _, 2, _, 1, _, 2, _, 0, _, 2, _, 1, _, 3, _],
    },
    lead: {
      from: 1,
      volume: 0.1,
      octave: 1,
      voice: 'bell',
      phrases: [
        [4, _, _, _, _, _, 5, _, 4, _, 2, _, _, _, _, _],
        [0, _, _, _, 2, _, _, _, 4, _, _, _, 7, _, _, _],
        [9, _, _, _, 7, _, _, _, 5, _, 4, _, 2, _, _, _],
        [4, _, _, _, 2, _, _, _, 1, _, _, _, _, _, _, _],
      ],
      order: [0, 1, 2, 3, 0, 1, 2, 3],
    },
    drums: {
      hat: { from: 0, pattern: 'x.o.x.o.x.o.x.o.', volume: 0.03 },
      kick: { from: 2, pattern: 'x.......x.......', volume: 0.28 },
      snare: { from: 2, pattern: '....x.......x...', volume: 0.12 },
    },
  },
  /** Term one: bright, plucked and unhurried. */
  meadow: {
    bpm: 104,
    swing: 0.5,
    root: 60,
    scale: MAJOR,
    bars: [0, 5, 3, 4, 0, 5, 1, 4],
    chord: TRIAD,
    echo: 0.22,
    pad: { from: 0, volume: 0.04, octave: -1, cutoff: 1100 },
    bass: {
      from: 1,
      volume: 0.2,
      octave: -2,
      steps: [0, _, _, _, _, _, 0, _, 2, _, _, _, 0, _, _, _],
    },
    arp: {
      from: 0,
      volume: 0.09,
      octave: 0,
      voice: 'pluck',
      steps: [0, _, 1, _, 2, _, 1, _, 3, _, 2, _, 1, _, 2, _],
    },
    lead: {
      from: 1,
      volume: 0.11,
      octave: 1,
      voice: 'lead',
      phrases: [
        [4, _, _, _, 2, _, 4, _, 7, _, _, _, 4, _, _, _],
        [2, _, _, _, 4, _, 2, _, 0, _, _, _, _, _, 1, _],
        [4, _, 5, _, 4, _, 2, _, 4, _, _, _, 7, _, _, _],
        [2, _, _, _, 1, _, 0, _, 1, _, _, _, _, _, _, _],
      ],
      order: [0, 1, 0, 3, 0, 1, 2, 3],
    },
    drums: {
      hat: { from: 1, pattern: 'o.x.o.x.o.x.o.xo', volume: 0.05 },
      kick: { from: 2, pattern: 'x.......x.....x.', volume: 0.3 },
      snare: { from: 2, pattern: '....x.......x...', volume: 0.14 },
    },
  },
  /** Term two: a brisk march in a minor-leaning mode, for falling leaves. */
  autumn: {
    bpm: 112,
    swing: 0.5,
    root: 62,
    scale: DORIAN,
    bars: [0, 3, 6, 0, 0, 3, 4, 0],
    chord: TRIAD,
    echo: 0.2,
    pad: { from: 0, volume: 0.04, octave: -1, cutoff: 1000 },
    bass: {
      from: 1,
      volume: 0.2,
      octave: -2,
      steps: [0, _, _, _, 0, _, _, _, 2, _, _, _, 0, _, 2, _],
    },
    arp: {
      from: 0,
      volume: 0.09,
      octave: 0,
      voice: 'mallet',
      steps: [0, _, _, 1, _, _, 2, _, 3, _, _, 2, _, _, 1, _],
    },
    lead: {
      from: 1,
      volume: 0.11,
      octave: 1,
      voice: 'lead',
      phrases: [
        [0, _, _, _, 2, _, 4, _, 4, _, _, _, 2, _, _, _],
        [4, _, 5, _, 4, _, 2, _, 0, _, _, _, _, _, _, _],
        [7, _, _, _, 4, _, _, _, 5, _, 4, _, 2, _, _, _],
        [2, _, _, _, 0, _, 1, _, 0, _, _, _, _, _, _, _],
      ],
      order: [0, 1, 2, 3, 0, 1, 2, 3],
    },
    drums: {
      hat: { from: 1, pattern: 'x..ox..ox..ox.o.', volume: 0.045 },
      kick: { from: 2, pattern: 'x.....x.x.......', volume: 0.3 },
      snare: { from: 2, pattern: '....x.......x..o', volume: 0.14 },
    },
  },
  /** Term three: slow, wet and wary. */
  marsh: {
    bpm: 92,
    swing: 0.5,
    root: 64,
    scale: MINOR,
    bars: [0, 5, 2, 6, 0, 5, 3, 4],
    chord: TRIAD,
    echo: 0.4,
    pad: { from: 0, volume: 0.05, octave: -1, cutoff: 800 },
    bass: {
      from: 1,
      volume: 0.2,
      octave: -2,
      steps: [0, _, _, _, _, _, _, _, _, _, 0, _, 2, _, _, _],
    },
    arp: {
      from: 0,
      volume: 0.085,
      octave: 0,
      voice: 'mallet',
      steps: [0, _, _, _, 2, _, 1, _, _, _, 3, _, _, _, 2, _],
    },
    lead: {
      from: 1,
      volume: 0.1,
      octave: 1,
      voice: 'lead',
      phrases: [
        [4, _, _, _, _, _, 2, _, 1, _, 2, _, _, _, _, _],
        [0, _, _, _, 2, _, _, _, 4, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [7, _, _, _, 6, _, 4, _, 2, _, _, _, 4, _, _, _],
      ],
      order: [0, 2, 1, 2, 0, 2, 3, 2],
    },
    drums: {
      hat: { from: 1, pattern: '..o...o...o...oo', volume: 0.04 },
      kick: { from: 2, pattern: 'x.........x.....', volume: 0.3 },
      snare: { from: 2, pattern: '........x.......', volume: 0.12 },
    },
  },
  /** Term four: the long road home, in gold light. */
  dusk: {
    bpm: 116,
    swing: 0.5,
    root: 65,
    scale: MAJOR,
    bars: [0, 4, 5, 3, 0, 4, 1, 4],
    chord: TRIAD,
    echo: 0.25,
    pad: { from: 0, volume: 0.045, octave: -1, cutoff: 1200 },
    bass: {
      from: 1,
      volume: 0.2,
      octave: -2,
      steps: [0, _, _, 0, _, _, 0, _, 2, _, _, 2, _, _, 0, _],
    },
    arp: {
      from: 0,
      volume: 0.085,
      octave: 0,
      voice: 'pluck',
      steps: [0, _, 2, _, 1, _, 2, _, 3, _, 2, _, 1, _, 2, _],
    },
    lead: {
      from: 1,
      volume: 0.11,
      octave: 1,
      voice: 'lead',
      phrases: [
        [0, _, _, _, 2, _, 4, _, 7, _, _, _, _, _, 4, _],
        [4, _, _, _, 2, _, 1, _, 2, _, _, _, _, _, _, _],
        [7, _, 8, _, 7, _, 4, _, 5, _, _, _, 4, _, _, _],
        [2, _, _, _, 4, _, _, _, 0, _, _, _, _, _, _, _],
      ],
      order: [0, 1, 2, 3, 0, 1, 2, 3],
    },
    drums: {
      hat: { from: 1, pattern: 'x.o.x.o.x.o.x.oo', volume: 0.045 },
      kick: { from: 2, pattern: 'x.......x..x....', volume: 0.3 },
      snare: { from: 2, pattern: '....x.......x...', volume: 0.14 },
    },
  },
  /** The Undercroft: a drone, a few bells, and a great deal of echo. */
  cave: {
    bpm: 72,
    swing: 0.5,
    root: 57,
    scale: PHRYGIAN,
    bars: [0, 0, 1, 0, 0, 6, 1, 0],
    chord: TRIAD,
    echo: 0.6,
    pad: { from: 0, volume: 0.06, octave: -2, cutoff: 500 },
    bass: {
      from: 1,
      volume: 0.18,
      octave: -2,
      steps: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, 0, _],
    },
    arp: {
      from: 0,
      volume: 0.08,
      octave: 1,
      voice: 'bell',
      steps: [0, _, _, _, _, _, 2, _, _, _, _, _, 1, _, _, _],
    },
    lead: {
      from: 1,
      volume: 0.08,
      octave: 1,
      voice: 'bell',
      phrases: [
        [4, _, _, _, _, _, _, _, 5, _, _, _, 4, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [7, _, _, _, _, _, 5, _, 4, _, _, _, _, _, _, _],
      ],
      order: [0, 1, 1, 1, 2, 1, 1, 1],
    },
    drums: {
      kick: { from: 2, pattern: 'x.......o.......', volume: 0.28 },
      hat: { from: 2, pattern: '....o.......o...', volume: 0.04 },
    },
  },
  /** Boss fights: fast, low and insistent. */
  boss: {
    bpm: 148,
    swing: 0.5,
    root: 62,
    scale: MINOR,
    bars: [0, 0, 5, 6, 0, 0, 3, 4],
    chord: TRIAD,
    echo: 0.15,
    pad: { from: 0, volume: 0.05, octave: -1, cutoff: 1400 },
    bass: {
      from: 0,
      volume: 0.22,
      octave: -2,
      steps: [0, _, 0, _, 0, _, 0, 2, 0, _, 0, _, 0, _, 2, 0],
    },
    arp: {
      from: 0,
      volume: 0.07,
      octave: 0,
      voice: 'pluck',
      steps: [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 3, 2, 1, 2],
    },
    lead: {
      from: 0,
      volume: 0.1,
      octave: 1,
      voice: 'lead',
      phrases: [
        [0, _, _, _, _, _, 2, _, 4, _, _, _, 2, _, 1, _],
        [0, _, _, _, _, _, _, _, 7, _, 6, _, 4, _, _, _],
        [4, _, _, 4, _, _, 5, _, 4, _, _, _, 2, _, _, _],
        [2, _, _, 2, _, _, 4, _, 6, _, _, _, 7, _, _, _],
      ],
      order: [0, 1, 2, 3, 0, 1, 2, 3],
    },
    drums: {
      kick: { from: 0, pattern: 'x...x...x...x.x.', volume: 0.34 },
      snare: { from: 0, pattern: '....x.......x..o', volume: 0.16 },
      hat: { from: 0, pattern: 'x.xox.xox.xox.xo', volume: 0.05 },
    },
  },
  /**
   * The back room: slow, dark jazz. A walking bass, brushes, a few low chords and a
   * tenor that takes its time, all in a minor key with sevenths on everything.
   */
  poker: {
    bpm: 72,
    swing: 0.67,
    root: 60,
    scale: MINOR,
    bars: [0, 3, 1, 4, 0, 5, 1, 4],
    chord: SEVENTH,
    echo: 0.3,
    pad: { from: 0, volume: 0.028, octave: -1, cutoff: 480 },
    bass: {
      from: 0,
      volume: 0.27,
      octave: -2,
      steps: [0, _, _, _, 1, _, _, _, 2, _, _, _, 3, _, _, 2],
    },
    comp: { from: 0, volume: 0.045, octave: 0, voice: 'keys', steps: [3, 10] },
    lead: {
      from: 0,
      volume: 0.085,
      octave: 0,
      voice: 'sax',
      phrases: [
        [4, _, _, _, _, _, 6, _, 7, _, _, _, _, _, _, _],
        [_, _, _, _, 9, _, 7, _, 6, _, _, _, 4, _, _, _],
        [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        [2, _, _, 3, 4, _, _, _, _, _, _, _, 2, _, 0, _],
        [7, _, _, _, _, _, _, _, 6, _, 4, _, 2, _, _, _],
      ],
      order: [0, 2, 1, 2, 3, 2, 4, 2],
    },
    drums: {
      ride: { from: 0, pattern: 'x...x.xox...x.xo', volume: 0.035 },
      snare: { from: 0, pattern: '....o.......o...', volume: 0.035 },
      kick: { from: 0, pattern: 'o.......o.......', volume: 0.14 },
    },
  },
};

const STEPS_PER_BAR = 16;
/** How far ahead of the clock notes are scheduled, and how often the scheduler wakes. */
const LOOKAHEAD = 0.35;
const TICK_MS = 90;
/** Tempo multiplier for the last stretch of a day. */
const URGENT_TEMPO = 1.12;
/** How much faster boss music gets with each phase of the fight. */
const BOSS_PHASE_TEMPO = 0.06;

function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** Plays songs through `out`. Create it once the audio context exists. */
export class MusicPlayer {
  private timer: number | null = null;
  private song: Song | null = null;
  private pending: TrackName | null = null;
  private current: TrackName | null = null;
  private step = 0;
  private nextTime = 0;
  private intensity: Intensity = 1;
  private urgent = false;
  /** Boss music only: semitones the boss's own variation is moved by, and the fight's phase. */
  private bossKey = 0;
  private bossPhase = 0;
  private readonly echoSend: GainNode;
  private readonly noise: AudioBuffer;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: GainNode,
    noise: AudioBuffer,
  ) {
    this.noise = noise;
    // A dotted-eighth echo with feedback: most of the sense of space in the music.
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.36;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    this.echoSend = ctx.createGain();
    this.echoSend.gain.value = 0.2;
    this.echoSend.connect(delay);
    delay.connect(tone).connect(feedback).connect(delay);
    tone.connect(out);
  }

  get track(): TrackName | null {
    return this.pending ?? this.current;
  }

  /** Starts a track, or switches to it at the next bar line if another is playing. */
  play(track: TrackName): void {
    if (this.timer !== null) {
      if (track !== this.current) this.pending = track;
      else this.pending = null;
      return;
    }
    this.begin(track);
    this.nextTime = this.ctx.currentTime + 0.12;
    this.timer = window.setInterval(() => this.pump(), TICK_MS);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    this.pending = null;
  }

  /**
   * Each boss has its own key, and the music climbs with the fight: a little faster in every
   * phase, and in the last an arpeggio an octave up over everything.
   */
  setBoss(key: number, phase: number): void {
    this.bossKey = key;
    this.bossPhase = phase;
  }

  setMood(intensity: Intensity, urgent: boolean): void {
    this.intensity = intensity;
    this.urgent = urgent;
  }

  private begin(track: TrackName): void {
    this.current = track;
    this.pending = null;
    this.song = SONGS[track];
    this.step = 0;
    this.echoSend.gain.setTargetAtTime(this.song.echo, this.ctx.currentTime, 0.3);
  }

  private pump(): void {
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      if (this.step % STEPS_PER_BAR === 0 && this.pending) this.begin(this.pending);
      const song = this.song;
      if (!song) return;
      const phaseTempo = this.current === 'boss' ? 1 + this.bossPhase * BOSS_PHASE_TEMPO : 1;
      const stepTime = 60 / (song.bpm * phaseTempo * (this.urgent ? URGENT_TEMPO : 1)) / 4;
      // Swing delays the second eighth of each beat.
      const inBeat = this.step % 4;
      const swung = inBeat === 2 ? (song.swing - 0.5) * stepTime * 4 : 0;
      this.schedule(song, this.step, this.nextTime + swung, stepTime);
      this.step++;
      this.nextTime += stepTime;
    }
  }

  /** The MIDI note `steps` scale steps above the song's root. */
  private note(song: Song, steps: number, octave: number): number {
    const degree = ((steps % 7) + 7) % 7;
    const key = this.current === 'boss' ? this.bossKey : 0;
    return song.root + key + octave * 12 + song.scale[degree] + 12 * Math.floor(steps / 7);
  }

  private schedule(song: Song, step: number, time: number, stepTime: number): void {
    const barIndex = Math.floor(step / STEPS_PER_BAR) % song.bars.length;
    const beat = step % STEPS_PER_BAR;
    const chordRoot = song.bars[barIndex];
    const level = this.intensity;
    /** Chord tone `index`, continuing up through the octaves. */
    const tone = (index: number, octave: number): number => {
      const size = song.chord.length;
      return this.note(
        song,
        chordRoot + song.chord[index % size] + 7 * Math.floor(index / size),
        octave,
      );
    };

    if (song.pad && beat === 0 && level >= song.pad.from) {
      for (let i = 0; i < song.chord.length; i++) {
        this.pad(
          midiToHz(tone(i, song.pad.octave)),
          time,
          stepTime * 17,
          song.pad.volume,
          song.pad.cutoff,
        );
      }
    }
    if (song.bass && level >= song.bass.from) {
      const index = song.bass.steps[beat];
      if (index !== null) {
        this.bass(midiToHz(tone(index, song.bass.octave)), time, stepTime * 3.4, song.bass.volume);
      }
    }
    if (song.arp && level >= song.arp.from) {
      const index = song.arp.steps[beat];
      if (index !== null) {
        this.voice(
          song.arp.voice,
          midiToHz(tone(index, song.arp.octave)),
          time,
          stepTime * 3,
          song.arp.volume,
        );
      }
    }
    // The phase layer: in a boss's last phase the arpeggio doubles an octave up.
    if (song.arp && this.current === 'boss' && this.bossPhase >= 2) {
      const index = song.arp.steps[beat];
      if (index !== null) {
        this.voice(
          song.arp.voice,
          midiToHz(tone(index, song.arp.octave + 1)),
          time,
          stepTime * 2,
          song.arp.volume * 0.7,
        );
      }
    }
    if (song.comp && level >= song.comp.from && song.comp.steps.includes(beat)) {
      for (let i = 0; i < song.chord.length; i++) {
        this.voice(
          song.comp.voice,
          midiToHz(tone(i, song.comp.octave)),
          time,
          stepTime * 2.5,
          song.comp.volume,
        );
      }
    }
    if (song.lead && level >= song.lead.from) {
      const phrase = song.lead.phrases[song.lead.order[barIndex % song.lead.order.length]];
      const offset = phrase[beat];
      if (offset !== null) {
        // The note rings until the phrase's next one.
        let length = 1;
        while (beat + length < STEPS_PER_BAR && phrase[beat + length] === null) length++;
        const pitch = midiToHz(this.note(song, chordRoot + offset, song.lead.octave));
        this.voice(song.lead.voice, pitch, time, stepTime * Math.min(length, 6), song.lead.volume);
      }
    }
    const { drums } = song;
    if (drums) {
      this.drum(drums.kick, beat, level, (v) => this.kick(time, v));
      this.drum(drums.snare, beat, level, (v) => this.snare(time, v));
      this.drum(drums.hat, beat, level, (v) => this.hat(time, v, 0.04, 7000));
      this.drum(drums.ride, beat, level, (v) => this.hat(time, v, 0.22, 9000));
    }
    // The clock, heard: a woodblock on every beat once the day is nearly out.
    if (this.urgent && beat % 4 === 0) this.block(time, beat === 0 ? 0.12 : 0.07);
  }

  private drum(
    drum: Drum | undefined,
    beat: number,
    level: Intensity,
    hit: (volume: number) => void,
  ): void {
    if (!drum || level < drum.from) return;
    const mark = drum.pattern[beat];
    if (mark === 'x') hit(drum.volume);
    else if (mark === 'o') hit(drum.volume * 0.5);
  }

  private envelope(
    time: number,
    attack: number,
    length: number,
    volume: number,
    echo = true,
  ): GainNode {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    gain.connect(this.out);
    if (echo) gain.connect(this.echoSend);
    return gain;
  }

  private osc(
    type: OscillatorType,
    hz: number,
    time: number,
    length: number,
    detune = 0,
  ): OscillatorNode {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, time);
    osc.detune.value = detune;
    osc.start(time);
    osc.stop(time + length + 0.05);
    return osc;
  }

  private voice(voice: Voice, hz: number, time: number, length: number, volume: number): void {
    const { ctx } = this;
    if (voice === 'bell') {
      const ring = Math.max(length, 0.9);
      const out = this.envelope(time, 0.004, ring, volume);
      this.osc('sine', hz, time, ring).connect(out);
      const partial = ctx.createGain();
      partial.gain.value = 0.3;
      this.osc('sine', hz * 3.01, time, ring * 0.5)
        .connect(partial)
        .connect(out);
    } else if (voice === 'pluck' || voice === 'mallet') {
      const ring = voice === 'mallet' ? Math.max(length, 0.5) : Math.max(length, 0.32);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(voice === 'mallet' ? 2200 : 3800, time);
      filter.frequency.exponentialRampToValueAtTime(500, time + ring);
      filter.connect(this.envelope(time, 0.005, ring, volume));
      this.osc('triangle', hz, time, ring).connect(filter);
      const upper = ctx.createGain();
      upper.gain.value = voice === 'mallet' ? 0.5 : 0.22;
      this.osc(
        voice === 'mallet' ? 'sine' : 'square',
        hz * (voice === 'mallet' ? 4 : 2),
        time,
        ring * 0.4,
      )
        .connect(upper)
        .connect(filter);
    } else if (voice === 'sax') {
      // A tenor: a reedy tone through a low, slightly ringing filter, a slow attack,
      // vibrato that arrives late, and a little breath on top.
      const ring = Math.max(length * 1.15, 0.6);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 2.5;
      filter.frequency.setValueAtTime(700, time);
      filter.frequency.linearRampToValueAtTime(1500, time + 0.18);
      filter.frequency.linearRampToValueAtTime(900, time + ring);
      const out = this.ctx.createGain();
      out.gain.setValueAtTime(0.0001, time);
      out.gain.linearRampToValueAtTime(volume, time + 0.09);
      out.gain.setValueAtTime(volume, time + ring * 0.6);
      out.gain.exponentialRampToValueAtTime(0.0001, time + ring);
      out.connect(this.out);
      out.connect(this.echoSend);
      filter.connect(out);
      const reed = this.osc('sawtooth', hz, time, ring);
      // Scoop up into the note, the way a player does.
      reed.frequency.setValueAtTime(hz * 0.97, time);
      reed.frequency.linearRampToValueAtTime(hz, time + 0.1);
      const vibrato = this.osc('sine', 4.8, time, ring);
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, time);
      depth.gain.linearRampToValueAtTime(hz * 0.012, time + Math.min(0.5, ring * 0.6));
      vibrato.connect(depth).connect(reed.frequency);
      reed.connect(filter);
      const body = ctx.createGain();
      body.gain.value = 0.3;
      this.osc('square', hz, time, ring).connect(body).connect(filter);
      const breath = ctx.createBufferSource();
      breath.buffer = this.noise;
      const air = ctx.createBiquadFilter();
      air.type = 'bandpass';
      air.frequency.value = 2400;
      const airGain = ctx.createGain();
      airGain.gain.value = 0.12;
      breath.connect(air).connect(airGain).connect(out);
      breath.start(time, Math.random() * 0.4, ring);
    } else if (voice === 'keys') {
      // An electric-piano tone: a sine with a soft bell on top and slow tremolo.
      const ring = Math.max(length, 0.5);
      const out = this.envelope(time, 0.008, ring, volume);
      const tremolo = ctx.createGain();
      tremolo.gain.value = 0.85;
      const wobble = this.osc('sine', 4.5, time, ring);
      const depth = ctx.createGain();
      depth.gain.value = 0.15;
      wobble.connect(depth).connect(tremolo.gain);
      tremolo.connect(out);
      this.osc('sine', hz, time, ring).connect(tremolo);
      const bell = ctx.createGain();
      bell.gain.setValueAtTime(0.4, time);
      bell.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
      this.osc('sine', hz * 2, time, ring)
        .connect(bell)
        .connect(tremolo);
    } else {
      // The lead: a rounded tone whose vibrato comes in after the attack.
      const ring = Math.max(length, 0.25);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2600;
      filter.connect(this.envelope(time, 0.03, ring * 1.1, volume));
      const main = this.osc('triangle', hz, time, ring * 1.1);
      const vibrato = this.osc('sine', 5.5, time, ring * 1.1);
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, time);
      depth.gain.linearRampToValueAtTime(hz * 0.008, time + Math.min(0.3, ring));
      vibrato.connect(depth).connect(main.frequency);
      main.connect(filter);
      const soft = ctx.createGain();
      soft.gain.value = 0.35;
      this.osc('sine', hz * 2, time, ring)
        .connect(soft)
        .connect(filter);
    }
  }

  private pad(hz: number, time: number, length: number, volume: number, cutoff: number): void {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + length * 0.3);
    gain.gain.linearRampToValueAtTime(0.0001, time + length);
    filter.connect(gain).connect(this.out);
    this.osc('sawtooth', hz, time, length, -7).connect(filter);
    this.osc('sawtooth', hz, time, length, 7).connect(filter);
  }

  private bass(hz: number, time: number, length: number, volume: number): void {
    const out = this.envelope(time, 0.01, Math.max(length, 0.2), volume, false);
    this.osc('sine', hz, time, length).connect(out);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const edge = this.ctx.createGain();
    edge.gain.value = 0.35;
    this.osc('sawtooth', hz, time, length).connect(filter).connect(edge).connect(out);
  }

  private kick(time: number, volume: number): void {
    const osc = this.osc('sine', 150, time, 0.2);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
    osc.connect(this.envelope(time, 0.003, 0.2, volume, false));
  }

  private noiseHit(
    time: number,
    length: number,
    type: BiquadFilterType,
    hz: number,
    volume: number,
  ): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = hz;
    source.connect(filter).connect(this.envelope(time, 0.002, length, volume, false));
    source.start(time, Math.random() * 0.5, length + 0.05);
  }

  private snare(time: number, volume: number): void {
    this.noiseHit(time, 0.14, 'bandpass', 1900, volume);
    this.osc('triangle', 190, time, 0.08).connect(
      this.envelope(time, 0.002, 0.08, volume * 0.6, false),
    );
  }

  private hat(time: number, volume: number, length: number, hz: number): void {
    this.noiseHit(time, length, 'highpass', hz, volume);
  }

  private block(time: number, volume: number): void {
    this.osc('square', 1150, time, 0.05).connect(this.envelope(time, 0.002, 0.05, volume, false));
  }
}
