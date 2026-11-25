import { describe, expect, it } from 'vitest';
import type { DayResult } from '../game/core/gameStore';
import { LEVELS } from '../game/world/level';
import { awardFor } from './ResultCeremony';

const level = LEVELS[0];
const base = { challenge: null, battle: null, mode: 'lessons', clearTime: null } as const;

describe('the award a day earns', () => {
  it('gives a cleared lesson its time medal and an uncleared one nothing', () => {
    expect(awardFor({ ...base } as unknown as DayResult, level)).toBeNull();
    const award = awardFor(
      { ...base, clearTime: level.diamondTime } as unknown as DayResult,
      level,
    );
    expect(award?.medal).toBe('Diamond');
    const slow = awardFor(
      { ...base, clearTime: level.platinumTime * 3 } as unknown as DayResult,
      level,
    );
    expect(slow?.medal).toBe('Bronze');
  });

  it('gives a challenge its rank and a battle its outcome', () => {
    const challenge = awardFor(
      {
        ...base,
        mode: 'treasure',
        challenge: { rank: 'Gold', total: 900 },
      } as unknown as DayResult,
      level,
    );
    expect(challenge).toMatchObject({ medal: 'Gold', tone: 'gold', line: '900 points' });
    const battle = awardFor(
      {
        ...base,
        mode: 'race',
        battle: { outcome: 'won', you: 5, rival: 3, unit: 'Sunshards' },
      } as unknown as DayResult,
      level,
    );
    expect(battle).toMatchObject({ medal: 'Won', tone: 'battle-won' });
  });
});
