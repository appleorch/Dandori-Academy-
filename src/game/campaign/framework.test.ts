import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import {
  allPartsHome,
  campaignAbilities,
  campaignEnding,
  dayField,
  newCampaign,
  parseCampaign,
  partsOutOfReach,
  sectionOpen,
  settleDay,
  switchSection,
} from './campaign';
import { DAY_LIMIT, endingFor } from './endings';
import { decodeFog, emptyFog, encodeFog, explored, isSeen, reveal } from './fog';
import { CAMPAIGN_SECTIONS, sectionById } from './sections';
import { abilitiesFor, CLOCK_UPGRADES } from './upgrades';

// A second section for the framework to move between: a copy of the Quad that opens at six parts.
vi.mock('./sections', async (original) => {
  const real = await original<typeof import('./sections')>();
  const quad = real.CAMPAIGN_SECTIONS[0];
  const second = { ...quad, id: 'second', name: 'Second', opensAt: 6, needs: {} };
  const sections = [quad, second];
  return {
    ...real,
    CAMPAIGN_SECTIONS: sections,
    sectionById: (id: string) => sections.find((s) => s.id === id),
  };
});

beforeAll(async () => {
  await initPhysics();
});

const QUAD = () => CAMPAIGN_SECTIONS[0];
const withParts = (count: number) => {
  const state = newCampaign();
  const parts = Object.fromEntries(
    QUAD()
      .parts.slice(0, count)
      .map((id) => [id, 1]),
  );
  return { ...state, parts };
};

describe('sections', () => {
  it('reads a save from before sections as the Wild Quad’s record', () => {
    const old = { ...withParts(3), done: ['enemy:1'] } as Record<string, unknown>;
    delete old.others;
    delete old.seen;
    delete old.ending;
    const parsed = parseCampaign(JSON.parse(JSON.stringify(old)));
    expect(parsed?.section).toBe('quad');
    expect(parsed?.done).toEqual(['enemy:1']);
    expect(Object.keys(parsed?.parts ?? {})).toHaveLength(3);
    expect(parsed?.others).toEqual({});
    expect(parsed?.ending).toBeNull();
  });

  it('opens a section once enough parts are home, and keeps each section’s own record', () => {
    const second = sectionById('second');
    if (!second) throw new Error('mock missing');
    expect(sectionOpen(withParts(5), second)).toBe(false);
    const state = { ...withParts(6), done: ['gate:0'] };
    expect(sectionOpen(state, second)).toBe(true);
    const there = switchSection(state, 'second');
    expect(there.section).toBe('second');
    expect(there.done).toEqual([]);
    expect(allPartsHome(there)).toBe(6);
    const back = switchSection(there, 'quad');
    expect(back.done).toEqual(['gate:0']);
    expect(Object.keys(back.parts)).toHaveLength(6);
    // The record survives a save.
    expect(parseCampaign(JSON.parse(JSON.stringify(there)))?.others.quad?.done).toEqual(['gate:0']);
  });
});

describe('the Clock’s gifts', () => {
  it('grants one gift for each of the first parts home, in order', () => {
    expect([...abilitiesFor(0)]).toEqual([]);
    expect([...abilitiesFor(2)]).toEqual(CLOCK_UPGRADES.slice(0, 2));
    expect(abilitiesFor(20).size).toBe(CLOCK_UPGRADES.length);
  });

  it('puts the gifts to work in a day: a longer whistle, a quicker Kiln, logs that count twice', () => {
    const level = dayField(withParts(7)).level;
    const plain = new Simulation(level, { story: true });
    const gifted = new Simulation(level, { story: true, abilities: abilitiesFor(7) });
    expect(gifted.abilities.has('whistle')).toBe(true);
    expect(plain.abilities.size).toBe(0);
    // Outside the story there are no gifts at all.
    expect(new Simulation(level, { abilities: abilitiesFor(7) }).abilities.size).toBe(0);
  });

  it('keeps parts that need a gift out of the field until it is granted', () => {
    const early = withParts(1);
    const out = partsOutOfReach(early);
    expect(out.get('part-fusee')).toBe('lantern');
    const ids = dayField(early).level.treasures.map((t) => t.id);
    expect(ids).not.toContain('part-fusee');
    const late = {
      ...newCampaign(),
      parts: Object.fromEntries(
        QUAD()
          .parts.filter((id) => id !== 'part-fusee' && id !== 'part-bell-housing')
          .slice(0, 7)
          .map((id) => [id, 1]),
      ),
    };
    expect(campaignAbilities(late).has('lantern')).toBe(true);
    expect(dayField(late).level.treasures.map((t) => t.id)).toContain('part-fusee');
  });
});

describe('stakes', () => {
  it('ends golden, late or silent by parts and days, and not at all when relaxed and unfinished', () => {
    expect(endingFor(24, 24, 20, false)).toBe('golden');
    expect(endingFor(24, 24, DAY_LIMIT + 3, false)).toBe('late');
    expect(endingFor(10, 24, DAY_LIMIT, false)).toBe('silent');
    expect(endingFor(10, 24, 12, false)).toBeNull();
    expect(endingFor(10, 24, DAY_LIMIT + 5, true)).toBeNull();
    expect(endingFor(24, 24, DAY_LIMIT + 5, true)).toBe('golden');
  });

  it('reaches an ending from a synthetic story', () => {
    const everything = {
      ...newCampaign(),
      day: 12,
      parts: Object.fromEntries(QUAD().parts.map((id) => [id, 1])),
      others: {
        second: {
          done: [],
          wear: {},
          parts: Object.fromEntries(QUAD().parts.map((id) => [id, 2])),
          finished: 2,
          seen: '',
        },
      },
    };
    expect(campaignEnding(everything, false)).toBe('golden');
    expect(campaignEnding({ ...everything, day: DAY_LIMIT + 1 }, false)).toBe('late');
  });
});

describe('fog of war', () => {
  it('packs and unpacks what has been seen', () => {
    const level = QUAD().level;
    const seen = emptyFog(level);
    reveal(seen, level, level.kiln.x, level.kiln.z);
    expect(isSeen(seen, level, level.kiln.x, level.kiln.z)).toBe(true);
    expect(isSeen(seen, level, -level.kiln.x, level.kiln.z)).toBe(false);
    const again = decodeFog(encodeFog(seen), level);
    expect([...again]).toEqual([...seen]);
    expect(decodeFog('not base64!', level).every((cell) => cell === 0)).toBe(true);
  });

  it('remembers ground seen during a story day', () => {
    const state = newCampaign();
    const field = dayField(state);
    const sim = new Simulation(field.level, { story: true });
    for (let i = 0; i < 120; i++) {
      sim.captainTransform.x = field.level.captain.x + i * 0.5;
      sim.step({ ...NO_INPUT, cursorX: sim.captainTransform.x, cursorZ: sim.captainTransform.z });
    }
    sim.ended = 'endedEarly';
    const { state: next } = settleDay(state, field, sim);
    expect(explored(decodeFog(next.seen, field.level))).toBeGreaterThan(0);
  });
});
