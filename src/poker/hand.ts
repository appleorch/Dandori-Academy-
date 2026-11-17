import { RANK_NAMES, rankOf, suitOf, type Card } from './cards';

export const CATEGORIES = [
  'High card',
  'Pair',
  'Two pair',
  'Three of a kind',
  'Straight',
  'Flush',
  'Full house',
  'Four of a kind',
  'Straight flush',
] as const;

export interface HandValue {
  /** Higher beats lower; equal scores split the pot. */
  score: number;
  /** Index into CATEGORIES. */
  category: number;
  /** "Pair of Kings", "Flush, Ace high". */
  name: string;
}

/** Packs a category and up to five ranks, most important first, into one comparable number. */
function pack(category: number, ranks: readonly number[]): number {
  let score = category;
  for (let i = 0; i < 5; i++) score = score * 13 + (ranks[i] ?? 0);
  return score;
}

/** Top rank of the best straight in a set of ranks given as a bit mask, or -1. The ace also plays low. */
function straightTop(mask: number): number {
  for (let top = 12; top >= 4; top--) {
    const run = 0b11111 << (top - 4);
    if ((mask & run) === run) return top;
  }
  // The wheel: A-2-3-4-5, which counts as five high.
  const wheel = (1 << 12) | 0b1111;
  return (mask & wheel) === wheel ? 3 : -1;
}

const plural = (rank: number): string => (rank === 4 ? 'Sixes' : `${RANK_NAMES[rank]}s`);

/** The best five-card poker hand that can be made from five to seven cards. */
export function evaluate(cards: readonly Card[]): HandValue {
  const counts = new Array<number>(13).fill(0);
  const suitMasks = [0, 0, 0, 0];
  const suitCounts = [0, 0, 0, 0];
  let mask = 0;
  for (const card of cards) {
    const rank = rankOf(card);
    const suit = suitOf(card);
    counts[rank]++;
    mask |= 1 << rank;
    suitMasks[suit] |= 1 << rank;
    suitCounts[suit]++;
  }
  /** Ranks held exactly `n` times, highest first. */
  const held = (n: number): number[] => {
    const ranks: number[] = [];
    for (let rank = 12; rank >= 0; rank--) if (counts[rank] === n) ranks.push(rank);
    return ranks;
  };
  /** The highest ranks in the hand, skipping any in `used`. */
  const kickers = (used: readonly number[], n: number): number[] => {
    const ranks: number[] = [];
    for (let rank = 12; rank >= 0 && ranks.length < n; rank--) {
      if (counts[rank] > 0 && !used.includes(rank)) ranks.push(rank);
    }
    return ranks;
  };
  const made = (category: number, ranks: number[], name: string): HandValue => ({
    score: pack(category, ranks),
    category,
    name,
  });

  const flushSuit = suitCounts.findIndex((count) => count >= 5);
  if (flushSuit >= 0) {
    const top = straightTop(suitMasks[flushSuit]);
    if (top >= 0) {
      return made(8, [top], top === 12 ? 'Royal flush' : `Straight flush, ${RANK_NAMES[top]} high`);
    }
  }
  const quads = held(4);
  if (quads.length > 0) {
    return made(7, [quads[0], ...kickers(quads, 1)], `Four ${plural(quads[0])}`);
  }
  const trips = held(3);
  const pairs = held(2);
  if (trips.length > 0 && (trips.length > 1 || pairs.length > 0)) {
    // A second set of three can fill the house as its pair.
    const over = Math.max(trips[1] ?? -1, pairs[0] ?? -1);
    return made(6, [trips[0], over], `Full house, ${plural(trips[0])} over ${plural(over)}`);
  }
  if (flushSuit >= 0) {
    const ranks: number[] = [];
    for (let rank = 12; rank >= 0 && ranks.length < 5; rank--) {
      if (suitMasks[flushSuit] & (1 << rank)) ranks.push(rank);
    }
    return made(5, ranks, `Flush, ${RANK_NAMES[ranks[0]]} high`);
  }
  const top = straightTop(mask);
  if (top >= 0) return made(4, [top], `Straight, ${RANK_NAMES[top]} high`);
  if (trips.length > 0) {
    return made(3, [trips[0], ...kickers(trips, 2)], `Three ${plural(trips[0])}`);
  }
  if (pairs.length >= 2) {
    const two = [pairs[0], pairs[1]];
    return made(
      2,
      [...two, ...kickers(two, 1)],
      `Two pair, ${plural(two[0])} and ${plural(two[1])}`,
    );
  }
  if (pairs.length === 1) {
    return made(1, [pairs[0], ...kickers(pairs, 3)], `Pair of ${plural(pairs[0])}`);
  }
  const high = kickers([], 5);
  return made(0, high, `${RANK_NAMES[high[0]]} high`);
}
