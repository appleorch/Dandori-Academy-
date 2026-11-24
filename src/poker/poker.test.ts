import { describe, expect, it } from 'vitest';
import { Rng } from '../game/core/rng';
import { decide, equity } from './ai';
import { makeCard, shuffledDeck, type Card } from './cards';
import { PokerGame } from './game';
import { evaluate } from './hand';
import { allInStreak, WALKOUT_SHOVES } from './walkout';

/** Reads "As Kd 10h" into cards. */
function hand(text: string): Card[] {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['s', 'h', 'd', 'c'];
  return text
    .split(' ')
    .map((word) => makeCard(ranks.indexOf(word.slice(0, -1)), suits.indexOf(word.slice(-1))));
}

const names = ['You', 'A', 'B', 'C'];

describe('hand ranking', () => {
  it('names and orders every category', () => {
    const ladder = [
      ['Ks Qd 9h 7c 4s 3d 2h', 'King high'],
      ['Ks Kd 9h 7c 4s 3d 2h', 'Pair of Kings'],
      ['Ks Kd 9h 9c 4s 3d 2h', 'Two pair, Kings and Nines'],
      ['Ks Kd Kh 9c 4s 3d 2h', 'Three Kings'],
      ['9s 8d 7h 6c 5s Kd 2h', 'Straight, Nine high'],
      ['As Js 9s 6s 3s Kd 2h', 'Flush, Ace high'],
      ['Ks Kd Kh 9c 9s 3d 2h', 'Full house, Kings over Nines'],
      ['Ks Kd Kh Kc 9s 3d 2h', 'Four Kings'],
      ['9s 8s 7s 6s 5s Kd 2h', 'Straight flush, Nine high'],
      ['As Ks Qs Js 10s 3d 2h', 'Royal flush'],
    ] as const;
    let previous = -1;
    for (const [cards, name] of ladder) {
      const value = evaluate(hand(cards));
      expect(value.name).toBe(name);
      expect(value.score).toBeGreaterThan(previous);
      previous = value.score;
    }
  });

  it('plays the ace low in a wheel, below a six-high straight', () => {
    const wheel = evaluate(hand('As 2d 3h 4c 5s Kd Kh'));
    expect(wheel.name).toBe('Straight, Five high');
    expect(evaluate(hand('2d 3h 4c 5s 6d Kd Kh')).score).toBeGreaterThan(wheel.score);
  });

  it('breaks ties on kickers and splits identical hands', () => {
    const board = 'Ks 9d 7h 4c 2s';
    expect(evaluate(hand(`Kd Ah ${board}`)).score).toBeGreaterThan(
      evaluate(hand(`Kh Qh ${board}`)).score,
    );
    expect(evaluate(hand(`Ad 3h ${board}`)).score).toBe(evaluate(hand(`Ac 3c ${board}`)).score);
  });

  it('uses the better of two sets of three as a full house', () => {
    expect(evaluate(hand('Ks Kd Kh 9c 9s 9d 2h')).name).toBe('Full house, Kings over Nines');
  });
});

describe('the deck', () => {
  it('holds each card exactly once', () => {
    const rng = new Rng(4);
    expect(new Set(shuffledDeck(() => rng.next())).size).toBe(52);
  });
});

describe('betting', () => {
  const table = (stack = 1000, seed = 7): PokerGame => {
    const rng = new Rng(seed);
    const game = new PokerGame(names, stack, () => rng.next());
    game.startHand();
    return game;
  };

  it('posts blinds left of the button and starts with the seat after the big blind', () => {
    const game = table();
    expect(game.dealer).toBe(0);
    expect(game.seats[1].committed).toBe(10);
    expect(game.seats[2].committed).toBe(20);
    expect(game.toAct).toBe(3);
    expect(game.seats.every((seat) => seat.cards.length === 2)).toBe(true);
  });

  it('gives the pot to the last player when everyone else folds', () => {
    const game = table();
    game.act({ type: 'fold' });
    game.act({ type: 'fold' });
    game.act({ type: 'fold' });
    expect(game.handOver).toBe(true);
    expect(game.seats[2].stack).toBe(1010);
    expect(game.results[0].winners).toEqual([2]);
  });

  it('lets the big blind raise after everyone only calls', () => {
    const game = table();
    game.act({ type: 'call' });
    game.act({ type: 'call' });
    game.act({ type: 'call' });
    expect(game.toAct).toBe(2);
    expect(game.legal().canCheck).toBe(true);
    game.act({ type: 'raise', to: 80 });
    expect(game.toAct).toBe(3);
    expect(game.legal().callAmount).toBe(60);
  });

  it('enforces the minimum raise', () => {
    const game = table();
    game.act({ type: 'raise', to: 25 });
    expect(game.currentBet).toBe(40);
    game.act({ type: 'raise', to: 100 });
    expect(game.legal().minRaiseTo).toBe(160);
  });

  it('deals the streets and reaches a showdown when everyone checks it down', () => {
    const game = table();
    game.act({ type: 'call' });
    game.act({ type: 'call' });
    game.act({ type: 'call' });
    game.act({ type: 'check' });
    for (const count of [3, 4, 5]) {
      expect(game.toAct).toBe(-1);
      game.advance();
      expect(game.community.length).toBe(count);
      while (game.toAct >= 0) game.act({ type: 'check' });
    }
    game.advance();
    expect(game.street).toBe('showdown');
    expect(game.handOver).toBe(true);
    expect(game.seats.reduce((sum, seat) => sum + seat.stack, 0)).toBe(4000);
  });

  it('builds side pots so a short stack can only win what it matched', () => {
    const rng = new Rng(11);
    const game = new PokerGame(['Short', 'Mid', 'Deep'], 1000, () => rng.next());
    game.seats[0].stack = 100;
    game.seats[1].stack = 400;
    game.startHand();
    while (!game.handOver) {
      if (game.toAct >= 0) game.act({ type: 'raise', to: 100000 });
      else game.advance();
    }
    const paid = game.results.reduce((sum, pot) => sum + pot.amount, 0);
    // The deep stack only has to match the 400 the others could put in.
    expect(paid).toBe(900);
    // The short stack can win at most three times what it put in.
    expect(game.seats[0].stack).toBeLessThanOrEqual(300);
    expect(game.seats.reduce((sum, seat) => sum + seat.stack, 0)).toBe(1500);
    // The deep stack always gets back what nobody could call.
    expect(game.seats[2].stack).toBeGreaterThanOrEqual(600);
  });

  it('has the button post the small blind heads-up', () => {
    const rng = new Rng(3);
    const game = new PokerGame(['A', 'B'], 500, () => rng.next());
    game.startHand();
    expect(game.seats[game.dealer].committed).toBe(10);
    expect(game.toAct).toBe(game.dealer);
  });
});

describe('the players', () => {
  it('rates aces far above seven-two', () => {
    const rng = new Rng(9);
    const random = (): number => rng.next();
    const aces = equity(hand('As Ah'), [], 3, random, 400);
    const rags = equity(hand('7s 2h'), [], 3, random, 400);
    expect(aces).toBeGreaterThan(0.55);
    expect(rags).toBeLessThan(0.2);
  });

  it('play whole tournaments without losing or inventing a chip', () => {
    const rng = new Rng(21);
    const random = (): number => rng.next();
    const personas = [
      { tight: 0.7, aggression: 0.5, bluff: 0.15 },
      { tight: 0.4, aggression: 0.8, bluff: 0.5 },
      { tight: 0.2, aggression: 0.7, bluff: 0.3 },
      { tight: 0.55, aggression: 0.4, bluff: 0.1 },
      { tight: 0.15, aggression: 0.15, bluff: 0.05 },
      { tight: 0.5, aggression: 0.5, bluff: 0.2 },
    ];
    for (let tournament = 0; tournament < 3; tournament++) {
      const game = new PokerGame(['a', 'b', 'c', 'd', 'e', 'f'], 1500, random);
      let hands = 0;
      while (game.champion < 0 && hands < 600) {
        game.startHand();
        hands++;
        let moves = 0;
        while (!game.handOver) {
          if (game.toAct >= 0) game.act(decide(game, personas[game.toAct], random).action);
          else game.advance();
          expect(++moves).toBeLessThan(400);
        }
        expect(game.seats.reduce((sum, seat) => sum + seat.stack, 0)).toBe(9000);
        expect(game.seats.every((seat) => seat.stack >= 0)).toBe(true);
      }
      // Rising blinds always force a winner.
      expect(game.champion).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the walk out', () => {
  it('counts the Warden’s all-ins in a row, and anything else breaks the run', () => {
    expect(allInStreak(0, 'All in 1500')).toBe(1);
    expect(allInStreak(1, 'All in')).toBe(2);
    expect(allInStreak(2, 'All in 300')).toBe(WALKOUT_SHOVES);
    expect(allInStreak(2, 'Call 40')).toBe(0);
    expect(allInStreak(2, 'Raise to 120')).toBe(0);
    expect(allInStreak(2, 'Check')).toBe(0);
    expect(allInStreak(2, 'Fold')).toBe(0);
  });

  it('sees a shove, and a call for every chip, as going all in at the table', () => {
    const rng = new Rng(4);
    const game = new PokerGame(names, 1500, () => rng.next());
    let streak = 0;
    let shoves = 0;
    for (let hands = 0; hands < 40 && shoves < 3 && game.champion < 0; hands++) {
      if (game.seats[0].out) break;
      game.startHand();
      while (!game.handOver) {
        if (game.toAct === 0) {
          const legal = game.legal();
          // The Warden shoves when they can, and calls for everything when they cannot.
          game.act(legal.canRaise ? { type: 'raise', to: legal.maxRaiseTo } : { type: 'call' });
          streak = allInStreak(streak, game.seats[0].lastAction);
          shoves++;
          expect(streak).toBe(shoves);
        } else if (game.toAct > 0) {
          game.act({ type: 'call' });
        } else {
          game.advance();
        }
      }
    }
    expect(shoves).toBeGreaterThanOrEqual(1);
  });
});
