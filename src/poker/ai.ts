import { shuffledDeck, type Card } from './cards';
import type { Action, PokerGame } from './game';
import { evaluate } from './hand';

/** How one player at the table tends to play. Each value runs from 0 to 1. */
export interface Persona {
  /** How good a hand has to be before chips go in. */
  tight: number;
  /** How readily a good hand is bet and raised rather than called. */
  aggression: number;
  /** How often a bad hand is bet anyway. */
  bluff: number;
}

/**
 * Share of the pot a hand can expect to win against `opponents` random hands, found by
 * dealing out the rest of the cards many times.
 */
export function equity(
  hole: readonly Card[],
  community: readonly Card[],
  opponents: number,
  random: () => number,
  samples = 140,
): number {
  const known = new Set([...hole, ...community]);
  let won = 0;
  for (let i = 0; i < samples; i++) {
    const deck = shuffledDeck(random).filter((card) => !known.has(card));
    const board = [...community];
    while (board.length < 5) board.push(deck.pop() as Card);
    const mine = evaluate([...hole, ...board]).score;
    let best = 0;
    let ties = 0;
    for (let o = 0; o < opponents; o++) {
      const theirs = evaluate([deck.pop() as Card, deck.pop() as Card, ...board]).score;
      if (theirs > best) {
        best = theirs;
        ties = 0;
      }
      if (theirs === mine) ties++;
    }
    if (mine > best) won += 1;
    else if (mine === best) won += 1 / (ties + 1);
  }
  return won / samples;
}

export interface Decision {
  action: Action;
  /** How strong the player believes its hand is, 0 to 1, for tells. */
  strength: number;
  bluffing: boolean;
}

/** Decides what the seat whose turn it is should do. */
export function decide(game: PokerGame, persona: Persona, random: () => number): Decision {
  const seat = game.seats[game.toAct];
  const legal = game.legal();
  const opponents = Math.max(1, Math.min(4, game.contenders.length - 1));
  const chance = equity(seat.cards, game.community, opponents, random);
  // 1 means an average hand for this many players; 2 means twice its fair share of the pot.
  const value = chance * (opponents + 1);
  const pot = game.pot;
  const strength = Math.max(0, Math.min(1, (value - 0.5) / 2));
  const big = game.blinds[1];

  /** A raise to roughly `fraction` of the pot, clamped to what is legal; all in when nearly so. */
  const raise = (fraction: number): Action => {
    let to = game.currentBet + Math.max(game.minRaise, Math.round((pot * fraction) / big) * big);
    to = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, to));
    if (to > legal.maxRaiseTo * 0.7) to = legal.maxRaiseTo;
    return { type: 'raise', to };
  };

  if (legal.canCheck) {
    if (legal.canRaise && value > 1.55 - persona.aggression * 0.35) {
      return { action: raise(0.45 + random() * 0.4), strength, bluffing: false };
    }
    if (legal.canRaise && random() < persona.bluff * 0.22) {
      return { action: raise(0.5), strength, bluffing: true };
    }
    return { action: { type: 'check' }, strength, bluffing: false };
  }

  const price = legal.callAmount / (pot + legal.callAmount);
  const allIn = legal.callAmount >= seat.stack;
  // A big call for all the chips needs a real hand, not just the right price.
  const needed = price * (0.85 + persona.tight * 0.5) + (allIn ? 0.06 + persona.tight * 0.08 : 0);
  // Cheap calls before the flop are made with a wide range.
  const cheap = legal.callAmount <= big && game.street === 'preflop';
  if (chance < needed && !(cheap && value > 0.7 + persona.tight * 0.3)) {
    if (legal.canRaise && !allIn && random() < persona.bluff * 0.07) {
      return { action: raise(0.8), strength, bluffing: true };
    }
    return { action: { type: 'fold' }, strength, bluffing: false };
  }
  if (
    legal.canRaise &&
    value > 1.95 - persona.aggression * 0.45 &&
    random() < 0.35 + persona.aggression * 0.5
  ) {
    return { action: raise(0.6 + random() * 0.5), strength, bluffing: false };
  }
  return { action: { type: 'call' }, strength, bluffing: false };
}
