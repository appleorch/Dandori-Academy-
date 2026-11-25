/**
 * The Great Clock's gifts. Every part brought home puts a little of the Clock's old power back
 * into the grounds: the first seven parts home each grant a lasting ability, in this order,
 * whichever parts they are and wherever they were found. They are shown at the base camp and
 * announced as each part comes home.
 */

export type Ability = 'radar' | 'whistle' | 'kiln' | 'carry' | 'sunset' | 'bridgekit' | 'lantern';

/** The order the gifts come in; their names and descriptions are `gift.<ability>.*` in the text. */
export const CLOCK_UPGRADES: readonly Ability[] = [
  'radar',
  'whistle',
  'kiln',
  'carry',
  'sunset',
  'bridgekit',
  'lantern',
];

/** The abilities granted by this many parts home. */
export function abilitiesFor(partsHome: number): Set<Ability> {
  return new Set(CLOCK_UPGRADES.slice(0, Math.max(0, partsHome)));
}

/** The gift the next part home will grant, or null once all of them are in. */
export function nextUpgrade(partsHome: number): Ability | null {
  return CLOCK_UPGRADES[partsHome] ?? null;
}

/** What each ability changes in a day's rules. */
export const UPGRADE_EFFECT = {
  whistleReach: 4 / 3,
  kilnInterval: 0.55,
  carrySpeed: 1.1,
  sunsetRadius: 1.5,
  logsPerDelivery: 2,
} as const;
