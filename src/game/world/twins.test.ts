import { describe, expect, it } from 'vitest';
import { LEVELS } from './level';
import { twinRunes, twinStyle } from './twins';

describe('twin pairs', () => {
  it.each(LEVELS.filter((level) => twinRunes(level).length > 0))(
    '$name: every pair looks different, and both halves of a pair alike',
    (level) => {
      const runes = twinRunes(level);
      const styles = runes.map((rune) => twinStyle(level, rune));
      expect(new Set(styles.map((style) => style.colour)).size).toBe(runes.length);
      expect(new Set(styles.map((style) => style.sides)).size).toBe(runes.length);
      expect(new Set(styles.map((style) => style.letter)).size).toBe(runes.length);
      for (const rune of runes) {
        expect(level.treasures.filter((shard) => shard.twin === rune)).toHaveLength(2);
      }
    },
  );
});
