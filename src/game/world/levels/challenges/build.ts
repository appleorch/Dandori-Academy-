import type { EnemyKind } from '../../../enemies/enemyKinds';
import type { Ledge, Point } from '../../../navigation/NavGrid';
import type { Squad } from '../../../workers/sprouts';
import { terrace, type Opening } from '../../course';
import type {
  BeaconSpawn,
  BloomSpawn,
  BridgeSpawn,
  CoilSpawn,
  Conveyor,
  DripSpawn,
  EnemySpawn,
  GateSpawn,
  LevelTheme,
  Plateau,
  PodSpawn,
  Ramp,
  RootSpawn,
  TreasureSpawn,
  VentSpawn,
  Wall,
  WallLook,
} from '../../levelTypes';
import type { Box } from '../../../navigation/NavGrid';
import type { FieldSpec } from './field';

/**
 * A small kit for writing challenge fields by hand: every piece is placed by its corners, so a
 * field reads as a plan. Walls take a look of their own (hedge, books, tiles, flowerpots...), and
 * lines of wall take gaps, so a layout is a few lines rather than a list of boxes.
 */

/** A rectangle by its corners: x0, z0, x1, z1. */
export type R = readonly [number, number, number, number];
const box = ([x0, z0, x1, z1]: R): Box => ({
  x: (x0 + x1) / 2,
  z: (z0 + z1) / 2,
  w: Math.abs(x1 - x0),
  d: Math.abs(z1 - z0),
});

export interface FieldMeta {
  id: string;
  name: string;
  brief: string;
  theme: LevelTheme;
  width: number;
  depth: number;
  dayLength: number;
  seed: number;
  squad: Squad;
  kiln: Point;
  /** Where the Warden starts; next to the Kiln if not given. */
  captain?: Point;
  /** How walls are drawn unless one says otherwise. */
  look?: WallLook;
}

export class Field {
  private readonly obstacles: Wall[] = [];
  private readonly treasures: TreasureSpawn[] = [];
  private readonly enemies: EnemySpawn[] = [];
  private readonly pods: PodSpawn[] = [];
  private readonly waterBoxes: Box[] = [];
  private readonly bridgeSpawns: BridgeSpawn[] = [];
  private readonly logSpots: Point[] = [];
  private readonly gateSpawns: GateSpawn[] = [];
  private readonly ventSpawns: VentSpawn[] = [];
  private readonly coilSpawns: CoilSpawn[] = [];
  private readonly dripSpawns: DripSpawn[] = [];
  private readonly conveyorBoxes: Conveyor[] = [];
  private readonly beaconSpawns: BeaconSpawn[] = [];
  private readonly saps: Point[] = [];
  private readonly bloomSpawns: BloomSpawn[] = [];
  private readonly rootSpawns: RootSpawn[] = [];
  private readonly plateaus: Plateau[] = [];
  private readonly ramps: Ramp[] = [];
  private readonly ledges: Ledge[] = [];
  private readonly ambushSpawns: (EnemySpawn & { at: number })[] = [];
  private telescopeSpot: (Point & { reveals: string[] }) | null = null;
  private shardNo = 0;

  constructor(private readonly meta: FieldMeta) {}

  /** A solid wall over a rectangle. */
  wall(rect: R, look?: WallLook): this {
    this.obstacles.push({
      ...box(rect),
      ...((look ?? this.meta.look) ? { look: look ?? this.meta.look } : {}),
    });
    return this;
  }

  /** A wall along z = `z` from x0 to x1, `thick` deep, with gaps [from, to] along x. */
  hline(
    z: number,
    x0: number,
    x1: number,
    gaps: readonly (readonly [number, number])[] = [],
    look?: WallLook,
    thick = 2,
  ): this {
    let at = x0;
    for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
      if (a > at) this.wall([at, z - thick / 2, a, z + thick / 2], look);
      at = Math.max(at, b);
    }
    if (at < x1) this.wall([at, z - thick / 2, x1, z + thick / 2], look);
    return this;
  }

  /** A wall along x = `x` from z0 to z1, with gaps [from, to] along z. */
  vline(
    x: number,
    z0: number,
    z1: number,
    gaps: readonly (readonly [number, number])[] = [],
    look?: WallLook,
    thick = 2,
  ): this {
    let at = z0;
    for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
      if (a > at) this.wall([x - thick / 2, at, x + thick / 2, a], look);
      at = Math.max(at, b);
    }
    if (at < z1) this.wall([x - thick / 2, at, x + thick / 2, z1], look);
    return this;
  }

  /**
   * A walled enclosure on a rectangle, with gaps per side ([from, to] along that side) and the
   * same look all round.
   */
  pen(
    rect: R,
    gaps: Partial<Record<'n' | 's' | 'e' | 'w', readonly (readonly [number, number])[]>>,
    look?: WallLook,
  ): this {
    const [x0, z0, x1, z1] = rect;
    this.hline(z0, x0, x1, gaps.n ?? [], look);
    this.hline(z1, x0, x1, gaps.s ?? [], look);
    this.vline(x0, z0 + 1, z1 - 1, gaps.w ?? [], look);
    this.vline(x1, z0 + 1, z1 - 1, gaps.e ?? [], look);
    return this;
  }

  /** A square rock (or any block) centred on a point. */
  rock(x: number, z: number, size = 3, look?: WallLook): this {
    return this.wall([x - size / 2, z - size / 2, x + size / 2, z + size / 2], look ?? 'rock');
  }

  water(rect: R): this {
    this.waterBoxes.push(box(rect));
    return this;
  }

  /** A bridge site (dry but shut until built) with the bank its logs go to, and the logs. */
  bridge(rect: R, bank: Point, logs: readonly Point[]): this {
    this.bridgeSpawns.push({ ...box(rect), bank, needs: logs.length });
    this.logSpots.push(...logs);
    return this;
  }

  gate(rect: R, hp: number, style?: GateSpawn['style']): this {
    this.gateSpawns.push({ ...box(rect), hp, ...(style ? { style } : {}) });
    return this;
  }

  /** A raised terrace with ramps up and one-way drops down (see course.ts). */
  terrace(rect: R, height: number, openings: readonly Opening[], base = 0): this {
    const built = terrace(rect, height, openings, base);
    this.plateaus.push(built.plateau);
    this.ramps.push(...built.ramps);
    this.ledges.push(...built.ledges);
    this.obstacles.push(...built.walls);
    return this;
  }

  conveyor(rect: R, dx: number, dz: number): this {
    this.conveyorBoxes.push({ ...box(rect), dx, dz });
    return this;
  }

  vent(x: number, z: number, period = 4, offset = 0): this {
    this.ventSpawns.push({ x, z, period, offset });
    return this;
  }

  coil(a: Point, b: Point, period = 4, offset = 0): this {
    this.coilSpawns.push({ a, b, period, offset });
    return this;
  }

  drip(x: number, z: number, period = 4, offset = 0): this {
    this.dripSpawns.push({ x, z, period, offset });
    return this;
  }

  beacon(x: number, z: number): this {
    this.beaconSpawns.push({ x, z });
    return this;
  }

  sap(x: number, z: number): this {
    this.saps.push({ x, z });
    return this;
  }

  /** A Glowcap sprouting `at` seconds in, wilting `lifetime` seconds later. */
  bloom(x: number, z: number, at: number, weight = 3, lifetime = 70): this {
    this.bloomSpawns.push({ x, z, at, weight, lifetime });
    return this;
  }

  shard(x: number, z: number, weight: number, extra: Partial<TreasureSpawn> = {}): this {
    this.treasures.push({ id: `shard-${++this.shardNo}`, x, z, weight, ...extra });
    return this;
  }

  /** Several shards of one weight at once. */
  shards(
    points: readonly (readonly [number, number])[],
    weight: number,
    extra: Partial<TreasureSpawn> = {},
  ): this {
    for (const [x, z] of points) this.shard(x, z, weight, extra);
    return this;
  }

  /** The id the next shard will have, for a telescope to reveal. */
  get nextShard(): string {
    return `shard-${this.shardNo + 1}`;
  }

  beast(kind: EnemyKind, x: number, z: number, extra: Partial<EnemySpawn> = {}): this {
    this.enemies.push({ kind, x, z, ...extra });
    return this;
  }

  /** A mound that hides a seed pod (or a sapdrop). */
  mound(x: number, z: number, reveals: 'pod' | 'sap' = 'pod'): this {
    return this.beast('mound', x, z, { reveals });
  }

  pod(x: number, z: number, kind?: PodSpawn['kind']): this {
    this.pods.push({ x, z, ...(kind ? { kind } : {}) });
    return this;
  }

  root(x: number, z: number, knots: readonly Point[], drop: number): this {
    this.rootSpawns.push({ x, z, knots, drop });
    return this;
  }

  ambush(kind: EnemyKind, x: number, z: number, at: number): this {
    this.ambushSpawns.push({ kind, x, z, at });
    return this;
  }

  telescope(x: number, z: number, reveals: readonly string[]): this {
    this.telescopeSpot = { x, z, reveals: [...reveals] };
    return this;
  }

  /** The field as a challenge spec, with its measured pace. */
  done(pace: number): FieldSpec {
    const m = this.meta;
    const startingWorkers = Object.values(m.squad).reduce((sum, n) => sum + (n ?? 0), 0);
    return {
      id: m.id,
      name: m.name,
      brief: m.brief,
      theme: m.theme,
      width: m.width,
      depth: m.depth,
      dayLength: m.dayLength,
      seed: m.seed,
      startingWorkers,
      squad: m.squad,
      captain: m.captain ?? { x: m.kiln.x + 3, z: m.kiln.z + 1 },
      kiln: m.kiln,
      obstacles: this.obstacles,
      treasures: this.treasures,
      pods: this.pods,
      enemies: this.enemies,
      pace,
      ...(m.look ? { wallLook: m.look } : {}),
      ...(this.waterBoxes.length ? { water: this.waterBoxes } : {}),
      ...(this.bridgeSpawns.length ? { bridges: this.bridgeSpawns, logs: this.logSpots } : {}),
      ...(this.gateSpawns.length ? { gates: this.gateSpawns } : {}),
      ...(this.ventSpawns.length ? { vents: this.ventSpawns } : {}),
      ...(this.coilSpawns.length ? { coils: this.coilSpawns } : {}),
      ...(this.dripSpawns.length ? { drips: this.dripSpawns } : {}),
      ...(this.conveyorBoxes.length ? { conveyors: this.conveyorBoxes } : {}),
      ...(this.beaconSpawns.length ? { beacons: this.beaconSpawns } : {}),
      ...(this.saps.length ? { saps: this.saps } : {}),
      ...(this.bloomSpawns.length ? { blooms: this.bloomSpawns } : {}),
      ...(this.rootSpawns.length ? { roots: this.rootSpawns } : {}),
      ...(this.plateaus.length ? { plateaus: this.plateaus, ramps: this.ramps } : {}),
      ...(this.ledges.length ? { ledges: this.ledges } : {}),
      ...(this.ambushSpawns.length ? { ambushes: this.ambushSpawns } : {}),
      ...(this.telescopeSpot ? { telescope: this.telescopeSpot } : {}),
    };
  }
}

/** Fields easiest first, by the test player's pace (a time, a headcount or a loss count). */
export function byPace(specs: readonly FieldSpec[], descending = false): FieldSpec[] {
  return [...specs].sort((a, b) => (descending ? b.pace - a.pace : a.pace - b.pace));
}
