import {
  bonusParts,
  shardCount,
  sproutlingsPossible,
  treasureTotal,
  type LevelDefinition,
} from '../world/level';
import {
  needsClear,
  POINTS_PER_SECOND,
  POINTS_PER_WORKER,
  RANKS,
  rankScore,
  type Rank,
  type ScoreBreakdown,
} from './scoring';

/** How many of something there were and how many the day got, with their points. */
export interface Count {
  got: number;
  of: number;
  points: number;
  possible: number;
}

/**
 * A finished day taken apart: what was required and what was optional, what each part was
 * worth against what it could have been, and what became of the squad.
 */
export interface DayTally {
  /** Sunshards: every one must come home to clear the lesson. */
  required: Count;
  /** Bonus treasure, never required: Glowcaps, twin pairs on time, Dewglass kept whole. */
  optional: {
    glowcaps: Count;
    twins: Count;
    dewglass: Count;
    points: number;
    possible: number;
  };
  sproutlings: {
    /** Alive at the end of the day. */
    alive: number;
    lost: number;
    /** The squad the day started with. */
    start: number;
    /** Most the lesson could end with; see `sproutlingsPossible`. */
    possible: number;
    grown: number;
  };
  /** Whole seconds left on the clock; they only score when every Sunshard came home. */
  timeLeft: number;
  cleared: boolean;
}

/** What a finished day's simulation knows, as far as the tally needs it. */
export interface DayFacts {
  shardsHome: number;
  treasureValue: number;
  bonus: {
    glowcaps: number;
    glowcapPoints: number;
    twins: number;
    twinPoints: number;
    dewglass: number;
    dewglassPoints: number;
  };
  alive: number;
  lost: number;
  grown: number;
  timeLeft: number;
}

export function tallyDay(level: LevelDefinition, facts: DayFacts): DayTally {
  const parts = bonusParts(level);
  const { bonus } = facts;
  const bonusPoints = bonus.glowcapPoints + bonus.twinPoints + bonus.dewglassPoints;
  const total = shardCount(level);
  return {
    required: {
      got: facts.shardsHome,
      of: total,
      points: Math.max(0, facts.treasureValue - bonusPoints),
      possible: treasureTotal(level),
    },
    optional: {
      glowcaps: {
        got: bonus.glowcaps,
        of: parts.glowcaps,
        points: bonus.glowcapPoints,
        possible: parts.glowcapPoints,
      },
      twins: {
        got: bonus.twins,
        of: parts.twins,
        points: bonus.twinPoints,
        possible: parts.twinPoints,
      },
      dewglass: {
        got: bonus.dewglass,
        of: parts.dewglass,
        points: bonus.dewglassPoints,
        possible: parts.dewglassPoints,
      },
      points: bonusPoints,
      possible: parts.glowcapPoints + parts.twinPoints + parts.dewglassPoints,
    },
    sproutlings: {
      alive: facts.alive,
      lost: facts.lost,
      start: level.startingWorkers,
      possible: sproutlingsPossible(level),
      grown: facts.grown,
    },
    timeLeft: Math.max(0, Math.ceil(facts.timeLeft)),
    cleared: facts.shardsHome === total,
  };
}

/** The next rank above the one earned, or null at Diamond. */
export function nextRank(rank: Rank): Rank | null {
  const index = RANKS.indexOf(rank);
  return index < RANKS.length - 1 ? RANKS[index + 1] : null;
}

/**
 * One place the day could have ranked higher. Glowcaps are never one: they add to the score
 * but not to the rank.
 */
export interface Lever {
  kind: 'required' | 'twins' | 'dewglass' | 'losses' | 'time';
  text: string;
  /** Points it would have added; for time, points per second sooner. */
  points: number;
}

export interface Advice {
  /** The rank aimed at, or null at Diamond. */
  target: Rank | null;
  /** Points short of it. */
  short: number;
  /** Why it cannot be reached on score alone: Platinum and Diamond need every Sunshard. */
  blocker: string | null;
  /** Where points were left behind, biggest first; time last. */
  levers: Lever[];
  /** A plain answer to "what kept me from the next rank?". */
  summary: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * What it would take to do better: how far the next rank is, and every place the day left
 * points behind: Sunshards not home, bonuses not taken, Sproutlings lost, and time.
 */
export function adviseDay(
  level: LevelDefinition,
  score: ScoreBreakdown,
  tally: DayTally,
  lossPenaltyEach: number,
): Advice {
  const target = nextRank(score.rank);
  // The rank is judged on the score without Glowcaps, so the gap is measured the same way.
  const short = target ? Math.max(0, rankScore(target, level) - score.ranked) : 0;
  const levers: Lever[] = [];
  const { required, optional, sproutlings } = tally;
  if (required.got < required.of) {
    const missing = required.of - required.got;
    levers.push({
      kind: 'required',
      text: `${plural(missing, 'Sunshard', 'Sunshards')} not brought home (${required.possible - required.points} points). With every one home, each second left on the clock scores ${POINTS_PER_SECOND} more.`,
      points: required.possible - required.points,
    });
  }
  const optionalLever = (kind: Lever['kind'], count: Count, text: string) => {
    if (count.got < count.of) levers.push({ kind, text, points: count.possible - count.points });
  };
  optionalLever(
    'twins',
    optional.twins,
    `Twin pairs: ${optional.twins.got} of ${optional.twins.of} delivered within 10 seconds of each other.`,
  );
  optionalLever(
    'dewglass',
    optional.dewglass,
    `Dewglass: ${optional.dewglass.got} of ${optional.dewglass.of} brought home without cracking.`,
  );
  if (sproutlings.lost > 0) {
    const each = lossPenaltyEach + POINTS_PER_WORKER;
    levers.push({
      kind: 'losses',
      text: `${plural(sproutlings.lost, 'Sproutling', 'Sproutlings')} lost, ${each} points each (the penalty, and the survivor bonus it would have earned).`,
      points: sproutlings.lost * each,
    });
  }
  levers.sort((a, b) => b.points - a.points);
  if (tally.cleared) {
    levers.push({
      kind: 'time',
      text: `Time: every second sooner is ${POINTS_PER_SECOND} points.`,
      points: POINTS_PER_SECOND,
    });
  }
  const blocker =
    target && needsClear(target) && !tally.cleared
      ? `${target} needs every Sunshard home, whatever the score.`
      : null;
  return {
    target,
    short,
    blocker,
    levers,
    summary: summarise(target, short, blocker, levers, tally.cleared),
  };
}

function summarise(
  target: Rank | null,
  short: number,
  blocker: string | null,
  levers: readonly Lever[],
  cleared: boolean,
): string {
  if (!target) return 'Diamond: there is nothing higher. Chase a faster time on the board.';
  if (blocker) return blocker;
  const missed = levers
    .filter((lever) => lever.kind !== 'time')
    .reduce((sum, lever) => sum + lever.points, 0);
  const seconds = (points: number) =>
    plural(Math.ceil(points / POINTS_PER_SECOND), 'second', 'seconds');
  if (missed === 0) {
    return `Only time stands between you and ${target}: finish ${seconds(short)} sooner.`;
  }
  if (missed >= short) {
    return cleared
      ? `${target} is ${short} points away: take some of what you missed below, or finish ${seconds(short)} sooner.`
      : `${target} is ${short} points away: take some of what you missed below.`;
  }
  return cleared
    ? `${target} is ${short} points away: everything you missed below is worth ${missed}, so you also need to finish ${seconds(short - missed)} sooner.`
    : `${target} is ${short} points away: bring every Sunshard home, and the time left on the clock scores too.`;
}
