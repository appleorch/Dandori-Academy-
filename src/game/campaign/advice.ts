import type { MenuScreen } from '../core/gameStore';
import type { CampaignState, DayForm } from './campaign';

/**
 * The base camp's advice, from the third day on: where to sharpen your dandori, chosen by what
 * the last few days show most. Idle hands point to Time Attack's first lesson; losses and slow
 * hauls to the challenges built for them.
 */
export type Weakness = 'idle' | 'losses' | 'slow' | 'none';

export interface Advice {
  weakness: Weakness;
  /** Where the advice leads: a screen, or a lesson to play straight away. */
  screen: MenuScreen;
  lesson?: string;
}

/** From this day on (days played), the base camp gives advice. */
export const ADVICE_FROM = 3;
/** An idle share above this is too many hands standing about. */
const IDLE_TOO_MUCH = 0.25;
/** More than this many lost a day is too many. */
const LOSSES_TOO_MANY = 3;
/** Fewer hauls a minute than this is slow. */
const HAULS_TOO_FEW = 1;

const mean = (form: readonly DayForm[], key: keyof DayForm) =>
  form.reduce((sum, day) => sum + day[key], 0) / Math.max(1, form.length);

/** What the days so far show most, scored against each threshold. */
export function weakness(form: readonly DayForm[]): Weakness {
  if (form.length === 0) return 'none';
  const scores: [Weakness, number][] = [
    ['losses', mean(form, 'lost') / LOSSES_TOO_MANY],
    ['idle', mean(form, 'idle') / IDLE_TOO_MUCH],
    ['slow', HAULS_TOO_FEW / Math.max(0.01, mean(form, 'hauls'))],
  ];
  const [worst, score] = scores.reduce((a, b) => (b[1] > a[1] ? b : a));
  return score > 1 ? worst : 'none';
}

/** The advice for the base camp, or null before the third day. */
export function adviceFor(state: CampaignState): Advice | null {
  if (state.day < ADVICE_FROM) return null;
  const weak = weakness(state.form);
  if (weak === 'idle') return { weakness: weak, screen: 'map', lesson: 'many-hands' };
  if (weak === 'losses' || weak === 'slow') return { weakness: weak, screen: 'challenges' };
  return { weakness: weak, screen: 'map' };
}
