/**
 * Finish times measured from the test player (`src/game/world/testBot.ts`), rounded up to the
 * next second, as the story's Platinum times are. Checked by `src/game/modes/modes.test.ts`.
 */

/**
 * Platinum times for the challenges that end once everything is collected (every Sunshard,
 * every beast and its carcass): the Mission and the Dandori Challenge.
 */
export const EVERYTHING_TIMES: Readonly<Record<string, number>> = {
  'many-hands': 21,
  'over-the-wall': 65,
  'the-guard': 40,
  'first-light': 105,
  'long-haul': 218,
  'divide-and-conquer': 97,
  'the-gauntlet': 157,
  'growing-pains': 166,
  switchbacks: 285,
  'final-exam': 363,
  'bramble-gate': 127,
  'drip-line': 163,
  'gravelmaws-pit': 118,
  'three-roots': 136,
  'rush-hour': 294,
  'the-bellwether': 202,
  crossroads: 180,
  'the-span': 507,
  'matched-pairs': 171,
  'glass-river': 390,
  'graduation-day': 563,
  'the-undercroft': 444,
  'terrace-gardens': 545,
  'the-long-drop': 643,
  'crystal-conservatory': 516,
  'clockwork-causeway': 730,
  'restoration-day': 679,
  'the-cistern': 114,
  'skitter-warren': 209,
  'the-root-cellar': 149,
};

/**
 * Platinum times for the Lean Squad Trial, collecting everything with the Kiln growing nothing.
 * Lessons the starting squad cannot finish on its own are not listed, and offer no trial.
 */
export const TRIAL_TIMES: Readonly<Record<string, number>> = {
  'many-hands': 21,
  'over-the-wall': 68,
  'divide-and-conquer': 103,
  'the-gauntlet': 162,
  switchbacks: 271,
  'final-exam': 432,
  'bramble-gate': 200,
  'drip-line': 205,
  'gravelmaws-pit': 166,
  'rush-hour': 342,
  'the-span': 560,
  'matched-pairs': 199,
  'glass-river': 419,
  'terrace-gardens': 577,
  'crystal-conservatory': 685,
  'the-cistern': 159,
};
