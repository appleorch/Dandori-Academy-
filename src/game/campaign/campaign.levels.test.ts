import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { MODES } from '../modes/modes';
import { playGreedy } from '../world/testBot';
import { dayField, newCampaign, sectionProgress, settleDay, type CampaignState } from './campaign';

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
