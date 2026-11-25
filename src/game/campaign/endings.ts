/**
 * The story's stakes: the Great Clock should be going again within DAY_LIMIT days, before the
 * Academy's term begins. How it ends depends on how many parts are home and how long it took.
 * The limit can be turned off ("Relaxed", in the settings): then the story ends, well, whenever
 * the last part comes home.
 */

export const DAY_LIMIT = 30;

export type Ending =
  /** Every part home within the limit: the Clock strikes for the first day of term. */
  | 'golden'
  /** Every part home, but after the limit: the Clock strikes late, to a half-empty courtyard. */
  | 'late'
  /** The limit passed with parts still out: term begins under a silent Clock. Play on. */
  | 'silent';

/** The ending reached, if any, after a day: `day` is days played so far. */
export function endingFor(
  partsHome: number,
  partsTotal: number,
  day: number,
  relaxed: boolean,
): Ending | null {
  const complete = partsTotal > 0 && partsHome >= partsTotal;
  if (relaxed) return complete ? 'golden' : null;
  if (complete) return day <= DAY_LIMIT ? 'golden' : 'late';
  return day >= DAY_LIMIT ? 'silent' : null;
}

/** Days left before the limit (never below 0); null when relaxed. */
export function daysLeft(day: number, relaxed: boolean): number | null {
  return relaxed ? null : Math.max(0, DAY_LIMIT - day);
}

/** Every ending; titles and texts are `ending.<ending>.*` in the text. */
export const ENDING_IDS: readonly Ending[] = ['golden', 'late', 'silent'];
