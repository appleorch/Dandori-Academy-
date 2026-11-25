import { describe, expect, it } from 'vitest';
import { CAMPAIGN_SECTIONS } from '../campaign/sections';
import { ENEMY_SPECS, type EnemyKind } from '../enemies/enemyKinds';
import { defineLevel } from '../world/level';
import { audio } from './audioManager';
import {
  admit,
  ambientEmitters,
  CREATURE_VOICES,
  MAX_EMITTERS,
  nearestEmitters,
  SOUND_CAP,
} from './spatial';

describe('ambient emitters', () => {
  it('follow the level’s features: water, drips, coils and vents', () => {
    const orchard = defineLevel(CAMPAIGN_SECTIONS[1].level);
    const kinds = new Set(ambientEmitters(orchard).map((e) => e.kind));
    expect(kinds.has('stream')).toBe(true);
    expect(kinds.has('drip')).toBe(true);
    const foundry = defineLevel(CAMPAIGN_SECTIONS[2].level);
    expect(ambientEmitters(foundry).some((e) => e.kind === 'crackle')).toBe(true);
    const observatory = defineLevel(CAMPAIGN_SECTIONS[3].level);
    expect(ambientEmitters(observatory).some((e) => e.kind === 'buzz')).toBe(true);
  });

  it('keeps only the nearest going', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ kind: 'drip' as const, x: i, z: 0 }));
    const near = nearestEmitters(many, 0, 0);
    expect(near).toHaveLength(MAX_EMITTERS);
    expect(Math.max(...near.map((e) => e.x))).toBe(MAX_EMITTERS - 1);
  });
});

describe('voices at once', () => {
  it('caps a sound at a few copies, but always lets a threat through', () => {
    const endings: number[] = [];
    for (let i = 0; i < SOUND_CAP; i++) {
      expect(admit(endings, 0, false)).toBe(true);
      endings.push(1);
    }
    expect(admit(endings, 0.5, false)).toBe(false);
    expect(admit(endings, 0.5, true)).toBe(true);
    // Once they have rung out, room again.
    expect(admit(endings, 2, false)).toBe(true);
    expect(endings).toHaveLength(0);
  });
});

describe('creature voices', () => {
  it('gives every beast a voice and a tell of its own shape', () => {
    const tells = new Set<string>();
    for (const kind of Object.keys(ENEMY_SPECS) as EnemyKind[]) {
      const voice = CREATURE_VOICES[kind];
      expect(voice, kind).toBeTruthy();
      if (ENEMY_SPECS[kind].attack !== 'none') tells.add(`${voice.pitch}:${voice.tell.join(',')}`);
    }
    const fighters = Object.values(ENEMY_SPECS).filter((s) => s.attack !== 'none').length;
    expect(tells.size).toBe(fighters);
  });

  it('never breaks without Web Audio', () => {
    expect(() => {
      audio.creature('ramhorn', 'tell', { x: 0, z: 0 });
      audio.startEmitters([{ kind: 'stream', x: 0, z: 0 }]);
      audio.stopEmitters();
      audio.setListener(1, 2);
      audio.play('uiType');
    }).not.toThrow();
  });
});
