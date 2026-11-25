import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { MODES } from '../modes/modes';
import { playGreedy } from '../world/testBot';
import {
  dayField,
  newCampaign,
  sectionProgress,
  settleDay,
  switchSection,
  type CampaignState,
} from './campaign';
import { CAMPAIGN_SECTIONS } from './sections';

beforeAll(async () => {
  await initPhysics();
});

const story = (state: CampaignState) => {
  const field = dayField(state);
  const sim = new Simulation(field.level, {
    endsWhen: MODES.campaign.endsWhen,
    growth: MODES.campaign.growth,
  });
  return { field, sim };
};

/* Whole story days played by the test player: slow, so it runs with `npm run test:levels`. */
describe('the story over several days', () => {
  it('lets a simple greedy player make progress day after day, and never undoes it', () => {
    let state = newCampaign();
    const history: string[] = [];
    for (let day = 0; day < 3; day++) {
      const { field, sim } = story(state);
      // Everything already done is gone from today's field.
      for (const key of state.done.filter((done) => done.startsWith('treasure:'))) {
        expect(field.level.treasures.some((t) => `treasure:${t.id}` === key)).toBe(false);
      }
      playGreedy(sim);
      expect(sim.ended).not.toBeNull();
      const settled = settleDay(state, field, sim);
      sim.dispose();
      // Nothing done before is ever undone.
      for (const key of state.done) expect(settled.state.done).toContain(key);
      state = settled.state;
      const progress = sectionProgress(state);
      history.push(
        `day ${state.day}: parts ${progress.parts}, relics ${progress.relics}, beasts ${progress.beasts}, kiln ${JSON.stringify(state.stock)}`,
      );
    }
    const progress = sectionProgress(state);
    expect(progress.parts + progress.relics, history.join('\n')).toBeGreaterThanOrEqual(8);
    expect(state.day).toBe(3);
  }, 600_000);
});

describe('the Sunken Orchard over five days', () => {
  it('lets the greedy player make steady progress there', () => {
    const quad = CAMPAIGN_SECTIONS[0];
    // A story that has brought six of the Quad's parts home, with a Kiln to match.
    let state: CampaignState = switchSection(
      {
        ...newCampaign(),
        parts: Object.fromEntries(quad.parts.slice(0, 6).map((id) => [id, 1])),
        stock: { ember: 20, dew: 10, stone: 4, spark: 4 },
        growth: {
          ember: Array(20).fill(0),
          dew: Array(10).fill(0),
          stone: [0, 0, 0, 0],
          spark: [0, 0, 0, 0],
        },
      },
      'orchard',
    );
    const found: number[] = [];
    for (let day = 0; day < 5; day++) {
      const { field, sim } = story(state);
      expect(field.section.id).toBe('orchard');
      playGreedy(sim);
      const settled = settleDay(state, field, sim);
      sim.dispose();
      for (const key of state.done) expect(settled.state.done).toContain(key);
      state = settled.state;
      const progress = sectionProgress(state);
      found.push(progress.parts + progress.relics);
    }
    // Something new is found every day or two, and a good share of the Orchard by the end.
    for (let day = 2; day < found.length; day++) {
      expect(found[day], found.join(', ')).toBeGreaterThan(found[day - 2]);
    }
    expect(found.at(-1), found.join(', ')).toBeGreaterThanOrEqual(10);
  }, 900_000);
});
