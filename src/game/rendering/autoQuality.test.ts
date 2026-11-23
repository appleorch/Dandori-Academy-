import { describe, expect, it } from 'vitest';
import { governorStep, guessLevel, MIN_DPR } from './autoQuality';

const desktop = { cores: 8, memory: 8, touch: false };

describe('auto graphics', () => {
  it('guesses a level from the device', () => {
    expect(guessLevel({ ...desktop, renderer: 'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11)' })).toBe(
      'high',
    );
    expect(guessLevel({ ...desktop, renderer: 'ANGLE (Intel(R) UHD Graphics 620)' })).toBe(
      'medium',
    );
    expect(guessLevel({ ...desktop, renderer: 'Google SwiftShader' })).toBe('low');
    expect(guessLevel({ ...desktop, renderer: 'llvmpipe (LLVM 15.0.7, 256 bits)' })).toBe('low');
    expect(guessLevel({ ...desktop, renderer: '' })).toBe('medium');
    expect(guessLevel({ renderer: 'Mali-G52', cores: 8, memory: 4, touch: true })).toBe('low');
    expect(guessLevel({ renderer: 'Apple GPU', cores: 6, touch: true })).toBe('medium');
    expect(guessLevel({ renderer: 'NVIDIA GeForce GTX 1650', cores: 2, touch: false })).toBe('low');
  });

  it('lowers the resolution before the level, and raises it again when smooth', () => {
    expect(governorStep(30, 2, 2, 0, 0)).toBe('lower-dpr');
    expect(governorStep(30, MIN_DPR, 1, 0, 0)).toBeNull();
    expect(governorStep(30, MIN_DPR, 1, 1, 0)).toBe('lower-level');
    expect(governorStep(50, 1, 2, 0, 5)).toBeNull();
    expect(governorStep(60, 1, 2, 0, 1)).toBeNull();
    expect(governorStep(60, 1, 2, 0, 2)).toBe('raise-dpr');
    expect(governorStep(60, 2, 2, 0, 9)).toBeNull();
  });
});
