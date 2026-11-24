/** All-ins in a row, by the Warden's own choice, that get the Warden up from the table. */
export const WALKOUT_SHOVES = 3;

/**
 * The Warden's run of all-ins after one of their own actions: one longer if it put every chip
 * in (a shove, or a call for everything), and back to none for anything else. Blinds that
 * happen to take the last chips are not a choice, so they never reach here.
 */
export function allInStreak(streak: number, lastAction: string): number {
  return lastAction.startsWith('All in') ? streak + 1 : 0;
}
