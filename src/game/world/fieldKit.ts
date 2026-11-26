import type { EnemyKind } from '../enemies/enemyKinds';
import type { ChallengeId } from '../modes/modes';
import type { Box, Point } from '../navigation/NavGrid';
import type { Squad, SproutKind } from '../workers/sprouts';
import { terrace, terraces } from './course';
import { seeded } from './generator';
import type { FieldSpec } from './levels/challenges/field';
import type {
  BeaconSpawn,
  BloomSpawn,
  BridgeSpawn,
  CoilSpawn,
  EnemySpawn,
  GateSpawn,
  LevelTheme,
  PodSpawn,
  TreasureSpawn,
  VentSpawn,
  Wall,
} from './levelTypes';

/**
 * The field composer: a challenge field built as a small world of walled zones rather than one
 * open lawn. The zones sit on a grid; a random tree joins them all to the Kiln's zone, and a
 * few extra ways through make loops, so there is more than one route and an order to choose.
 * Each way through is a plain gap, a bramble gate to break, a crystal door for Stonelings, or a
 * stream with a bridge to build from logs (or wade with Dewlings). Each zone holds one idea: a
 * scatter of shards, a guarded hoard, a raised shelf, a pond only Dewlings work in, a vent or
 * coil nook for one kind alone, a beast's den, a garden of pods and mounds, and at the top a
 * boss. Far zones may have a beacon to shorten the way home.
 *
 * Every field it makes is played through by the test player before it is offered; the ones it
 * cannot finish in a fair time are thrown away (see `fieldKit.report.test.ts`). `tier` (1 to 12)
 * sets the size and how many ideas a field combines, so a challenge's twelve fields ramp.
 */

/** A zone's side, in units. Corners on even numbers keep walls on the navigation grid. */
const ZONE = 26;
const WALL = 2;
const GAP = 6;
/** How far inside its zone a beast waits. */
const BEAST_INSET = 8;

type Connector = 'open' | 'bramble' | 'crystal' | 'bridge';
type Module =
  | 'scatter'
  | 'hoard'
  | 'shelf'
  | 'pond'
  | 'vent'
  | 'coil'
  | 'den'
  | 'garden'
  | 'boss'
  | 'twins'
  | 'dewglass';

/** What went into a field, for its brief and for checking the composer does what it says. */
export interface Composed {
  spec: Omit<FieldSpec, 'pace'>;
  zones: number;
  loops: number;
  connectors: Connector[];
  modules: Module[];
  kilnZone: 'corner' | 'edge' | 'centre';
}

const THEMES: readonly LevelTheme[] = ['meadow', 'autumn', 'marsh', 'dusk', 'terrarium'];
const SMALL: readonly EnemyKind[] = ['skitter', 'slug', 'newt', 'mimic'];
const MEDIUM: readonly EnemyKind[] = ['mossback', 'spitter', 'hedgehog', 'shellback'];
const BIG: readonly EnemyKind[] = ['ramhorn', 'mossback', 'spitter'];

/** The grid of zones for a tier: two to twelve zones. */
function gridFor(tier: number, random: () => number): [number, number] {
  if (tier <= 2) return random() < 0.5 ? [3, 2] : [2, 3];
  if (tier <= 5) return random() < 0.5 ? [4, 2] : [3, 2];
  if (tier <= 9) return random() < 0.5 ? [3, 3] : [4, 2];
  return random() < 0.5 ? [4, 3] : [3, 3];
}

interface Zone {
  col: number;
  row: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Ways through to its neighbours, by neighbour index. */
  links: Set<number>;
  depth: number;
}

/** A field composed for a challenge at a tier, from a seed. Its id is the caller's. */
export function composeField(seed: number, mode: ChallengeId, tier: number, id: string): Composed {
  const random = seeded(seed * 7919 + tier * 104729);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);
  const chance = (p: number) => random() < p;
  const [cols, rows] = gridFor(tier, random);
  const width = cols * ZONE;
  const depth = rows * ZONE;
  const left = -width / 2;
  const top = -depth / 2;

  const zones: Zone[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      zones.push({
        col,
        row,
        x0: left + col * ZONE,
        z0: top + row * ZONE,
        x1: left + (col + 1) * ZONE,
        z1: top + (row + 1) * ZONE,
        links: new Set(),
        depth: 0,
      });
    }
  }
  const at = (col: number, row: number) => zones[row * cols + col];
  const neighbours = (i: number): number[] => {
    const { col, row } = zones[i];
    return [
      [col - 1, row],
      [col + 1, row],
      [col, row - 1],
      [col, row + 1],
    ]
      .filter(([c, r]) => c >= 0 && r >= 0 && c < cols && r < rows)
      .map(([c, r]) => r * cols + c);
  };

  // The Kiln's zone: a corner, the middle of an edge, or the centre when there is one.
  const centre = cols >= 3 && rows >= 3 ? at(Math.floor(cols / 2), Math.floor(rows / 2)) : null;
  const corners = [at(0, 0), at(cols - 1, 0), at(0, rows - 1), at(cols - 1, rows - 1)];
  const choice = random();
  const home: Zone =
    centre && choice < 0.4
      ? centre
      : choice < 0.7 && cols >= 3
        ? at(Math.floor(cols / 2), pick([0, rows - 1]))
        : pick(corners);
  const homeIndex = zones.indexOf(home);
  const kilnZone: Composed['kilnZone'] =
    home === centre ? 'centre' : corners.includes(home) ? 'corner' : 'edge';

  // A random tree from the Kiln's zone, then loops.
  const seen = new Set([homeIndex]);
  const stack = [homeIndex];
  const parent = new Map<number, number>();
  while (stack.length > 0) {
    const i = stack[stack.length - 1];
    const next = neighbours(i).filter((n) => !seen.has(n));
    if (next.length === 0) {
      stack.pop();
      continue;
    }
    const n = pick(next);
    seen.add(n);
    parent.set(n, i);
    zones[i].links.add(n);
    zones[n].links.add(i);
    zones[n].depth = zones[i].depth + 1;
    stack.push(n);
  }
  let loops = 0;
  const spare: [number, number][] = [];
  zones.forEach((zone, i) => {
    for (const n of neighbours(i)) if (n > i && !zone.links.has(n)) spare.push([i, n]);
  });
  const loopShare = tier <= 2 ? 0.5 : 0.35;
  for (const [a, b] of spare) {
    if (!chance(loopShare)) continue;
    zones[a].links.add(b);
    zones[b].links.add(a);
    loops++;
  }

  const kiln = {
    x: Math.round((home.x0 + home.x1) / 2) - 4,
    z: Math.round((home.z0 + home.z1) / 2),
  };
  const captain = { x: kiln.x + 3, z: kiln.z + 1 };

  const obstacles: Wall[] = [];
  const water: Box[] = [];
  const gates: GateSpawn[] = [];
  const bridges: BridgeSpawn[] = [];
  const logs: Point[] = [];
  const connectors: Connector[] = [];
  /** Places taken, so nothing lands on anything else. */
  const taken: { x: number; z: number; r: number }[] = [{ ...kiln, r: 6 }];
  const blocked: Box[] = [];

  // The walls between zones, each with its way through (or none).
  const connectorFor = (): Connector => {
    const options: Connector[] = ['open', 'open', 'bramble'];
    if (tier >= 3) options.push('bridge', 'bramble');
    if (tier >= 5) options.push('crystal');
    if (tier >= 8) options.push('bridge', 'crystal');
    return pick(options);
  };
  let crystals = 0;
  let bridgeCount = 0;
  zones.forEach((zone, i) => {
    for (const n of neighbours(i)) {
      if (n < i) continue;
      const other = zones[n];
      const vertical = other.col !== zone.col; // the wall runs north-south
      const fixed = vertical ? zone.x1 : zone.z1;
      const from = vertical ? zone.z0 : zone.x0;
      const to = vertical ? zone.z1 : zone.x1;
      const linked = zone.links.has(n);
      let kind: Connector = linked ? connectorFor() : 'open';
      if (kind === 'crystal' && crystals >= 2) kind = 'bramble';
      if (kind === 'bridge' && bridgeCount >= 2) kind = 'open';
      const gapAt = linked ? Math.round(between(from + 6, to - 6 - GAP) / 2) * 2 : 0;
      const box = (a: number, b: number): Wall =>
        vertical
          ? { x: fixed, z: (a + b) / 2, w: WALL, d: b - a }
          : { x: (a + b) / 2, z: fixed, w: b - a, d: WALL };
      if (!linked) {
        obstacles.push(box(from, to));
        continue;
      }
      connectors.push(kind);
      const gap = box(gapAt, gapAt + GAP);
      if (kind === 'bridge') {
        bridgeCount++;
        // A stream along the whole boundary, bridged at the gap.
        const stream = vertical
          ? { x: fixed, z: (from + to) / 2, w: 4, d: to - from }
          : { x: (from + to) / 2, z: fixed, w: to - from, d: 4 };
        // The water stops either side of the bridge site, which is dry but shut until built.
        const reach = (a: number, b: number): Box =>
          vertical
            ? { x: fixed, z: (a + b) / 2, w: 4, d: b - a }
            : { x: (a + b) / 2, z: fixed, w: b - a, d: 4 };
        water.push(reach(from, gapAt), reach(gapAt + GAP, to));
        blocked.push(vertical ? { ...stream, w: 8 } : { ...stream, d: 8 });
        const bridge = vertical
          ? { x: fixed, z: gapAt + GAP / 2, w: 4, d: GAP }
          : { x: gapAt + GAP / 2, z: fixed, w: GAP, d: 4 };
        // The bank on the Kiln's side of the stream: the zone nearer home.
        const near = zone.depth <= other.depth ? zone : other;
        const towards = near === zone ? -1 : 1;
        const bank = vertical
          ? { x: fixed + towards * 4, z: bridge.z }
          : { x: bridge.x, z: fixed + towards * 4 };
        const needs = tier >= 8 ? 3 : 2;
        bridges.push({ ...bridge, bank, needs });
        taken.push({ ...bank, r: 3 });
        for (let k = 0; k < needs; k++) {
          const spot = spotIn(near, 3, 1.5);
          if (spot) logs.push(spot);
        }
        continue;
      }
      obstacles.push(box(from, gapAt), box(gapAt + GAP, to));
      blocked.push(vertical ? { ...gap, w: 8 } : { ...gap, d: 8 });
      if (kind === 'bramble' || kind === 'crystal') {
        if (kind === 'crystal') crystals++;
        gates.push({
          ...gap,
          hp: kind === 'crystal' ? 100 : Math.round(60 + tier * 10),
          ...(kind === 'crystal' ? { style: 'crystal' as const } : {}),
        });
      }
    }
  });

  /** A free spot in a zone, `inset` from its walls, clear by `r`; null if none. */
  function spotIn(zone: Zone, inset: number, r: number): Point | null {
    for (let tries = 0; tries < 60; tries++) {
      const x = Math.round(between(zone.x0 + inset + r, zone.x1 - inset - r));
      const z = Math.round(between(zone.z0 + inset + r, zone.z1 - inset - r));
      if (taken.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + r)) continue;
      if (blocked.some((b) => Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r))
        continue;
      taken.push({ x, z, r });
      return { x, z };
    }
    return null;
  }

  // What each zone holds.
  const treasures: TreasureSpawn[] = [];
  const enemies: EnemySpawn[] = [];
  const pods: PodSpawn[] = [];
  const vents: VentSpawn[] = [];
  const coils: CoilSpawn[] = [];
  const beacons: BeaconSpawn[] = [];
  const blooms: BloomSpawn[] = [];
  const plateaus: ReturnType<typeof terraces>['plateaus'] = [];
  const ramps: ReturnType<typeof terraces>['ramps'] = [];
  const ledges: ReturnType<typeof terraces>['ledges'] = [];
  const modules: Module[] = [];
  const needs = new Set<SproutKind>();
  let shardNo = 0;
  const shard = (p: Point, weight: number, extra: Partial<TreasureSpawn> = {}) =>
    treasures.push({ id: `shard-${++shardNo}`, ...p, weight, ...extra });
  const beast = (pool: readonly EnemyKind[], near: Point, extra: Partial<EnemySpawn> = {}) =>
    enemies.push({ x: near.x, z: near.z, kind: pick(pool), ...extra });
  /**
   * Where a beast waits: well inside its zone, so it never stands by a wall or a doorway it
   * could be seen through before the way to it is open.
   */
  const lair = (zone: Zone, r = 2) => spotIn(zone, BEAST_INSET, r);

  const growing = mode === 'growing';
  const trial = mode === 'trial';
  const fights = mode === 'mission' || mode === 'dandori';
  const deepest = Math.max(...zones.map((z) => z.depth));
  const menu = (zone: Zone): Module[] => {
    // A Growing Season is about heads: pods, mounds and beasts to carry home, no shards.
    if (growing) return ['garden', 'garden', 'garden', 'den'];
    const leaf = zone.links.size === 1;
    const list: Module[] = ['scatter', 'hoard'];
    if (mode === 'hunt') list.push('scatter', 'twins', 'dewglass', 'hoard');
    if (fights) list.push('den', 'den', 'hoard');
    if (tier >= 2) list.push('shelf');
    if (tier >= 3) list.push('pond');
    // A hazard nook only where nothing else passes through: a dead end.
    if (tier >= 4 && leaf) list.push('vent', 'coil');
    if (!trial && !growing) list.push('garden');
    return list;
  };
  let twinsLeft = mode === 'hunt' ? 2 : 0;
  let bossPlaced = false;
  const others = zones.filter((zone) => zone !== home);
  for (const zone of others) {
    let module = pick(menu(zone));
    if (module === 'twins' && twinsLeft === 0) module = 'scatter';
    // The farthest dead end at the top tiers is a boss's.
    if (!bossPlaced && fights && tier >= 10 && zone.depth === deepest && zone.links.size === 1) {
      module = 'boss';
      bossPlaced = true;
    }
    modules.push(module);
    const middle = { x: (zone.x0 + zone.x1) / 2, z: (zone.z0 + zone.z1) / 2 };
    switch (module) {
      case 'scatter': {
        const count = 4 + Math.floor(random() * (3 + tier / 3));
        for (let k = 0; k < count; k++) {
          const p = spotIn(zone, 3, 1.5);
          if (p) shard(p, 1 + Math.floor(random() * 4));
        }
        break;
      }
      case 'hoard': {
        const p = spotIn(zone, 5, 2.5);
        if (p) {
          const lodestone = chance(0.35) && tier >= 3;
          shard(p, Math.round(between(4, 6 + tier / 2)), lodestone ? { variant: 'lodestone' } : {});
          const guard = lair(zone);
          if (guard) beast(tier >= 6 ? BIG : MEDIUM, guard);
        }
        break;
      }
      case 'twins': {
        twinsLeft--;
        // Halves in two different zones, as far apart as can be.
        const far = [...others].sort(
          (a, b) =>
            Math.hypot(b.x0 - zone.x0, b.z0 - zone.z0) - Math.hypot(a.x0 - zone.x0, a.z0 - zone.z0),
        )[0];
        const a = spotIn(zone, 4, 1.5);
        const b = far && far !== zone ? spotIn(far, 4, 1.5) : spotIn(zone, 4, 1.5);
        const pair = twinsLeft === 1 ? 'a' : 'b';
        if (a && b) {
          shard(a, 2, { twin: pair });
          shard(b, 2, { twin: pair });
        } else if (a) shard(a, 2);
        break;
      }
      case 'dewglass': {
        for (let k = 0; k < 2; k++) {
          const p = spotIn(zone, 4, 1.5);
          if (p) shard(p, 2, { variant: 'dewglass' });
        }
        const p = spotIn(zone, 3, 1.5);
        if (p) shard(p, 1);
        break;
      }
      case 'shelf': {
        // A raised shelf in the zone, a ramp up one side, shards on top.
        const rampSide = pick(['n', 's', 'e', 'w'] as const);
        const inset = 5;
        const x0 = zone.x0 + inset + (rampSide === 'w' ? 6 : 0);
        const x1 = zone.x1 - inset - (rampSide === 'e' ? 6 : 0);
        const z0 = zone.z0 + inset + (rampSide === 'n' ? 6 : 0);
        const z1 = zone.z1 - inset - (rampSide === 's' ? 6 : 0);
        const horizontal = rampSide === 'n' || rampSide === 's';
        const mid = horizontal ? Math.round((x0 + x1) / 2) : Math.round((z0 + z1) / 2);
        const built = terrace([x0, z0, x1, z1], 3, [
          { side: rampSide, from: mid - 3, to: mid + 3, kind: 'ramp' },
        ]);
        const kit = terraces(built);
        plateaus.push(...kit.plateaus);
        ramps.push(...kit.ramps);
        ledges.push(...kit.ledges);
        obstacles.push(...kit.walls);
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        shard({ x: Math.round(cx - 2), z: Math.round(cz) }, 2 + Math.floor(random() * 3));
        shard({ x: Math.round(cx + 2), z: Math.round(cz + 1) }, 1 + Math.floor(random() * 2));
        taken.push({ x: cx, z: cz, r: Math.max(x1 - x0, z1 - z0) / 2 + 7 });
        if (fights || chance(0.4)) {
          const guard = lair(zone, 1.5);
          if (guard) beast(SMALL, guard);
        }
        break;
      }
      case 'pond': {
        needs.add('dew');
        const pond = { x: middle.x, z: middle.z, w: 10, d: 8 };
        water.push(pond);
        taken.push({ ...middle, r: 7 });
        shard({ x: middle.x - 2, z: middle.z }, 2);
        shard({ x: middle.x + 2, z: middle.z + 1 }, 1);
        const p = spotIn(zone, 3, 1.5);
        if (p) shard(p, 2);
        break;
      }
      case 'vent': {
        needs.add('ember');
        // In the zone's far corner, away from its way in.
        const corner = farCorner(zone);
        vents.push({ ...corner.fixture, period: 4, offset: Math.floor(random() * 4) });
        shard(corner.prize, 2);
        taken.push({ ...corner.fixture, r: 6 });
        break;
      }
      case 'coil': {
        needs.add('spark');
        const corner = farCorner(zone);
        const run = corner.run;
        coils.push({ a: run[0], b: run[1], period: 4, offset: Math.floor(random() * 4) });
        shard(corner.prize, 2);
        taken.push({ ...corner.fixture, r: 7 });
        break;
      }
      case 'den': {
        const count = 1 + Math.floor(random() * (1 + tier / 4));
        for (let k = 0; k < count; k++) {
          const p = lair(zone);
          if (p) {
            const pool = tier >= 7 && k === 0 ? BIG : tier >= 3 ? MEDIUM : SMALL;
            beast(pool, p, fights && chance(0.4) ? { drop: 2 + Math.floor(tier / 4) } : {});
          }
        }
        const p = spotIn(zone, 3, 1.5);
        if (p && !growing) shard(p, 1 + Math.floor(random() * 2));
        break;
      }
      case 'garden': {
        const count = growing ? 2 + Math.floor(random() * 3) : 1;
        for (let k = 0; k < count; k++) {
          const p = spotIn(zone, 3, 1.5);
          if (p) pods.push(p);
        }
        if (growing || chance(0.3)) {
          const m = spotIn(zone, 3, 1.5);
          if (m) enemies.push({ ...m, kind: 'mound', reveals: 'pod' });
        }
        if (!growing) {
          const p = spotIn(zone, 3, 1.5);
          if (p) shard(p, 1 + Math.floor(random() * 2));
        }
        break;
      }
      case 'boss': {
        const p = lair(zone, 3);
        if (p) enemies.push({ ...p, kind: 'gravelmaw', drop: 5 });
        break;
      }
    }
    // A far zone may have a beacon, so its hauls need not come all the way home.
    if (!growing && zone.depth >= 2 && chance(0.35)) {
      const p = spotIn(zone, 4, 1.5);
      if (p) beacons.push(p);
    }
  }

  /** The corner of a dead-end zone farthest from its one way in, with a hazard and its prize. */
  function farCorner(zone: Zone) {
    const [n] = [...zone.links];
    const door = zones[n];
    const east = door.col < zone.col || (door.col === zone.col && random() < 0.5);
    const south = door.row < zone.row || (door.row === zone.row && random() < 0.5);
    const cx = east ? zone.x1 - 6 : zone.x0 + 6;
    const cz = south ? zone.z1 - 6 : zone.z0 + 6;
    const fixture = { x: cx, z: cz };
    const prize = { x: cx + (east ? 1.5 : -1.5), z: cz + (south ? 1.5 : -1.5) };
    const run: [Point, Point] = [
      { x: cx - 2, z: cz },
      { x: cx + 2, z: cz },
    ];
    return { fixture, prize, run };
  }

  // Treasure for the Glowcap's detour: the farthest open zone, a quarter of the way in.
  const day = dayFor(mode, tier, width * depth);
  if (!growing && !trial) {
    const far = [...others].sort((a, b) => b.depth - a.depth)[0];
    const p = far ? spotIn(far, 4, 1.5) : null;
    if (p) blooms.push({ ...p, weight: 3, at: Math.round(day * 0.25), lifetime: 70 });
  }
  // A Trial grows nothing: its fields have no pods (and a mound's pod would be one).
  if (trial) {
    pods.length = 0;
    for (let k = enemies.length - 1; k >= 0; k--)
      if (enemies[k].kind === 'mound') enemies.splice(k, 1);
  }
  // A few rocks for shape.
  for (const zone of others) {
    if (!chance(0.5)) continue;
    const p = spotIn(zone, 4, 2.5);
    if (p) obstacles.push({ x: p.x, z: p.z, w: 3, d: 3 });
  }

  // The squad: enough hands for the field, with every kind its jobs need.
  // Few hands for the work, so every throw counts and the day takes a while.
  const base = growing ? 6 + tier : trial ? 12 + tier : 10 + tier;
  const squad: Squad = {};
  const kinds: SproutKind[] = ['ember', 'dew', 'stone', 'spark'];
  if (crystals > 0) needs.add('stone');
  const chosen = new Set<SproutKind>([...needs, ...kinds.filter(() => chance(0.4))]);
  if (chosen.size === 0) chosen.add('ember');
  let unplaced = base;
  const share = Math.max(3, Math.floor(base / chosen.size));
  for (const kind of chosen) {
    const n = Math.max(needs.has(kind) ? 4 : 0, Math.min(unplaced, share));
    squad[kind] = n;
    unplaced -= n;
  }
  if (unplaced > 0) squad[[...chosen][0]] = (squad[[...chosen][0]] ?? 0) + unplaced;
  const startingWorkers = Object.values(squad).reduce((sum, n) => sum + (n ?? 0), 0);

  const spec: Omit<FieldSpec, 'pace'> = {
    id,
    name: id,
    brief: '',
    theme: pick(THEMES),
    width,
    depth,
    dayLength: day,
    seed,
    startingWorkers,
    squad,
    captain,
    kiln,
    obstacles,
    treasures,
    pods,
    enemies,
    ...(water.length ? { water } : {}),
    ...(gates.length ? { gates } : {}),
    ...(bridges.length ? { bridges, logs } : {}),
    ...(vents.length ? { vents } : {}),
    ...(coils.length ? { coils } : {}),
    ...(beacons.length ? { beacons } : {}),
    ...(blooms.length ? { blooms } : {}),
    ...(plateaus.length ? { plateaus, ramps, ledges } : {}),
  };
  return {
    spec,
    zones: zones.length,
    loops,
    connectors,
    modules,
    kilnZone,
  };
}

/**
 * The least a composed field should take the test player, by tier: about two minutes for the
 * first, six and a half for the last. A quicker one is too slight and is not offered.
 */
export function leastPace(tier: number): number {
  return 90 + tier * 25;
}

/** A composed field's day: long enough for its size, by tier. Untimed rules ignore it. */
export function dayFor(mode: ChallengeId, tier: number, area: number): number {
  if (mode === 'growing') return Math.round((200 + tier * 20) / 5) * 5;
  return Math.round((200 + area / 15 + tier * 20) / 5) * 5;
}

const COUNT = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];
const count = (n: number) => COUNT[n] ?? String(n);
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Joins phrases as a list: "a, b and c". */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * A composed field's brief, in words: its shape, its ways through and what stands out in it, so
 * a player knows before the day what the field asks of them.
 */
export function briefFor(composed: Composed, mode: ChallengeId): string {
  const { spec, zones, loops, connectors, modules, kilnZone } = composed;
  const where =
    kilnZone === 'centre'
      ? 'around the Kiln in the middle'
      : kilnZone === 'corner'
        ? 'spreading out from the Kiln in a corner'
        : 'either side of the Kiln on the edge';
  const shape = `${capital(count(zones))} walled gardens ${where}${loops > 0 ? ', with more than one way round' : ''}.`;
  const ways: string[] = [];
  const brambles = connectors.filter((c) => c === 'bramble').length;
  const crystals = connectors.filter((c) => c === 'crystal').length;
  const streams = connectors.filter((c) => c === 'bridge').length;
  if (brambles)
    ways.push(
      brambles === 1 ? 'a bramble gate to break' : `${count(brambles)} bramble gates to break`,
    );
  if (crystals)
    ways.push(
      crystals === 1
        ? 'a crystal door only Stonelings crack quickly'
        : `${count(crystals)} crystal doors only Stonelings crack quickly`,
    );
  if (streams)
    ways.push(
      streams === 1
        ? 'a stream to bridge with logs (or wade with Dewlings)'
        : `${count(streams)} streams to bridge with logs (or wade with Dewlings)`,
    );
  const between = ways.length ? `Between them: ${list(ways)}.` : 'Every way between them is open.';
  const sights: string[] = [];
  if (spec.enemies.some((e) => e.kind === 'gravelmaw'))
    sights.push('a Gravelmaw holds the farthest garden');
  if (spec.treasures.some((t) => t.variant === 'lodestone'))
    sights.push('a Lodestone crawls away from anyone too few to lift it');
  if (modules.includes('shelf'))
    sights.push(
      modules.filter((m) => m === 'shelf').length > 1
        ? 'shards wait on raised shelves'
        : 'shards wait on a raised shelf',
    );
  if (modules.includes('pond')) sights.push('a pond only Dewlings can work in');
  if (modules.includes('vent')) sights.push('a flame vent guards a nook only Emberlings can work');
  if (modules.includes('coil'))
    sights.push('a crackling coil guards a nook only Sparklings can work');
  if (spec.treasures.some((t) => t.twin))
    sights.push('twin shards lie far apart, worth more brought home together');
  if (spec.treasures.some((t) => t.variant === 'dewglass'))
    sights.push('Dewglass cracks if it is dropped');
  if (modules.includes('garden') && mode === 'growing')
    sights.push('seed pods and mounds fill the gardens');
  if (spec.enemies.filter((e) => e.kind !== 'mound').length >= 4 && mode !== 'growing')
    sights.push('beasts keep most of the gardens');
  const beacons = (spec.beacons ?? []).length;
  if (beacons)
    sights.push(
      beacons === 1
        ? 'a cold beacon far out can shorten the walk home'
        : 'cold beacons far out can shorten the walk home',
    );
  const detail = sights.length ? `${capital(list(sights.slice(0, 3)))}.` : '';
  const glow = (spec.blooms ?? []).length
    ? ' A Glowcap sprouts in the farthest garden a quarter of the way into the day.'
    : '';
  return `${shape} ${between} ${detail}${glow}`.replace(/\s+/g, ' ').trim();
}
