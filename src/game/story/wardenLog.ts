/**
 * The Warden's log: a short journal entry written at the end of every story day from what
 * happened in it (parts and relics found, beasts beaten, losses, firsts). Plain sentences, in the
 * Warden's own dry voice; collected in the Journal.
 */

export interface DayFacts {
  day: number;
  section: string;
  /** Names of the Clock parts brought home today. */
  parts: readonly string[];
  relics: number;
  beasts: number;
  gates: number;
  bridges: number;
  beacons: number;
  grown: number;
  lost: number;
  leftBehind: number;
  survivors: number;
  /** Gifts of the Clock granted today, by name. */
  gifts: readonly string[];
  /** True on the first day in this section. */
  firstDay: boolean;
  /** True on the day the section's last part came home. */
  finished: boolean;
}

const list = (names: readonly string[]): string =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

const plural = (count: number, one: string, many: string) =>
  `${count === 1 ? 'one' : count} ${count === 1 ? one : many}`;

/** The day's entry: a few sentences, never empty. */
export function wardenLog(f: DayFacts): string {
  const said: string[] = [];
  if (f.firstDay) said.push(`First day in ${f.section}.`);
  if (f.parts.length > 0) {
    said.push(
      f.parts.length === 1
        ? `Brought home ${f.parts[0]}.`
        : `Brought home ${list(f.parts)}, all in one day.`,
    );
  }
  if (f.relics > 0) said.push(`Found ${plural(f.relics, 'other relic', 'other relics')} besides.`);
  const works: string[] = [];
  if (f.beasts > 0) works.push(plural(f.beasts, 'beast beaten', 'beasts beaten'));
  if (f.gates > 0) works.push(plural(f.gates, 'gate broken', 'gates broken'));
  if (f.bridges > 0) works.push(plural(f.bridges, 'bridge built', 'bridges built'));
  if (f.beacons > 0) works.push(plural(f.beacons, 'beacon lit', 'beacons lit'));
  if (works.length > 0) said.push(`${list(works).replace(/^./, (c) => c.toUpperCase())}.`);
  if (f.grown > 0) said.push(`The Kiln grew ${f.grown} more.`);
  if (f.gifts.length > 0) said.push(`The Clock gave us ${list(f.gifts)}.`);
  if (f.lost === 0 && f.leftBehind === 0) {
    said.push('Nobody lost. Everyone home by sunset.');
  } else {
    if (f.lost > 0) said.push(`Lost ${plural(f.lost, 'Sproutling', 'Sproutlings')} to the day.`);
    if (f.leftBehind > 0)
      said.push(
        `${plural(f.leftBehind, 'was', 'were')} left out at sunset; I should have called sooner.`.replace(
          /^./,
          (c) => c.toUpperCase(),
        ),
      );
  }
  if (f.finished) said.push(`Every part of ${f.section} is home.`);
  if (said.length === (f.lost === 0 && f.leftBehind === 0 ? 1 : 0) || said.length === 0) {
    said.unshift('A quiet day. We looked about, and learned the ground.');
  }
  return `Day ${f.day}. ${said.join(' ')}`;
}
