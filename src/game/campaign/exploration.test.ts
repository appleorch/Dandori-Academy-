import { describe, expect, it } from 'vitest';
import { OUTFITS } from '../progression/outfits';
import { emptySave } from '../save/saveManager';
import { relicFor, SECRET_RELICS } from '../story/relics';
import { MAX_PINS, newCampaign, parseCampaign, sectionCompletion, togglePin } from './campaign';
import { CAMPAIGN_SECTIONS } from './sections';

describe('pins', () => {
  it('pins a spot, takes away a pin clicked again, and stops at the limit', () => {
    let state = togglePin(newCampaign(), 10, 10);
    expect(state.pins.quad).toEqual([{ x: 10, z: 10 }]);
    state = togglePin(state, 11, 9);
    expect(state.pins.quad).toEqual([]);
    for (let i = 0; i < MAX_PINS + 3; i++) state = togglePin(state, i * 10, 0);
    expect(state.pins.quad).toHaveLength(MAX_PINS);
    expect(parseCampaign(JSON.parse(JSON.stringify(state)))?.pins.quad).toHaveLength(MAX_PINS);
  });
});

describe('secrets', () => {
  it('hides a glade behind a cracked wall in every section, with a relic found nowhere else', () => {
    for (const section of CAMPAIGN_SECTIONS) {
      const gates = section.level.gates ?? [];
      expect(
        gates.some((gate) => gate.style === 'hidden'),
        section.id,
      ).toBe(true);
      // Last in the list, so saved stories keep every other gate's place.
      expect(gates[gates.length - 1].style).toBe('hidden');
      const id = `secret-${section.id}`;
      expect(
        section.level.treasures.some((t) => t.id === id),
        section.id,
      ).toBe(true);
      expect(relicFor(section.level.id, id)).toBe(SECRET_RELICS[id]);
    }
  });
});

describe('completion', () => {
  it('counts every treasure and beast of a section, and a section done earns its outfit', () => {
    expect(sectionCompletion(newCampaign(), 'quad')).toBe(0);
    const quad = CAMPAIGN_SECTIONS[0];
    const done = [
      ...quad.level.treasures.map((t) => `treasure:${t.id}`),
      ...quad.level.enemies.map((_, i) => `enemy:${i}`),
    ];
    const state = { ...newCampaign(), done };
    expect(sectionCompletion(state, 'quad')).toBe(1);
    const outfit = OUTFITS.find((o) => o.id === 'section-quad');
    expect(outfit?.unlocked({ ...emptySave(), campaign: newCampaign() })).toBe(false);
    expect(outfit?.unlocked({ ...emptySave(), campaign: state })).toBe(true);
  });
});
