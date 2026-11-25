import type { EnemyKind } from '../enemies/enemyKinds';
import type { Box, Ledge, Point } from '../navigation/NavGrid';
import type { ShardVariant } from '../simulation/components';
import type { Difficulty } from '../core/difficulty';
import type { Squad, SproutKind } from '../workers/sprouts';
import type { ChallengeId } from '../modes/modes';

/**
 * A field built for one challenge: which, its place in that challenge's list, and the test
 * player's measured result there, which sets Platinum. That is seconds to finish for the timed
 * challenges, Sproutlings at sunset for a Growing Season, and Sproutlings lost for a Trial.
 */
export interface ChallengeField {
  mode: ChallengeId;
  order: number;
  pace: number;
}

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

/**
 * How a wall is drawn. Rules treat every wall alike. Besides rock, ruins, terrace cliffs and
 * parapets, a wall can be drawn as one of the garden's giant everyday objects (see
 * docs-design/ART_DIRECTION.md and src/game/rendering/kit.ts).
 */
export type WallLook =
  | 'rock'
  | 'ruin'
  | 'cliff'
  | 'parapet'
  | 'hedge'
  | 'brick'
  | 'flowerpot'
  | 'fence'
  | 'book'
  | 'tile'
  | 'root'
  | 'glass'
  | 'gear'
  /** A drop: no walking across, though a throw carries over. */
  | 'pit';

/** A giant everyday object placed for art only (see `LevelDefinition.props`). */
export type PropKind =
  | 'flowerpot'
  | 'watering-can'
  | 'trowel'
  | 'glove'
  | 'croquet-hoop'
  | 'button'
  | 'teacup'
  | 'acorn-cap'
  | 'conker'
  | 'spool'
  | 'pocket-watch'
  | 'thimble'
  | 'coin'
  | 'candle'
  | 'book-stack'
  | 'plant-label'
  | 'lily-pad'
  | 'gear';

export interface PropSpawn extends Point {
  kind: PropKind;
  /** Size relative to the prop's usual size (see the art direction's scale table). */
  scale?: number;
  /** Turn about the vertical, in radians. */
  turn?: number;
}

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
  /** Buried: under a mound with a faint sparkle, until dug up by Sproutlings. */
  buried?: boolean;
}

/** A river crossing waiting to be built: a water box that becomes walkable once enough Span-logs arrive at its bank. */
export interface BridgeSpawn extends Box {
  bank: Point;
  needs: number;
  /** Already standing when the day begins: built on an earlier day of the story. */
  built?: boolean;
  /** Span-logs already laid at its bank on earlier days of the story. */
  laid?: number;
}

/** A beacon; `lit` when it was lit on an earlier day of the story and still burns. */
export interface BeaconSpawn extends Point {
  lit?: boolean;
}

export interface EnemySpawn extends Point {
  kind: EnemyKind;
  /** Weight of the Sunshard it drops when beaten. It counts towards the lesson's total. */
  drop?: number;
  /** Mounds only: something else buried inside. */
  reveals?: 'pod' | 'sap';
}

/** A belt over a box of ground that carries what is on it in direction (dx, dz), a unit vector. */
export interface Conveyor extends Box {
  dx: number;
  dz: number;
}

/** A bramble wall across a path, with the health it takes to break. */
export interface GateSpawn extends Box {
  hp: number;
  /** Bramble by default; crystal gates are the Academy's own, grown over the old doorways. */
  /** `hidden`: a weak wall that looks like any other, but for a crack: a secret way in. */
  style?: 'bramble' | 'crystal' | 'hidden' | 'fence' | 'pillar';
  /** Health it has left, when worn down on an earlier day of the story; `hp` otherwise. */
  left?: number;
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
   * Seconds into the day by which every Sunshard must be home, with no Sproutlings
   * lost, to earn Platinum. Set at the greedy test bot's own clear time, rounded up to
   * the next second: Platinum means matching a player who knows the map perfectly, and
   * losing fewer Sproutlings than it does. `npm run balance` measures every lesson into
   * BALANCE.md.
   */
  platinumTime: number;
  /** Score that earns Platinum. Derived from `platinumTime`; see `withPar`. */
  parScore: number;
  /** Seconds into the day for Diamond: a clear well ahead of the bot. Derived; see `withPar`. */
  diamondTime: number;
  /** Score that earns Diamond. Derived from `diamondTime`; see `withPar`. */
  diamondScore: number;
  /** Normal, or Hard with the modifiers in core/difficulty. */
  difficulty: Difficulty;
  seed: number;
  startingWorkers: number;
  /** Which kinds the starting squad is made of; it must add up to `startingWorkers`. All Emberlings if absent. */
  squad?: Squad;
  /**
   * Story only: the growth (see `stageOf`) of each starting Sproutling, per kind, in the order
   * they are spawned. Missing entries are leaves.
   */
  squadGrowth?: Partial<Record<SproutKind, readonly number[]>>;
  /**
   * Story only: berry bushes. A berry carried home is brewed into a spray: an Emberberry into
   * Emberbrew, a Stillberry into Stillwater.
   */
  berries?: readonly (Point & { kind: 'ember' | 'still' })[];
  /** Story only: Dewdrops of nectar growing on plants, drunk by the first Sproutling to reach one. */
  dewdrops?: readonly Point[];
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
  /** Conveyor belts: anything on one (hauls, Sproutlings on foot) is carried along it. */
  conveyors?: Conveyor[];
  /**
   * Story only: a telescope that, once looked through (the interact key beside it), shows
   * treasure hidden until then: the treasures listed in `reveals`.
   */
  telescope?: Point & { reveals: string[] };
  /** Spark coils: a pair of pylons that arc across the gap between them now and then. Only Sparklings are safe. */
  coils?: CoilSpawn[];
  enemies: EnemySpawn[];
  /** Sprays the day starts with, outside the story (two Escort fields grant some). */
  items?: { emberbrew: number; stillwater: number };
  /** Glass floors over drops: walkable panes, drawn over the dark below (art only). */
  glassFloors?: { x: number; z: number; w: number; d: number }[];
  /** Escort: beasts that arrive during the day, each `at` seconds in (see Simulation.step). */
  ambushes?: (EnemySpawn & { at: number })[];
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
  beacons?: BeaconSpawn[];
  theme: LevelTheme;
  /** A small door in the rock. Something is going on behind it. */
  secret?: Point;
  /** A way down: stepping on it finds the side lesson `to`, which can then be played. */
  descent?: Point & { to: string };
  /** A side lesson: not part of the numbered run, opened by finding its way down. */
  side?: boolean;
  /** How walls without a `look` of their own are drawn. Art only: no rule reads it. */
  wallLook?: WallLook;
  /**
   * Giant everyday objects placed round the field for art only: no rule, test player or
   * fingerprint sees them. Keep them out of where anything walks or is carried.
   */
  props?: PropSpawn[];
  /** A challenge's own field; see `ChallengeField`. Lessons have none. */
  challenge?: ChallengeField;
  /** No clock: the day lasts until its goal is met, or the player calls it. `dayLength` is 0. */
  untimed?: boolean;
  /**
   * An Expedition's caves, shallowest first: the field's way down leads to the first, and each
   * but the last has a way down to the next. Their treasure is the day's, counted with the
   * field's own (see `shardCount`); each is played as its own simulation (see Expedition).
   */
  floors?: readonly LevelSpec[];
}

/** A lesson as written, before its par score is derived. The theme defaults to its chapter's. */
export type LevelSpec = Omit<
  LevelDefinition,
  'parScore' | 'diamondTime' | 'diamondScore' | 'difficulty' | 'theme'
> & {
  theme?: LevelTheme;
};
