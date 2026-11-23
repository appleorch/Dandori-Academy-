import type { LevelDefinition } from './level';

/**
 * How twin pairs are told apart. Every pair in a lesson gets its own colour, its own marker
 * shape and its own letter, by its place among the lesson's pairs, so no two pairs in a lesson
 * ever look alike.
 */
export const TWIN_COLOURS = ['#46d6ff', '#ff5fd2', '#9cf04a', '#ffb02e', '#b58cff', '#ff6a5a'];
/** Sides of each pair's marker ring: hexagon, triangle, square, pentagon, octagon, circle. */
export const TWIN_SIDES = [6, 3, 4, 5, 8, 40];
export const TWIN_SHAPE_NAMES = ['hexagon', 'triangle', 'square', 'pentagon', 'octagon', 'circle'];

export interface TwinStyle {
  index: number;
  /** "A", "B"... */
  letter: string;
  colour: string;
  sides: number;
  shape: string;
}

/** The lesson's twin runes, in the order the pairs first appear. */
export function twinRunes(level: LevelDefinition): string[] {
  const runes: string[] = [];
  for (const shard of level.treasures) {
    if (shard.twin && !runes.includes(shard.twin)) runes.push(shard.twin);
  }
  return runes;
}

export function twinStyle(level: LevelDefinition, rune: string): TwinStyle {
  const index = Math.max(0, twinRunes(level).indexOf(rune));
  return {
    index,
    letter: String.fromCharCode(65 + index),
    colour: TWIN_COLOURS[index % TWIN_COLOURS.length],
    sides: TWIN_SIDES[index % TWIN_SIDES.length],
    shape: TWIN_SHAPE_NAMES[index % TWIN_SHAPE_NAMES.length],
  };
}
