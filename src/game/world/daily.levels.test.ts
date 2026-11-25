import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { checkedField, dailyKey, dailySeed } from './daily';

beforeAll(async () => {
  await initPhysics();
});

/* Slow: the test player plays each day's field through. Run with `npm run test:levels`. */
describe('the daily challenge, day after day', () => {
  it('finds a field the test player finishes for every day of two months', () => {
    const start = Date.UTC(2026, 10, 1);
    for (let day = 0; day < 60; day++) {
      const key = dailyKey(new Date(start + day * 86_400_000));
      const field = checkedField(dailySeed(key), 'hunt', `daily-${key}`);
      expect(field, key).not.toBeNull();
      expect(field?.pace ?? 0, key).toBeLessThan(field?.dayLength ?? 0);
    }
  }, 900_000);
});
