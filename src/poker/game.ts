import { shuffledDeck, type Card } from './cards';
import { evaluate } from './hand';

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type Action =
  { type: 'fold' } | { type: 'check' } | { type: 'call' } | { type: 'raise'; to: number };

export interface Seat {
  name: string;
  stack: number;
  cards: Card[];
  /** Chips put in on the current street. */
  bet: number;
  /** Chips put in over the whole hand. */
  committed: number;
  folded: boolean;
  allIn: boolean;
  /** Out of chips and out of the game. */
  out: boolean;
  /** Whether the seat has acted since the last raise. */
  acted: boolean;
  /** "Raise to 120", "Fold"... for the table to show. */
  lastAction: string;
  /** Cards turned face up at a showdown. */
  revealed: boolean;
}

export interface PotResult {
  amount: number;
  winners: number[];
  /** The winning hand's name; empty when everyone else folded. */
  hand: string;
}

export interface LegalActions {
  canCheck: boolean;
  /** Chips needed to call; never more than the seat's stack. */
  callAmount: number;
  canRaise: boolean;
  /** Smallest and largest legal "raise to" totals for this street. */
  minRaiseTo: number;
  maxRaiseTo: number;
}

/** Small and big blind for each level; the level rises every few hands. */
export const BLIND_LEVELS: readonly (readonly [number, number])[] = [
  [10, 20],
  [15, 30],
  [25, 50],
  [40, 80],
  [60, 120],
  [100, 200],
  [150, 300],
  [250, 500],
];
export const HANDS_PER_LEVEL = 6;

/**
 * No-limit Texas Hold'em for one table, as a state machine with no timing in it.
 * While `toAct` names a seat, call `act`. Otherwise call `advance` to deal the next
 * street, run the showdown, or (after `handOver`) start the next hand with `startHand`.
 */
export class PokerGame {
  readonly seats: Seat[];
  dealer = -1;
  community: Card[] = [];
  street: Street = 'preflop';
  /** Seat whose turn it is, or -1 when the betting round is closed. */
  toAct = -1;
  /** The bet every seat must match on this street. */
  currentBet = 0;
  /** Smallest legal raise over `currentBet`. */
  minRaise = 0;
  handNumber = 0;
  handOver = true;
  results: PotResult[] = [];
  private deck: Card[] = [];

  constructor(
    names: readonly string[],
    startingStack: number,
    private readonly random: () => number,
  ) {
    this.seats = names.map((name) => ({
      name,
      stack: startingStack,
      cards: [],
      bet: 0,
      committed: 0,
      folded: false,
      allIn: false,
      out: false,
      acted: false,
      lastAction: '',
      revealed: false,
    }));
  }

  get blinds(): readonly [number, number] {
    const level = Math.min(
      BLIND_LEVELS.length - 1,
      Math.floor(Math.max(0, this.handNumber - 1) / HANDS_PER_LEVEL),
    );
    return BLIND_LEVELS[level];
  }

  /** Everything bet so far this hand. */
  get pot(): number {
    return this.seats.reduce((sum, seat) => sum + seat.committed, 0);
  }

  /** Seats still holding cards. */
  get contenders(): number[] {
    return this.seats.flatMap((seat, index) => (!seat.out && !seat.folded ? [index] : []));
  }

  /** The last seat with chips once everyone else is out, or -1 while the game goes on. */
  get champion(): number {
    const alive = this.seats.flatMap((seat, index) => (seat.out ? [] : [index]));
    return alive.length === 1 ? alive[0] : -1;
  }

  /** Next seat after `from`, going round the table, that satisfies `test`; -1 if none does. */
  private next(from: number, test: (seat: Seat) => boolean): number {
    for (let step = 1; step <= this.seats.length; step++) {
      const index = (from + step) % this.seats.length;
      if (test(this.seats[index])) return index;
    }
    return -1;
  }

  private pay(seat: Seat, amount: number): number {
    const paid = Math.min(seat.stack, amount);
    seat.stack -= paid;
    seat.bet += paid;
    seat.committed += paid;
    if (seat.stack === 0) seat.allIn = true;
    return paid;
  }

  /** Shuffles, moves the button, posts the blinds and deals two cards to every seat still in the game. */
  startHand(): void {
    if (this.champion >= 0) return;
    this.handNumber++;
    this.handOver = false;
    this.results = [];
    this.community = [];
    this.street = 'preflop';
    this.deck = shuffledDeck(this.random);
    for (const seat of this.seats) {
      seat.cards = [];
      seat.bet = 0;
      seat.committed = 0;
      seat.folded = false;
      seat.allIn = false;
      seat.acted = false;
      seat.lastAction = '';
      seat.revealed = false;
    }
    const inGame = (seat: Seat): boolean => !seat.out;
    this.dealer = this.next(this.dealer, inGame);
    const players = this.seats.filter(inGame).length;
    // Heads-up, the button posts the small blind and acts first before the flop.
    const smallSeat = players === 2 ? this.dealer : this.next(this.dealer, inGame);
    const bigSeat = this.next(smallSeat, inGame);
    const [small, big] = this.blinds;
    this.pay(this.seats[smallSeat], small);
    this.seats[smallSeat].lastAction = `Small blind ${small}`;
    this.pay(this.seats[bigSeat], big);
    this.seats[bigSeat].lastAction = `Big blind ${big}`;
    for (let round = 0; round < 2; round++) {
      for (let step = 1; step <= this.seats.length; step++) {
        const seat = this.seats[(this.dealer + step) % this.seats.length];
        if (!seat.out) seat.cards.push(this.deck.pop() as Card);
      }
    }
    this.currentBet = big;
    this.minRaise = big;
    this.toAct = this.nextToAct(bigSeat);
  }

  /** The next seat that still owes an action this street, or -1 when the round is closed. */
  private nextToAct(from: number): number {
    const able = this.seats.filter((seat) => !seat.out && !seat.folded && !seat.allIn);
    // With nobody left to bet against, there is nothing to decide.
    if (able.length <= 1 && able.every((seat) => seat.bet >= this.currentBet)) return -1;
    return this.next(
      from,
      (seat) =>
        !seat.out && !seat.folded && !seat.allIn && (!seat.acted || seat.bet < this.currentBet),
    );
  }

  legal(): LegalActions {
    const seat = this.seats[this.toAct];
    const owed = Math.max(0, this.currentBet - seat.bet);
    const maxRaiseTo = seat.bet + seat.stack;
    // A raise needs somebody able to answer it.
    const others = this.seats.some(
      (other) => other !== seat && !other.out && !other.folded && !other.allIn,
    );
    return {
      canCheck: owed === 0,
      callAmount: Math.min(owed, seat.stack),
      canRaise: others && maxRaiseTo > this.currentBet,
      minRaiseTo: Math.min(maxRaiseTo, this.currentBet + this.minRaise),
      maxRaiseTo,
    };
  }

  /** Applies the action of the seat whose turn it is. Illegal actions fall back to the nearest legal one. */
  act(action: Action): void {
    if (this.toAct < 0 || this.handOver) return;
    const index = this.toAct;
    const seat = this.seats[index];
    const legal = this.legal();
    let move = action;
    if (move.type === 'check' && !legal.canCheck) move = { type: 'call' };
    if (move.type === 'fold' && legal.canCheck) move = { type: 'check' };
    if (move.type === 'raise' && !legal.canRaise) move = { type: 'call' };

    if (move.type === 'fold') {
      seat.folded = true;
      seat.lastAction = 'Fold';
    } else if (move.type === 'check') {
      seat.lastAction = 'Check';
    } else if (move.type === 'call') {
      this.pay(seat, legal.callAmount);
      seat.lastAction = seat.allIn
        ? 'All in'
        : legal.callAmount > 0
          ? `Call ${legal.callAmount}`
          : 'Check';
    } else {
      const to = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(move.to)));
      const opened = this.currentBet === 0;
      this.pay(seat, to - seat.bet);
      // Only a full raise raises the price of the next one.
      if (to - this.currentBet >= this.minRaise) this.minRaise = to - this.currentBet;
      this.currentBet = to;
      for (const other of this.seats) other.acted = false;
      seat.lastAction = seat.allIn ? `All in ${to}` : opened ? `Bet ${to}` : `Raise to ${to}`;
    }
    seat.acted = true;

    if (this.contenders.length === 1) {
      this.award();
      return;
    }
    this.toAct = this.nextToAct(index);
  }

  /** With the betting closed: deals the next street, or runs the showdown after the river. */
  advance(): void {
    if (this.handOver || this.toAct >= 0) return;
    for (const seat of this.seats) {
      seat.bet = 0;
      seat.acted = false;
    }
    this.currentBet = 0;
    this.minRaise = this.blinds[1];
    if (this.street === 'river') {
      this.street = 'showdown';
      this.award();
      return;
    }
    const deal = this.street === 'preflop' ? 3 : 1;
    for (let i = 0; i < deal; i++) this.community.push(this.deck.pop() as Card);
    this.street = this.street === 'preflop' ? 'flop' : this.street === 'flop' ? 'turn' : 'river';
    this.toAct = this.nextToAct(this.dealer);
  }

  /**
   * Ends the hand and pays it out. Chips are split into a main pot and side pots by how
   * much each seat put in, so a seat that is all in can only win what it could match.
   */
  private award(): void {
    this.toAct = -1;
    this.handOver = true;
    const contenders = this.contenders;
    const showdown = contenders.length > 1;
    const values = new Map<number, ReturnType<typeof evaluate>>();
    if (showdown) {
      for (const index of contenders) {
        const seat = this.seats[index];
        seat.revealed = true;
        values.set(index, evaluate([...seat.cards, ...this.community]));
      }
    }
    const levels = [...new Set(this.seats.map((seat) => seat.committed))]
      .filter((level) => level > 0)
      .sort((a, b) => a - b);
    const pots: PotResult[] = [];
    let previous = 0;
    for (const level of levels) {
      let amount = 0;
      for (const seat of this.seats) {
        amount += Math.min(seat.committed, level) - Math.min(seat.committed, previous);
      }
      previous = level;
      const eligible = contenders.filter((index) => this.seats[index].committed >= level);
      // Chips nobody left in the hand can claim go to the pot below.
      if (eligible.length === 0) {
        if (pots.length > 0) pots[pots.length - 1].amount += amount;
        continue;
      }
      let winners = eligible;
      let hand = '';
      if (showdown) {
        const best = Math.max(...eligible.map((index) => values.get(index)?.score ?? 0));
        winners = eligible.filter((index) => values.get(index)?.score === best);
        hand = values.get(winners[0])?.name ?? '';
      }
      const same = pots.find(
        (pot) =>
          pot.winners.length === winners.length && pot.winners.every((w, i) => w === winners[i]),
      );
      if (same) same.amount += amount;
      else pots.push({ amount, winners, hand });
    }
    for (const pot of pots) {
      const share = Math.floor(pot.amount / pot.winners.length);
      let odd = pot.amount - share * pot.winners.length;
      // Odd chips go one at a time to the winners nearest the button's left.
      const order = [...pot.winners].sort(
        (a, b) =>
          ((a - this.dealer - 1 + this.seats.length) % this.seats.length) -
          ((b - this.dealer - 1 + this.seats.length) % this.seats.length),
      );
      for (const index of order) {
        this.seats[index].stack += share + (odd > 0 ? 1 : 0);
        if (odd > 0) odd--;
      }
    }
    this.results = pots;
    for (const seat of this.seats) {
      seat.bet = 0;
      if (!seat.out && seat.stack === 0) seat.out = true;
    }
  }
}
