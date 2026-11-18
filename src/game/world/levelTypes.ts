import type { EnemyKind } from '../enemies/enemyKinds';
import type { Box, Ledge, Point } from '../navigation/NavGrid';
import type { ShardVariant } from '../simulation/components';
import type { Difficulty } from '../core/difficulty';
import type { Squad, SproutKind } from '../workers/sprouts';

/** A seed pod lying in the field. */
export interface PodSpawn extends Point {
  kind?: SproutKind;
}

/** A vent in the ground that bursts into flame every `period` seconds, starting `offset` seconds in. */
export interface VentSpawn extends Point {
  period: number;
  offset: number;
}

/** Two pylons that arc between `a` and `b` every `period` seconds, starting `offset` seconds in. */
export interface CoilSpawn {
  a: Point;
  b: Point;
  period: number;
  offset: number;
}

/** The look and sound of a lesson's setting. It changes nothing about the rules. */
export type LevelTheme = 'meadow' | 'autumn' | 'marsh' | 'dusk' | 'cave' | 'terrarium';

/** How a wall is drawn. Rules treat every wall alike. */
export type WallLook = 'rock' | 'ruin' | 'cliff' | 'parapet';

/** A solid box in the level, with how it should look. */
export interface Wall extends Box {
  look?: WallLook;
}

/** Raised ground. Its edges are cliffs except where a ramp or a ledge meets them. */
export interface Plateau extends Box {
  height: number;
}

/** A slope from the ground up to a plateau edge, rising toward (dx, dz). */
export interface Ramp extends Box {
  /** Height at the top, and at the foot (0 unless it starts on a lower plateau). */
  height: number;
  base?: number;
  dx: number;
  dz: number;
}

export interface TreasureSpawn extends Point {
  id: string;
  weight: number;
  /** Plain Sunshard by default. */
  variant?: ShardVariant;
  /** Rune shared with exactly one other treasure: both home within 10 s earns a bonus. */
  twin?: string;
}

/** A river crossing waiting to be built: a water box that becomes walkable once enough Span-logs arrive at its bank. */
export interface BridgeSpawn extends Box {
  bank: Point;
  needs: number;
}

export interface EnemySpawn extends Point {
  kind: EnemyKind;
  /** Weight of the Sunshard it drops when beaten. It counts towards the lesson's total. */
  drop?: number;
  /** Mounds only: something else buried inside. */
  reveals?: 'pod' | 'sap';
}

/** A bramble wall across a path, with the health it takes to break. */
export interface GateSpawn extends Box {
  hp: number;
  /** Bramble by default; crystal gates are the Academy's own, grown over the old doorways. */
  style?: 'bramble' | 'crystal';
}

/** A spot where a dewdrop falls every `period` seconds, starting `offset` seconds in. */
export interface DripSpawn extends Point {
  period: number;
  offset: number;
}

/** A Glowcap that appears `at` seconds into the day and wilts `lifetime` seconds later. */
export interface BloomSpawn extends Point {
  weight: number;
  at: number;
  lifetime: number;
}

/** A Lanternroot boss, the three knots that shield it, and the shard it drops. */
export interface RootSpawn extends Point {
  knots: readonly Point[];
  drop: number;
}

export interface LevelDefinition {
  id: string;
  /** 1-based stage number stored in the save file. */
  stage: number;
  name: string;
  /** One or two sentences shown on the lesson list: what this lesson teaches. */
  brief: string;
  width: number;
  depth: number;
  dayLength: number;
  /**
   * Seconds into the day by which every Sunshard must be home, with no Emberlings
   * lost, to earn Platinum. Set about 10% slower than the greedy test bot (30% on the
   * first three lessons, 20% on boss fights, which vary more), so a planned day beats it
   * and a sloppy one does not. `npm run balance` measures every lesson into BALANCE.md.
   */
  platinumTime: number;
  /** Score that earns Platinum. Derived from `platinumTime`; see `withPar`. */
  parScore: number;
  /** Normal, or Hard with the modifiers in core/difficulty. */
  difficulty: Difficulty;
  seed: number;
  startingWorkers: number;
  /** Which kinds the starting squad is made of; it must add up to `startingWorkers`. All Emberlings if absent. */
  squad?: Squad;
  captain: Point;
  kiln: Point;
  obstacles: Wall[];
  /** Raised ground, the slopes up to it, and the one-way drops off it. Walls are in `obstacles`. */
  plateaus?: Plateau[];
  ramps?: Ramp[];
  ledges?: Ledge[];
  treasures: TreasureSpawn[];
  /** Emberpods: light hauls that hatch into new workers. */
  /** Seed pods; each grows into Sproutlings of its kind (the lesson's most common kind if not given). */
  pods: PodSpawn[];
  /** Flame vents: they flare every `period` seconds. Only Emberlings walk through fire. */
  vents?: VentSpawn[];
  /** Spark coils: a pair of pylons that arc across the gap between them now and then. Only Sparklings are safe. */
  coils?: CoilSpawn[];
  enemies: EnemySpawn[];
  gates?: GateSpawn[];
  drips?: DripSpawn[];
  blooms?: BloomSpawn[];
  /** A Lanternroot boss and its knots. */
  roots?: RootSpawn[];
  /** Water: blocks walking and hauling, never throwing. */
  water?: Box[];
  bridges?: BridgeSpawn[];
  /** Span-logs, carried to the nearest unbuilt bridge's bank. */
  logs?: Point[];
  /** Sapdrops: delivered to the Kiln, they speed up every haul for a while. */
  saps?: Point[];
  /** Beacons: cold until the Warden reaches them, then a second place to deliver hauls. */
  beacons?: Point[];
  theme: LevelTheme;
  /** A small door in the rock. Something is going on behind it. */
  secret?: Point;
  /** A way down: stepping on it finds the side lesson `to`, which can then be played. */
  descent?: Point & { to: string };
  /** A side lesson: not part of the numbered run, opened by finding its way down. */
  side?: boolean;
}

/** A lesson as written, before its par score is derived. The theme defaults to its chapter's. */
export type LevelSpec = Omit<LevelDefinition, 'parScore' | 'difficulty' | 'theme'> & {
  theme?: LevelTheme;
};
