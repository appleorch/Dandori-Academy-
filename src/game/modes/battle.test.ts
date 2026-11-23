import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT } from '../commands/input';
import { initPhysics } from '../simulation/physics';
import { Simulation, type Delivery } from '../simulation/Simulation';
import { LEVELS, type LevelDefinition } from '../world/level';
import {
  Battle,
  battleLevel,
  battleOpen,
  bingoCard,
  bingoLines,
  bingoTargets,
  hasBingo,
  MARBLES,
  marblesOf,
  ticked,
} from './battle';
import { BATTLE_IDS, MODES } from './modes';

beforeAll(async () => {
  await initPhysics();
});

const byId = (id: string): LevelDefinition => {
  const level = LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(id);
  return level;
};

const delivery = (fields: Partial<Delivery>): Delivery => ({
  kind: 'treasure',
  id: '',
  from: null,
  weight: 1,
  time: 0,
  ...fields,
});

describe('bingo', () => {
  const level = byId('final-exam');

  it('deals each side its own card of things the lesson really has', () => {
    const you = bingoCard(level, 0);
    const rival = bingoCard(level, 1);
    expect(you.squares).toHaveLength(you.size * you.size);
    expect(new Set(you.squares.map((square) => square.key)).size).toBe(you.squares.length);
    const keys = new Set(bingoTargets(level).map((square) => square.key));
    for (const square of [...you.squares, ...rival.squares])
      expect(keys.has(square.key)).toBe(true);
    expect(you.squares.map((s) => s.key)).not.toEqual(rival.squares.map((s) => s.key));
    // The same card every time.
    expect(bingoCard(level, 0)).toEqual(you);
  });

  it('ticks a square once per delivery, and calls a full line', () => {
    const card = bingoCard(level, 0);
    const line = bingoLines(card.size)[0];
    const deliveries = line.map((index) => {
      const match = card.squares[index].match;
      if (match.kind === 'treasure') return delivery({ id: match.id });
      if (match.kind === 'beast') return delivery({ kind: 'carcass', from: match.from });
      return delivery({ kind: match.kind });
    });
    expect(hasBingo(card, ticked(card, deliveries.slice(0, -1)))).toBe(false);
    expect(hasBingo(card, ticked(card, deliveries))).toBe(true);
    expect(bingoLines(4)).toHaveLength(10);
    expect(bingoLines(3)).toHaveLength(8);
  });

  it('is only offered where a full card can be dealt', () => {
    for (const lesson of LEVELS) {
      expect(battleOpen('bingo', lesson)).toBe(bingoTargets(lesson).length >= 9);
    }
  });
});

describe('marbles', () => {
  it('are the Sunshards farthest from the Kiln', () => {
    const level = byId('long-haul');
    const marbles = marblesOf(level);
    expect(marbles).toHaveLength(MARBLES);
    const distance = (id: string) => {
      const shard = level.treasures.find((t) => t.id === id);
      if (!shard) throw new Error(id);
      return Math.hypot(shard.x - level.kiln.x, shard.z - level.kiln.z);
    };
    const others = level.treasures.filter((t) => !marbles.includes(t.id));
    for (const other of others) {
      for (const marble of marbles)
        expect(distance(marble)).toBeGreaterThanOrEqual(distance(other.id));
    }
  });
});

describe('a battle', () => {
  it.each(BATTLE_IDS)(
    '%s: a rival beats a Warden who does nothing',
    (mode) => {
      const level = battleLevel(byId('divide-and-conquer'));
      if (!battleOpen(mode, level)) return;
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
      expect(outcome?.rival).toBeGreaterThan(0);
      expect(outcome?.you).toBe(0);
      battle.dispose();
      you.dispose();
    },
    120_000,
  );

  it('runs an easier rival more slowly', () => {
    const level = battleLevel(byId('divide-and-conquer'));
    const easy = new Battle('duel', level, 'easy');
    const hard = new Battle('duel', level, 'hard');
    easy.advance(600);
    hard.advance(600);
    expect(easy.rival.tick).toBe(420);
    expect(hard.rival.tick).toBe(600);
    easy.dispose();
    hard.dispose();
  });

  it('keeps battle days short and the field the same', () => {
    for (const level of LEVELS) {
      const battle = battleLevel(level);
      expect(battle.dayLength).toBeLessThanOrEqual(level.dayLength);
      expect(battle.dayLength).toBeGreaterThan(level.platinumTime);
      expect(battle.treasures).toBe(level.treasures);
    }
  });
});
