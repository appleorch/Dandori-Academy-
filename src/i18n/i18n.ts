import { EN, type MessageKey } from './en';

/**
 * Localisation. Every string the interface shows comes from a message table by key (`t`), and
 * every piece of game text kept with its data (lesson names and briefs, mode rules, relic
 * names, story pages) is looked up by a key with its English as the fallback (`content`).
 *
 * English is the source. The pseudo-locale is for testing: it accents every letter, wraps each
 * string in brackets and pads it by a third, so untranslated text, clipped labels and strings
 * glued together from pieces stand out on screen.
 *
 * To add a language: add its id to LOCALES, a message table with every key of EN (the type
 * checker insists), an optional content table for the game text, and an entry in LOCALE_NAMES.
 */

export const LOCALES = ['en', 'pseudo'] as const;
export type Locale = (typeof LOCALES)[number];

/** How each language names itself, for the settings. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  pseudo: 'Pseudo (testing)',
};

type Messages = Record<MessageKey, string>;

const MESSAGES: Record<Locale, Messages | null> = { en: EN, pseudo: null };

/** Game text per language, by content key (see `content`). English needs none: it is the data. */
const CONTENT: Record<Locale, Readonly<Record<string, string>>> = { en: {}, pseudo: {} };

let current: Locale = 'en';

/** Sets the language every later `t` and `content` call uses. */
export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

export type Params = Readonly<Record<string, string | number>>;

/** Fills `{name}` placeholders from `params`; unknown ones are left as they are. */
export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    params[name] === undefined ? whole : String(params[name]),
  );
}

const ACCENTS: Record<string, string> = {
  a: 'á',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'é',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'í',
  j: 'ĵ',
  k: 'ķ',
  l: 'ļ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ó',
  p: 'þ',
  q: 'ǫ',
  r: 'ŕ',
  s: 'š',
  t: 'ţ',
  u: 'ú',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ý',
  z: 'ž',
  A: 'Á',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'É',
  F: 'Ƒ',
  G: 'Ĝ',
  H: 'Ĥ',
  I: 'Í',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ļ',
  M: 'Ṁ',
  N: 'Ñ',
  O: 'Ó',
  P: 'Þ',
  Q: 'Ǫ',
  R: 'Ŕ',
  S: 'Š',
  T: 'Ţ',
  U: 'Ú',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ý',
  Z: 'Ž',
};

/**
 * The pseudo-locale's version of a string: letters accented (placeholders kept intact so they
 * still fill in), padded by about a third, and bracketed.
 */
export function pseudo(text: string): string {
  const accented = text
    .split(/(\{\w+\})/)
    .map((part) =>
      /^\{\w+\}$/.test(part) ? part : part.replace(/[A-Za-z]/g, (c) => ACCENTS[c] ?? c),
    )
    .join('');
  const padding = '·'.repeat(Math.ceil(text.length / 3));
  return `⟦${accented}${padding}⟧`;
}

/** A message in the current language, with its placeholders filled. */
export function t(key: MessageKey, params?: Params): string {
  const table = MESSAGES[current];
  const text = current === 'pseudo' ? pseudo(EN[key]) : (table?.[key] ?? EN[key]);
  return interpolate(text, params);
}

/**
 * Game text kept with its data: `source` is the English, and `key` names it for other
 * languages (for example `level.many-hands.name`, `mode.hunt.rule.0`, `relic.pocketwatch.name`).
 */
export function content(key: string, source: string, params?: Params): string {
  const text = current === 'pseudo' ? pseudo(source) : (CONTENT[current][key] ?? source);
  return interpolate(text, params);
}

/** Whether a string came out of the pseudo-locale: for tests that look for untranslated text. */
export function isPseudo(text: string): boolean {
  return text.startsWith('⟦') && text.endsWith('⟧');
}
