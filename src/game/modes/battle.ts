import { Rng } from '../core/rng';
import { ENEMY_SPECS, type EnemyKind } from '../enemies/enemyKinds';
import type { Carryable } from '../simulation/components';
import { Simulation, type Delivery } from '../simulation/Simulation';
import { relicFor } from '../story/relics';
import type { LevelDefinition } from '../world/level';
import { BOT_STYLES, greedyPlayer, type GreedyPlayer } from '../world/testBot';
import {
  carcassWeight,
  isBattle,
  MODES,
  POINTS_PER_WEIGHT,
  shardWeight,
  type BattleId,
  type ModeId,
} from './modes';

/**
 * Battles: the player and a CPU rival each work their own copy of the same field, side by side,
 * and race. The rival is the test player, slowed down on the easier settings by running fewer
 * of its simulation steps for each of the player's.
 */
export const RIVAL_LEVELS = ['easy', 'normal', 'hard'] as const;
export type RivalLevel = (typeof RIVAL_LEVELS)[number];

/** Steps of the rival's day for each step of the player's. */
export const RIVAL_SPEED: Record<RivalLevel, number> = { easy: 0.7, normal: 0.85, hard: 1 };
export const RIVAL_NAMES: Record<RivalLevel, string> = {
  easy: 'Cadet Pell',
  normal: 'Warden Quill',
  hard: 'Proctor Ashwick',
};

/** Marbles in a Marble Race. */
export const MARBLES = 4;

export interface BattleOutcome {
  mode: BattleId;
  outcome: 'won' | 'lost' | 'drawn';
  /** The player's and the rival's tally, in `unit`. */
  you: number;
  rival: number;
  unit: string;
  /** Why it ended the way it did. */
  reason: string;
}

/**
 * A battle's day is never longer than this share of the Platinum time beyond it (and never longer
 * than the lesson's own day): long enough to collect most of the field, short enough to race.
 */
const BATTLE_DAY_SHARE = 1.2;

/** The lesson as a battle plays it: the same field, with a shorter day. */
export function battleLevel(level: LevelDefinition): LevelDefinition {
  return {
    ...level,
    dayLength: Math.min(level.dayLength, Math.round(level.platinumTime * BATTLE_DAY_SHARE)),
  };
}

/**
 * The lesson as a mode plays it. Outside the story there are no ways down and no little door:
 * a challenge or a battle is the one field, start to finish. Battles also have a shorter day.
 */
export function levelForMode(level: LevelDefinition, mode: ModeId): LevelDefinition {
  if (mode === 'lessons') return level;
  const field = isBattle(mode) ? battleLevel(level) : level;
  return { ...field, descent: undefined, secret: undefined };
}

/** The Sunshards that are marbles: the four farthest from the Kiln (all of them, if fewer). */
export function marblesOf(level: LevelDefinition): string[] {
  return [...level.treasures]
    .sort(
      (a, b) =>
        Math.hypot(b.x - level.kiln.x, b.z - level.kiln.z) -
        Math.hypot(a.x - level.kiln.x, a.z - level.kiln.z),
    )
    .slice(0, MARBLES)
    .map((shard) => shard.id);
}

/** One square on a bingo card: something to bring home. */
export interface BingoSquare {
  key: string;
  label: string;
  /** Particular treasure (`treasure:id`), any seed pod, any Glowcap, or any beast of a kind. */
  match:
    | { kind: 'treasure'; id: string }
    | { kind: 'pod' }
    | { kind: 'bloom' }
    | { kind: 'beast'; from: EnemyKind };
}

export interface BingoCard {
  size: number;
  squares: BingoSquare[];
}

/** Everything in a lesson a bingo square can ask for. */
export function bingoTargets(level: LevelDefinition): BingoSquare[] {
  const squares: BingoSquare[] = level.treasures.map((shard) => ({
    key: `treasure:${shard.id}`,
    label: relicFor(level.id, shard.id, shard.variant).name,
    match: { kind: 'treasure', id: shard.id },
  }));
  if (level.pods.length > 0)
    squares.push({ key: 'pod', label: 'A seed pod', match: { kind: 'pod' } });
  if ((level.blooms ?? []).length > 0) {
    squares.push({ key: 'bloom', label: 'A Glowcap', match: { kind: 'bloom' } });
  }
  const beasts = new Set<EnemyKind>();
  for (const enemy of level.enemies) {
    if (enemy.kind !== 'mound' && ENEMY_SPECS[enemy.kind].carcassWeight > 0) beasts.add(enemy.kind);
  }
  for (const from of beasts) {
    squares.push({
      key: `beast:${from}`,
      label: `A ${ENEMY_SPECS[from].name}`,
      match: { kind: 'beast', from },
    });
  }
  return squares;
}

/** Bingo needs a full 3 by 3 card at least. */
export function bingoOpen(level: LevelDefinition): boolean {
  return bingoTargets(level).length >= 9;
}

/** A card for one side: 4 by 4 when the lesson has enough to ask for, 3 by 3 otherwise. */
export function bingoCard(level: LevelDefinition, side: number): BingoCard {
  const targets = bingoTargets(level);
  const size = targets.length >= 16 ? 4 : 3;
  const rng = new Rng(level.seed * 97 + side * 31 + 7);
  const shuffled = [...targets];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { size, squares: shuffled.slice(0, size * size) };
}

function matches(square: BingoSquare, delivery: Delivery): boolean {
  switch (square.match.kind) {
    case 'treasure':
      return delivery.kind === 'treasure' && delivery.id === square.match.id;
    case 'pod':
      return delivery.kind === 'pod';
    case 'bloom':
      return delivery.kind === 'bloom';
    case 'beast':
      return delivery.kind === 'carcass' && delivery.from === square.match.from;
  }
}

/** Ticks the first open square a delivery matches, if any; returns its index or -1. */
function tickOne(card: BingoCard, done: Set<number>, delivery: Delivery): number {
  const index = card.squares.findIndex((square, i) => !done.has(i) && matches(square, delivery));
  if (index >= 0) done.add(index);
  return index;
}

/** The squares ticked off by a day's deliveries. Each delivery ticks at most one square. */
export function ticked(card: BingoCard, deliveries: readonly Delivery[]): Set<number> {
  const done = new Set<number>();
  for (const delivery of deliveries) tickOne(card, done, delivery);
  return done;
}

/** Every row, column and the two diagonals, as lists of square indices. */
export function bingoLines(size: number): number[][] {
  const lines: number[][] = [];
  for (let i = 0; i < size; i++) {
    lines.push(Array.from({ length: size }, (_, j) => i * size + j));
    lines.push(Array.from({ length: size }, (_, j) => j * size + i));
  }
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)));
  return lines;
}

export function hasBingo(card: BingoCard, done: ReadonlySet<number>): boolean {
  return bingoLines(card.size).some((line) => line.every((i) => done.has(i)));
}

/** Whether a battle can be played on a lesson. */
export function battleOpen(mode: BattleId, level: LevelDefinition): boolean {
  if (mode === 'bingo') return bingoOpen(level);
  if (mode === 'marble') return level.treasures.length >= 2;
  return shardWeight(level) + carcassWeight(level) > 0;
}

/** One side's standing: what it has so far, by the battle's measure. */
export interface Standing {
  /** Marbles home, squares ticked or weight points. */
  count: number;
  /** When it reached its goal (all marbles home, a bingo), or null. */
  doneAt: number | null;
}

/** What the HUD shows of a battle in progress. */
export interface RaceSnapshot {
  mode: BattleId;
  rivalName: string;
  unit: string;
  you: number;
  rival: number;
  /** In a Marble Race: the Sunshards that are marbles. */
  marbles: string[];
  /** What a side needs to win outright (every marble, a full line), or null for a duel. */
  goal: number | null;
  /** In bingo: the most squares either side has in any one line. */
  youLine: number;
  rivalLine: number;
  /** In bingo: the player's card, with what each side has ticked on its own card. */
  card: { size: number; squares: { label: string; done: boolean }[] } | null;
}

function bestLine(card: BingoCard, done: ReadonlySet<number>): number {
  return Math.max(...bingoLines(card.size).map((line) => line.filter((i) => done.has(i)).length));
}

/**
 * A battle in progress: the rival's copy of the field and its player, and the rules for who is
 * ahead and who has won.
 */
export class Battle {
  readonly rival: Simulation;
  readonly marbles: ReadonlySet<string>;
  readonly cards: { you: BingoCard; rival: BingoCard } | null;
  private readonly bot: GreedyPlayer;
  private readonly speed: number;
  private owed = 0;
  private tick = 0;

  constructor(
    readonly mode: BattleId,
    readonly level: LevelDefinition,
    readonly rivalLevel: RivalLevel,
  ) {
    const spec = MODES[mode];
    this.rival = new Simulation(level, { endsWhen: spec.endsWhen, growth: spec.growth });
    this.marbles = new Set(mode === 'marble' ? marblesOf(level) : []);
    this.cards = mode === 'bingo' ? { you: bingoCard(level, 0), rival: bingoCard(level, 1) } : null;
    const card = this.cards?.rival;
    const wanted = (carryable: Carryable): boolean => {
      if (mode === 'marble') return carryable.kind === 'treasure' && this.marbles.has(carryable.id);
      if (!card) return false;
      return card.squares.some((square) =>
        matches(square, {
          kind: carryable.kind,
          id: carryable.id,
          from: carryable.from,
          weight: carryable.weight,
          time: 0,
        }),
      );
    };
    this.bot = greedyPlayer(this.rival, BOT_STYLES[0], mode === 'duel' ? undefined : wanted);
    this.speed = RIVAL_SPEED[rivalLevel];
  }

  /** Runs the rival on for as many of its steps as `steps` of the player's are worth. */
  advance(steps: number): void {
    this.owed += steps * this.speed;
    while (this.owed >= 1 && !this.rival.ended) {
      this.rival.step(this.bot.input(this.tick++));
      this.owed -= 1;
    }
  }

  /** Where a side stands. */
  standing(sim: Simulation, side: 'you' | 'rival'): Standing {
    const deliveries = sim.stats.deliveries;
    if (this.mode === 'marble') {
      const home = deliveries.filter((d) => d.kind === 'treasure' && this.marbles.has(d.id));
      return {
        count: home.length,
        doneAt: home.length >= this.marbles.size ? home[home.length - 1].time : null,
      };
    }
    if (this.mode === 'bingo' && this.cards) {
      const card = this.cards[side];
      // One pass, ticking as `ticked` does: the moment of the bingo is the delivery that
      // completed the first line.
      const done = new Set<number>();
      let doneAt: number | null = null;
      for (const delivery of deliveries) {
        const index = tickOne(card, done, delivery);
        if (index >= 0 && doneAt === null && hasBingo(card, done)) doneAt = delivery.time;
      }
      return { count: done.size, doneAt };
    }
    return {
      count: sim.stats.weightDelivered * POINTS_PER_WEIGHT,
      doneAt: sim.everythingCollected() ? sim.elapsed : null,
    };
  }

  /** The race as it stands, for the HUD. */
  race(you: Simulation): RaceSnapshot {
    const mine = this.standing(you, 'you');
    const theirs = this.standing(this.rival, 'rival');
    let youLine = 0;
    let rivalLine = 0;
    let card: RaceSnapshot['card'] = null;
    if (this.cards) {
      const myTicks = ticked(this.cards.you, you.stats.deliveries);
      youLine = bestLine(this.cards.you, myTicks);
      rivalLine = bestLine(this.cards.rival, ticked(this.cards.rival, this.rival.stats.deliveries));
      card = {
        size: this.cards.you.size,
        squares: this.cards.you.squares.map((square, i) => ({
          label: square.label,
          done: myTicks.has(i),
        })),
      };
    }
    return {
      mode: this.mode,
      rivalName: RIVAL_NAMES[this.rivalLevel],
      unit: this.unit,
      you: mine.count,
      rival: theirs.count,
      marbles: [...this.marbles],
      goal: this.mode === 'marble' ? this.marbles.size : this.cards ? this.cards.you.size : null,
      youLine,
      rivalLine,
      card,
    };
  }

  /** The unit a side's count is in. */
  get unit(): string {
    return this.mode === 'marble' ? 'marbles' : this.mode === 'bingo' ? 'squares' : 'points';
  }

  /**
   * The outcome, once there is one: a side reaching its goal, the player's day ending (time up,
   * the Warden down, the squad lost), or the rival's squad lost. Null while it is still on.
   */
  decide(you: Simulation): BattleOutcome | null {
    const mine = this.standing(you, 'you');
    const theirs = this.standing(this.rival, 'rival');
    const result = (outcome: BattleOutcome['outcome'], reason: string): BattleOutcome => ({
      mode: this.mode,
      outcome,
      you: mine.count,
      rival: theirs.count,
      unit: this.unit,
      reason,
    });
    if (you.ended === 'captainDown') return result('lost', 'The Warden is down.');
    if (you.ended === 'wipedOut') return result('lost', 'No Sproutlings remain.');
    if (this.mode === 'duel') {
      // Ends at sunset, or as soon as either side has collected everything.
      if (you.ended || mine.doneAt !== null || theirs.doneAt !== null || this.rival.ended) {
        if (mine.count === theirs.count) return result('drawn', 'Level on weight.');
        return mine.count > theirs.count
          ? result('won', 'You carried more home.')
          : result('lost', 'Your rival carried more home.');
      }
      return null;
    }
    const goal = this.mode === 'marble' ? 'every marble home' : 'a full line';
    if (mine.doneAt !== null || theirs.doneAt !== null) {
      // Both made it within the same frame: the earlier one wins.
      if (theirs.doneAt === null) return result('won', `You got ${goal} first.`);
      if (mine.doneAt === null) return result('lost', `Your rival got ${goal} first.`);
      if (mine.doneAt === theirs.doneAt) return result('drawn', `You both got ${goal} at once.`);
      return mine.doneAt < theirs.doneAt
        ? result('won', `You got ${goal} first.`)
        : result('lost', `Your rival got ${goal} first.`);
    }
    if (this.rival.ended === 'wipedOut' || this.rival.ended === 'captainDown') {
      return result('won', 'Your rival’s day fell apart.');
    }
    if (you.ended) {
      if (mine.count === theirs.count) return result('drawn', 'Sunset, and level.');
      return mine.count > theirs.count
        ? result('won', `Sunset, and you had more ${this.unit}.`)
        : result('lost', `Sunset, and your rival had more ${this.unit}.`);
    }
    return null;
  }

  dispose(): void {
    this.rival.dispose();
  }
}
