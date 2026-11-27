import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { BATTLE_LEVELS } from '../world/level';
import { Battle, battleLevel, battleOpen } from './battle';
import { MODES } from './modes';

beforeAll(async () => {
  await initPhysics();
});

/*
 * Every battle arena raced by the hard rival against a Warden who does nothing: the arena must be
 * open to its battle, and the rival must win it with something to show. Slow: `npm run
 * test:levels`.
 */
describe.each(BATTLE_LEVELS)('$id', (arena) => {
  const mode = arena.arena;
  if (!mode) throw new Error(`${arena.id} is not an arena`);
  it('is raced and won by the rival', () => {
    const level = battleLevel(arena);
    expect(battleOpen(mode, level)).toBe(true);
    const battle = new Battle(mode, level, 'hard');
    const you = new Simulation(level, {
      endsWhen: MODES[mode].endsWhen,
      growth: MODES[mode].growth,
    });
    let outcome = null;
    for (let i = 0; i < 60 * level.dayLength + 60 && !outcome; i++) {
      you.step({ ...NO_INPUT, cursorX: you.captainTransform.x, cursorZ: you.captainTransform.z });
      battle.advance(1);
      outcome = battle.decide(you);
    }
    expect(outcome?.outcome).toBe('lost');
    // A marble race wants most of the marbles home; a bingo, at least a line's worth of squares.
    expect(outcome?.rival).toBeGreaterThanOrEqual(mode === 'marble' ? 3 : mode === 'bingo' ? 3 : 1);
    battle.dispose();
    you.dispose();
  }, 300_000);
});
