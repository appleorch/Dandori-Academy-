import { describe, expect, it } from 'vitest';
import { audio } from './audioManager';
import { instrumentBytes, INSTRUMENTS, renderInstrument, SAMPLE_HZ } from './instruments';
import { ARRANGEMENTS, MOTIFS, motifSteps } from './music';

describe('the instruments', () => {
  it('renders every instrument as a clean, bounded sample', () => {
    for (const name of INSTRUMENTS) {
      const data = renderInstrument(name, 22050);
      expect(data.length, name).toBeGreaterThan(1000);
      let peak = 0;
      for (const value of data) {
        expect(Number.isFinite(value)).toBe(true);
        peak = Math.max(peak, Math.abs(value));
      }
      expect(peak, name).toBeGreaterThan(0.5);
      expect(peak, name).toBeLessThanOrEqual(0.81);
    }
  });

  it('renders the same sample every time, and costs nothing to download', () => {
    expect([...renderInstrument('harp', 8000)]).toEqual([...renderInstrument('harp', 8000)]);
    // Rendered in the browser: well under the 1.5 MB download budget, because it is zero.
    expect(instrumentBytes(44100)).toBeLessThan(8 * 1024 * 1024);
  });

  it('plucks a string at the pitch it says', () => {
    const rate = 22050;
    const data = renderInstrument('pizzicato', rate);
    // The strongest repeat, by autocorrelation, after the first burst has settled.
    const from = Math.round(rate * 0.05);
    const window = Math.round(rate * 0.1);
    let best = 0;
    let bestLag = 0;
    for (let lag = 20; lag < 400; lag++) {
      let sum = 0;
      for (let i = from; i < from + window; i++) sum += data[i] * data[i + lag];
      if (sum > best) {
        best = sum;
        bestLag = lag;
      }
    }
    expect(rate / bestLag).toBeGreaterThan(SAMPLE_HZ.pizzicato * 0.95);
    expect(rate / bestLag).toBeLessThan(SAMPLE_HZ.pizzicato * 1.05);
  });
});

describe('the score', () => {
  it('fits every leitmotif into one bar', () => {
    for (const [name, motif] of Object.entries(MOTIFS)) {
      const length = motif.reduce((sum, [, beats]) => sum + beats, 0);
      expect(length, name).toBeLessThanOrEqual(16);
      expect(motifSteps(name as keyof typeof MOTIFS).filter((s) => s !== null)).toHaveLength(
        motif.length,
      );
    }
  });

  it('has a morning, a working-day and a sunset arrangement', () => {
    expect(Object.keys(ARRANGEMENTS).sort()).toEqual(['day', 'morning', 'sunset']);
    expect(ARRANGEMENTS.morning.drums).toBe('none');
    expect(ARRANGEMENTS.sunset.tempo).toBeLessThan(ARRANGEMENTS.day.tempo);
  });

  it('never breaks when there is no Web Audio at all', () => {
    expect(() => {
      audio.playMusic('meadow');
      audio.setDayPhase('sunset');
      audio.sting('part');
      audio.sting('ashwick');
      audio.duck(1);
      audio.speak('sprocket', 'Not a word of this will be heard.');
      audio.play('deliver');
      audio.setMusicMood(2, true);
    }).not.toThrow();
  });
});
