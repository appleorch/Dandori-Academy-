import { ENEMY_SPECS } from '../enemies/enemyKinds';
import { rankFor, rankScore, type Par, type Rank } from '../dandori/scoring';
import {
  DIAMOND_SHARE,
  rankedBonusTotal,
  sproutlingsPossible,
  treasureTotal,
  type LevelDefinition,
} from '../world/level';
import type { EndsWhen } from '../simulation/Simulation';
import { EVERYTHING_TIMES, TRIAL_TIMES } from './paceTimes';

/**
 * The ways to play a lesson. The story keeps no score: a lesson is passed by bringing every
 * Sunshard home. Each challenge scores the day by its own rule, in the spirit of a classic of
 * the genre, and gives a medal. Battles race a rival Warden on a copy of the same field.
 */
export const MODE_IDS = [
  'story',
  'growing',
  'hunt',
  'mission',
  'dandori',
  'trial',
  'marble',
  'bingo',
  'duel',
] as const;
export type ModeId = (typeof MODE_IDS)[number];

export const CHALLENGE_IDS = ['growing', 'hunt', 'mission', 'dandori', 'trial'] as const;
export type ChallengeId = (typeof CHALLENGE_IDS)[number];

export const BATTLE_IDS = ['marble', 'bingo', 'duel'] as const;
export type BattleId = (typeof BATTLE_IDS)[number];

export interface ModeSpec {
  id: ModeId;
  name: string;
  /** One line for menus. */
  summary: string;
  /** How the day is scored or won, line by line, for the briefing and the results. */
  rules: readonly string[];
  kind: 'story' | 'challenge' | 'battle';
  endsWhen: EndsWhen;
  /** Whether the Kiln grows new Sproutlings. */
  growth: boolean;
}

/** Points a beast's carcass is worth in a Mission, per point of its weight. */
export const CARCASS_POINTS_PER_WEIGHT = 50;
/** Points per point of weight delivered in a Dandori Challenge or Trial. */
export const POINTS_PER_WEIGHT = 10;
/** Points per Sproutling alive at the end of a Treasure Hunt. */
export const HUNT_POINTS_PER_SPROUTLING = 10;
/** Seconds left per point in a Treasure Hunt. */
export const HUNT_SECONDS_PER_POINT = 2;
/** Points per second left after a 100% Mission. */
export const MISSION_POINTS_PER_SECOND = 10;
/** A Growing Season's Platinum is this share of the most Sproutlings the lesson can grow. */
export const GROWING_PLATINUM_SHARE = 0.9;

export const MODES: Record<ModeId, ModeSpec> = {
  story: {
    id: 'story',
    name: 'Story',
    summary: 'The Academy’s lessons in order. No score: bring every Sunshard home.',
    rules: [
      'Bring every Sunshard home to pass the lesson and open the next.',
      'There is no score. The Academy keeps count of the days you take, the relics you recover and the Sproutlings you grow and lose.',
    ],
    kind: 'story',
    endsWhen: 'shards',
    growth: true,
  },
  growing: {
    id: 'growing',
    name: 'Growing Season',
    summary: 'Grow the biggest squad you can before sunset. The score is your headcount.',
    rules: [
      'The day always runs to sunset.',
      'Score: 1 point for every Sproutling alive when the day ends. Nothing else counts.',
      'Seed pods and carcasses brought home grow new Sproutlings.',
    ],
    kind: 'challenge',
    endsWhen: 'clock',
    growth: true,
  },
  hunt: {
    id: 'hunt',
    name: 'Treasure Hunt',
    summary: 'Treasure, survivors and time all count. Lose nobody on the way for a Perfect Bloom.',
    rules: [
      'Score: every point of treasure brought home, plus 10 for every Sproutling alive at the end, plus 1 for every 2 seconds left on the clock.',
      'End the day whenever you like from the pause menu: the time left counts. It ends by itself once every Sunshard is home.',
      'Bring every Sunshard home without losing a single Sproutling for a Perfect Bloom.',
    ],
    kind: 'challenge',
    endsWhen: 'shards',
    growth: true,
  },
  mission: {
    id: 'mission',
    name: 'Mission',
    summary: 'Points for treasure and beasts; the time bonus only on a 100% clear.',
    rules: [
      'Score: every point of treasure brought home, plus 50 for every point of weight of each beast carried home.',
      'Bring every Sunshard home and defeat every beast for a 100% clear: then every second left is worth 10 more. Without it, time is worth nothing.',
      'Platinum and Diamond need a 100% clear.',
    ],
    kind: 'challenge',
    endsWhen: 'everything',
    growth: true,
  },
  dandori: {
    id: 'dandori',
    name: 'Dandori Challenge',
    summary: 'Every point of weight carried home scores; finish early for seconds on top.',
    rules: [
      'Score: 10 for every point of weight brought home: treasure, Glowcaps and carcasses.',
      'Collect everything (every Sunshard, every beast and its carcass) and each second left adds 1.',
      'Platinum and Diamond need everything collected.',
    ],
    kind: 'challenge',
    endsWhen: 'everything',
    growth: true,
  },
  trial: {
    id: 'trial',
    name: 'Lean Squad Trial',
    summary: 'The squad you start with is all you get: the Kiln grows nothing today.',
    rules: [
      'The Kiln grows nothing: pods and carcasses add no Sproutlings. Every one lost is gone.',
      'Score as in the Dandori Challenge: 10 for every point of weight home, and each second left once everything is collected.',
      'Platinum and Diamond need everything collected.',
    ],
    kind: 'challenge',
    endsWhen: 'everything',
    growth: false,
  },
  marble: {
    id: 'marble',
    name: 'Marble Race',
    summary: 'Four Sunshards are marbles. Bring all four home before your rival does.',
    rules: [
      'Four Sunshards are marbles, shown in gold. Bring all four home before your rival brings home theirs.',
      'If the clock runs out first, whoever has more marbles home wins; the same number is a draw.',
    ],
    kind: 'battle',
    endsWhen: 'clock',
    growth: true,
  },
  bingo: {
    id: 'bingo',
    name: 'Bingo Race',
    summary: 'Tick off a line on your card before your rival completes one of theirs.',
    rules: [
      'You and your rival each have a card of things to bring home: particular relics, seed pods, Glowcaps and beasts.',
      'The first to tick off a whole row, column or diagonal wins. If the clock runs out first, the most squares wins.',
    ],
    kind: 'battle',
    endsWhen: 'clock',
    growth: true,
  },
  duel: {
    id: 'duel',
    name: 'Dandori Duel',
    summary: 'Out-carry your rival: the most weight home by sunset wins.',
    rules: [
      'You and your rival each work your own copy of the field. Every point of weight brought home (treasure, Glowcaps, carcasses) scores 10.',
      'The higher total at sunset wins; the day ends early if either of you collects everything.',
    ],
    kind: 'battle',
    endsWhen: 'clock',
    growth: true,
  },
};

export const isChallenge = (mode: ModeId): mode is ChallengeId =>
  (CHALLENGE_IDS as readonly string[]).includes(mode);
export const isBattle = (mode: ModeId): mode is BattleId =>
  (BATTLE_IDS as readonly string[]).includes(mode);

/** Weight of every Sunshard in a lesson, those bosses drop included. */
export function shardWeight(level: LevelDefinition): number {
  return (
    level.treasures.reduce((sum, shard) => sum + shard.weight, 0) +
    level.enemies.reduce((sum, enemy) => sum + (enemy.drop ?? 0), 0) +
    (level.roots ?? []).reduce((sum, root) => sum + root.drop, 0)
  );
}

/** Weight of the carcasses of every beast placed in a lesson. */
export function carcassWeight(level: LevelDefinition): number {
  let weight = 0;
  for (const enemy of level.enemies) {
    if (enemy.kind !== 'mound') weight += ENEMY_SPECS[enemy.kind].carcassWeight;
  }
  for (let i = 0; i < (level.roots ?? []).length; i++) {
    weight += ENEMY_SPECS.lanternroot.carcassWeight;
  }
  return weight;
}

/** Whether a challenge can be played on a lesson. A trial needs a squad that can finish it. */
export function challengeOpen(mode: ChallengeId, level: LevelDefinition): boolean {
  return mode !== 'trial' || TRIAL_TIMES[level.id] !== undefined;
}

/**
 * The finish times a challenge's medals are measured against: the story's for the Treasure Hunt
 * (which ends with the last Sunshard, as the story does), and the measured times for collecting
 * everything for the Mission, the Dandori Challenge and the Trial.
 */
export function challengeTimes(
  mode: ChallengeId,
  level: LevelDefinition,
): { platinum: number; diamond: number } {
  const measured =
    mode === 'trial'
      ? TRIAL_TIMES[level.id]
      : mode === 'mission' || mode === 'dandori'
        ? EVERYTHING_TIMES[level.id]
        : undefined;
  if (measured === undefined) return { platinum: level.platinumTime, diamond: level.diamondTime };
  return { platinum: measured, diamond: Math.floor(measured * DIAMOND_SHARE) };
}

/**
 * Platinum and Diamond scores for a challenge on a lesson: a perfect day at the Platinum time,
 * and at the Diamond time. Glowcaps are left out, as they may sprout too late to take at pace;
 * they still add to the score, on top. Bronze, Silver and Gold are shares of Platinum.
 */
export function challengePar(mode: ChallengeId, level: LevelDefinition): Par {
  const { platinum, diamond } = challengeTimes(mode, level);
  const day = level.dayLength;
  const treasure = treasureTotal(level) + rankedBonusTotal(level);
  switch (mode) {
    case 'growing': {
      const possible = sproutlingsPossible(level);
      return { parScore: Math.ceil(possible * GROWING_PLATINUM_SHARE), diamondScore: possible };
    }
    case 'hunt': {
      const base = treasure + sproutlingsPossible(level) * HUNT_POINTS_PER_SPROUTLING;
      return {
        parScore: base + Math.floor((day - platinum) / HUNT_SECONDS_PER_POINT),
        diamondScore: base + Math.floor((day - diamond) / HUNT_SECONDS_PER_POINT),
      };
    }
    case 'mission': {
      const base = treasure + carcassWeight(level) * CARCASS_POINTS_PER_WEIGHT;
      return {
        parScore: base + (day - platinum) * MISSION_POINTS_PER_SECOND,
        diamondScore: base + (day - diamond) * MISSION_POINTS_PER_SECOND,
      };
    }
    case 'dandori':
    case 'trial': {
      const base = (shardWeight(level) + carcassWeight(level)) * POINTS_PER_WEIGHT;
      return { parScore: base + (day - platinum), diamondScore: base + (day - diamond) };
    }
  }
}

/** What a finished challenge day knows about itself, as far as any rule needs it. */
export interface ChallengeFacts {
  /** Every point of treasure brought home: Sunshards, twins, Dewglass and Glowcaps. */
  treasureValue: number;
  /** Of the treasure, the points the Glowcaps were worth. */
  glowcapValue: number;
  /** Weight of treasure, Glowcaps and carcasses brought home. */
  weight: number;
  /** Of the weight, the Glowcaps'. */
  glowcapWeight: number;
  /** Weight of carcasses brought home. */
  carcassWeight: number;
  shardsHome: number;
  shardsTotal: number;
  /** Beasts still standing at the end. */
  beastsLeft: number;
  /** Whether everything was collected: every Sunshard, every beast and its carcass. */
  everything: boolean;
  alive: number;
  lost: number;
  /** Seconds left on the clock when the day ended. */
  timeLeft: number;
  /** Whether the clock still counts: false if the Warden fell or the squad was lost. */
  survived: boolean;
}

export interface ScoreRow {
  label: string;
  note?: string;
  value: number;
}

export interface ChallengeScore {
  rows: ScoreRow[];
  total: number;
  rank: Rank;
  /** The total without what the Glowcaps added: what the medal is judged on. */
  ranked: number;
  /** A Treasure Hunt with every Sunshard home and nobody lost. */
  perfectBloom: boolean;
  /** Whether the rule's own goal was met for Platinum and Diamond. */
  gateMet: boolean;
}

const seconds = (facts: ChallengeFacts): number =>
  facts.survived ? Math.max(0, Math.ceil(facts.timeLeft)) : 0;

/** Scores a finished challenge day by its mode's rule. */
export function scoreChallenge(
  mode: ChallengeId,
  level: LevelDefinition,
  facts: ChallengeFacts,
): ChallengeScore {
  const par = challengePar(mode, level);
  let rows: ScoreRow[];
  let gateMet = true;
  // Glowcaps are scored on a line of their own, which never counts towards a medal.
  const glowValue = Math.max(0, Math.min(facts.glowcapValue, facts.treasureValue));
  const glowWeight = Math.max(0, Math.min(facts.glowcapWeight, facts.weight));
  const glowcapRow = (value: number): ScoreRow[] =>
    (level.blooms ?? []).length > 0 || value > 0
      ? [{ label: 'Glowcaps', note: 'Extra: never counted for a medal', value }]
      : [];
  let extra = 0;
  switch (mode) {
    case 'growing':
      rows = [
        {
          label: `Sproutlings at sunset: ${facts.alive}`,
          note: `This lesson can grow up to ${sproutlingsPossible(level)}`,
          value: facts.alive,
        },
      ];
      break;
    case 'hunt':
      rows = [
        { label: 'Treasure', value: facts.treasureValue - glowValue },
        ...glowcapRow(glowValue),
        {
          label: `Sproutlings alive: ${facts.alive}`,
          note: `${HUNT_POINTS_PER_SPROUTLING} each`,
          value: facts.alive * HUNT_POINTS_PER_SPROUTLING,
        },
        {
          label: `Time left: ${seconds(facts)}s`,
          note: `1 point for every ${HUNT_SECONDS_PER_POINT} seconds`,
          value: Math.floor(seconds(facts) / HUNT_SECONDS_PER_POINT),
        },
      ];
      break;
    case 'mission': {
      const sweep = facts.shardsHome === facts.shardsTotal && facts.beastsLeft === 0;
      gateMet = sweep;
      rows = [
        {
          label: `Treasure (${facts.shardsHome} of ${facts.shardsTotal} Sunshards)`,
          value: facts.treasureValue - glowValue,
        },
        ...glowcapRow(glowValue),
        {
          label: 'Beasts carried home',
          note: `${CARCASS_POINTS_PER_WEIGHT} per point of weight`,
          value: facts.carcassWeight * CARCASS_POINTS_PER_WEIGHT,
        },
        {
          label: sweep ? `Time bonus: ${seconds(facts)}s left` : 'Time bonus',
          note: sweep
            ? `${MISSION_POINTS_PER_SECOND} per second`
            : facts.beastsLeft > 0
              ? `Only on a 100% clear: ${facts.beastsLeft} ${facts.beastsLeft === 1 ? 'beast' : 'beasts'} left standing`
              : 'Only on a 100% clear: every Sunshard home',
          value: sweep ? seconds(facts) * MISSION_POINTS_PER_SECOND : 0,
        },
      ];
      break;
    }
    case 'dandori':
    case 'trial':
      gateMet = facts.everything;
      rows = [
        {
          label: `Weight home: ${facts.weight - glowWeight}`,
          note: `${POINTS_PER_WEIGHT} per point of weight`,
          value: (facts.weight - glowWeight) * POINTS_PER_WEIGHT,
        },
        ...glowcapRow(glowWeight * POINTS_PER_WEIGHT),
        {
          label: facts.everything ? `Time left: ${seconds(facts)}s` : 'Time left',
          note: facts.everything ? '1 per second' : 'Only once everything is collected',
          value: facts.everything ? seconds(facts) : 0,
        },
      ];
      break;
  }
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (mode === 'hunt' || mode === 'mission') extra = glowValue;
  if (mode === 'dandori' || mode === 'trial') extra = glowWeight * POINTS_PER_WEIGHT;
  const ranked = total - extra;
  return {
    rows,
    total,
    ranked,
    rank: rankFor(ranked, gateMet, par),
    perfectBloom: mode === 'hunt' && facts.lost === 0 && facts.shardsHome === facts.shardsTotal,
    gateMet,
  };
}

/** What a medal takes in a challenge on a lesson. */
export interface MedalTarget {
  rank: Rank;
  /** Lowest score that earns it. */
  score: number;
  /** The second of the day by which a perfect day must finish to reach it, if time counts. */
  finishBy: number | null;
}

/** Bronze to Diamond: the score each needs, and for Platinum and Diamond the pace. */
export function medalTargets(mode: ChallengeId, level: LevelDefinition): MedalTarget[] {
  const par = challengePar(mode, level);
  const { platinum, diamond } = challengeTimes(mode, level);
  const timed = mode !== 'growing';
  return (['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const).map((rank) => ({
    rank,
    score: rankScore(rank, par),
    finishBy: !timed ? null : rank === 'Platinum' ? platinum : rank === 'Diamond' ? diamond : null,
  }));
}

/** What Platinum and Diamond need besides the score, in words, or null. */
export function medalGate(mode: ChallengeId): string | null {
  switch (mode) {
    case 'mission':
      return 'Platinum and Diamond need a 100% clear: every Sunshard home and every beast down.';
    case 'dandori':
    case 'trial':
      return 'Platinum and Diamond need everything collected: every Sunshard, every beast and its carcass.';
    case 'hunt':
    case 'growing':
      return null;
  }
}
