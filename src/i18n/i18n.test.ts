import { afterEach, describe, expect, it } from 'vitest';
import { EN } from './en';
import { content, interpolate, isPseudo, pseudo, setLocale, t } from './i18n';

afterEach(() => setLocale('en'));

describe('localisation', () => {
  it('fills placeholders and leaves unknown ones as they are', () => {
    expect(interpolate('Day {day} of {total}', { day: 3, total: 9 })).toBe('Day 3 of 9');
    expect(interpolate('Day {day}', {})).toBe('Day {day}');
    expect(t('camp.day', { day: 4 })).toBe('Day 4');
  });

  it('has a message for every key, with no stray spaces', () => {
    for (const [key, text] of Object.entries(EN)) {
      expect(text.trim(), key).toBe(text);
      expect(text.length, key).toBeGreaterThan(0);
    }
  });

  it('turns every message and piece of game text into pseudo text, keeping placeholders', () => {
    setLocale('pseudo');
    expect(isPseudo(t('menu.beginStory'))).toBe(true);
    expect(t('camp.day', { day: 4 })).toContain('4');
    expect(pseudo('Day {day}')).toContain('{day}');
    expect(isPseudo(content('level.x.name', 'Many Hands'))).toBe(true);
    // Padded by about a third, to show where a longer language would clip.
    expect(pseudo('Twelve parts').length).toBeGreaterThan('Twelve parts'.length * 1.3);
  });

  it('falls back to English game text where a language has none', () => {
    expect(content('level.x.name', 'Many Hands')).toBe('Many Hands');
  });
});

/**
 * Screens moved onto the message tables. Any text written straight into their markup would
 * escape translation, so it is looked for here. Every screen is checked.
 */
/** Every screen but the developer's performance overlay, which stays in English. */
const NOT_CONVERTED = new Set(['src/ui/PerfOverlay.tsx']);

/** The screens' source text, read through Vite. */
const SOURCES = import.meta.glob<string>('../ui/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const CONVERTED = Object.keys(SOURCES)
  .map((path) => path.replace('../ui/', 'src/ui/'))
  .filter((path) => !NOT_CONVERTED.has(path));

describe('converted screens', () => {
  it.each(CONVERTED)('%s has no text written straight into its markup', (path) => {
    const source = SOURCES[path.replace('src/ui/', '../ui/')];
    expect(source, path).toBeDefined();
    // Text between a closing '>' and the next '<' or '{', with at least two letters in a row.
    const literals = [...source.matchAll(/>\s*([^<>{}]*[A-Za-z]{2,}[^<>{}]*)\s*(?=[<{])/g)]
      .map((match) => match[1].trim())
      // Arrow functions and comparisons in code look like '>' too; markup text has no '=' or '('.
      .filter((text) => text && !/[=();?$`]|=>|&&|\|\||^\w+ [-+*/] \w+$/.test(text))
      // Type arguments look like markup too: `new Set<string>()`, `Promise<void>[]`.
      .filter((text) => !/^(new \w+|void\]|Promise)$/.test(text));
    expect(literals).toEqual([]);
  });
});
