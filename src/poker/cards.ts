/**
 * A playing card is a number from 0 to 51: its rank is `card % 13` (0 is a two, 12 an
 * ace) and its suit is `floor(card / 13)`.
 */
export type Card = number;

export const RANK_LABELS = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
] as const;
export const RANK_NAMES = [
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Jack',
  'Queen',
  'King',
  'Ace',
] as const;
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'] as const;

export function rankOf(card: Card): number {
  return card % 13;
}

export function suitOf(card: Card): number {
  return Math.floor(card / 13);
}

export function isRed(card: Card): boolean {
  const suit = suitOf(card);
  return suit === 1 || suit === 2;
}

/** "K♠", "10♦". */
export function cardLabel(card: Card): string {
  return `${RANK_LABELS[rankOf(card)]}${SUIT_SYMBOLS[suitOf(card)]}`;
}

export function makeCard(rank: number, suit: number): Card {
  return suit * 13 + rank;
}

/** A full deck in random order (Fisher-Yates), using the given source of numbers in [0, 1). */
export function shuffledDeck(random: () => number): Card[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
