import { describe, expect, it } from 'vitest';
import { pickClip } from './RiggedModel';

describe('model animation', () => {
  const all = ['Armature|Idle', 'Walk_Loop', 'CharacterArmature|Run'];

  it('plays idle, walk or run by speed', () => {
    expect(pickClip(all, 0).name).toBe('Armature|Idle');
    expect(pickClip(all, 2).name).toBe('Walk_Loop');
    expect(pickClip(all, 7).name).toBe('CharacterArmature|Run');
  });

  it('makes do with the clips there are', () => {
    expect(pickClip(['Walk'], 0)).toEqual({ name: 'Walk', timeScale: 0 });
    expect(pickClip(['Walk'], 8).name).toBe('Walk');
    expect(pickClip(['Run'], 2).name).toBe('Run');
    expect(pickClip([], 3).name).toBeNull();
  });
});
