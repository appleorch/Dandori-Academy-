import type { EnemyKind } from '../enemies/enemyKinds';
import type { ChallengeId } from '../modes/modes';
import type { FieldSpec } from './levels/challenges/field';
import type { Box } from '../navigation/NavGrid';
import type { EnemySpawn, PodSpawn, TreasureSpawn } from './levelTypes';

/**
 * The field kit's generator: a whole challenge field from a seed, built from templates (a
 * setting, a size, wall pieces and rocks, a pond, and the field's goods and beasts) by plain
 * seeded arithmetic. Every field it makes is checked by the test player before it is offered
 * (see daily.ts and generator.test.ts): a field the test player cannot finish is thrown away
 * and the next seed tried.
 *
 * Two templates: a hunt (shards scattered over an obstacle course: the daily challenge) and an
 * escort (one slow, crawling Lodestone relic across a long field, with beasts waiting in
 * ambush along the way and more arriving as the day goes on).
 */

export type FieldTemplate = 'hunt' | 'escort';

/** The daily field's layout families: open rocks, a cross, aisles, pens, a ring, a channel. */
export const DAILY_LAYOUTS = ['rocks', 'cross', 'aisles', 'pens', 'ring', 'channel'] as const;
export type DailyLayout = (typeof DAILY_LAYOUTS)[number];

/** A small seeded generator (mulberry32), so the same seed always makes the same field. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const THEMES = ['meadow', 'autumn', 'marsh', 'dusk', 'terrarium'] as const;
/** Beasts the generator sets out: the ones a squad can learn on. */
const EASY: readonly EnemyKind[] = ['mossback', 'slug', 'skitter', 'mound'];
const AMBUSH: readonly EnemyKind[] = ['mossback', 'skitter', 'ramhorn', 'slug', 'spitter'];

const NAMES = {
  first: [
    'Quiet',
    'Sunny',
    'Mossy',
    'Windy',
    'Tangled',
    'Golden',
    'Misty',
    'Crooked',
    'Hidden',
    'Long',
  ],
  second: ['Lawn', 'Hollow', 'Border', 'Patch', 'Walk', 'Corner', 'Bed', 'Run', 'Green', 'Path'],
};

interface Placed {
  x: number;
  z: number;
  r: number;
}

/** A field from a seed, by a template. Its id is the caller's; the pace is measured later. */
export function generateField(
  seed: number,
  template: FieldTemplate,
  id: string,
): Omit<FieldSpec, 'pace'> {
  const random = seeded(seed);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);
  const escort = template === 'escort';
  const width = Math.round(escort ? between(96, 120) : between(58, 76));
  const depth = Math.round(escort ? between(36, 46) : between(38, 50));
  const hw = width / 2;
  const hd = depth / 2;
  const kiln = { x: -hw + 6, z: Math.round(between(-hd / 3, hd / 3)) };
  const captain = { x: kiln.x + 3, z: kiln.z + 1 };
  const taken: Placed[] = [{ x: kiln.x, z: kiln.z, r: 6 }];
  const obstacles: Box[] = [];
  const water: Box[] = [];
  /** Clear of every wall and pond placed so far, by `r` and a little more. */
  const clear = (x: number, z: number, r: number) =>
    [...obstacles, ...water].every(
      (b) => Math.abs(x - b.x) > b.w / 2 + r + 1 || Math.abs(z - b.z) > b.d / 2 + r + 1,
    );
  const free = (x: number, z: number, r: number) =>
    Math.abs(x) < hw - 3 - r &&
    Math.abs(z) < hd - 3 - r &&
    taken.every((p) => Math.hypot(p.x - x, p.z - z) > p.r + r) &&
    clear(x, z, r);
  /** Somewhere free in a band of the field (shares of its width from the west), or null. */
  const spot = (from: number, to: number, r: number): { x: number; z: number } | null => {
    for (let tries = 0; tries < 40; tries++) {
      const x = Math.round(-hw + width * between(from, to));
      const z = Math.round(between(-hd + 4, hd - 4));
      if (free(x, z, r)) {
        taken.push({ x, z, r });
        return { x, z };
      }
    }
    return null;
  };

  // The daily field's layout: one of several families, so no two days look alike.
  const layout: DailyLayout = escort ? 'rocks' : pick(DAILY_LAYOUTS);
  /** A wall along z from x0 to x1 (or along x, `vertical`), with gaps of six. */
  const line = (vertical: boolean, at: number, from: number, to: number, gaps: number[]) => {
    let start = from;
    for (const gap of [...gaps].sort((p, q) => p - q)) {
      if (gap > start)
        obstacles.push(
          vertical
            ? { x: at, z: (start + gap) / 2, w: 2, d: gap - start }
            : { x: (start + gap) / 2, z: at, w: gap - start, d: 2 },
        );
      start = gap + 6;
    }
    if (start < to)
      obstacles.push(
        vertical
          ? { x: at, z: (start + to) / 2, w: 2, d: to - start }
          : { x: (start + to) / 2, z: at, w: to - start, d: 2 },
      );
  };
  const gapIn = (from: number, to: number) => Math.round(between(from + 3, to - 9));
  if (layout === 'cross') {
    const cx = Math.round(between(-hw * 0.1, hw * 0.25));
    line(false, 0, -hw * 0.45, hw, [gapIn(-hw * 0.45, cx), gapIn(cx, hw)]);
    line(true, cx, -hd, hd, [gapIn(-hd, 0), gapIn(0, hd)]);
  } else if (layout === 'aisles') {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const x = Math.round(-hw * 0.35 + (i * hw * 1.2) / n);
      // Open at alternate ends, so the aisles wind.
      if (i % 2 === 0) line(true, x, -hd, hd - 8, []);
      else line(true, x, -hd + 8, hd, []);
    }
  } else if (layout === 'pens') {
    for (let i = 0; i < 4; i++) {
      const at = spot(0.3, 0.9, 9);
      if (!at) continue;
      const side = pick(['n', 's', 'e', 'w'] as const);
      const [x0, z0, x1, z1] = [at.x - 7, at.z - 6, at.x + 7, at.z + 6];
      line(false, z0, x0, x1, side === 'n' ? [at.x - 3] : []);
      line(false, z1, x0, x1, side === 's' ? [at.x - 3] : []);
      line(true, x0, z0 + 1, z1 - 1, side === 'w' ? [at.z - 3] : []);
      line(true, x1, z0 + 1, z1 - 1, side === 'e' ? [at.z - 3] : []);
      // The pen's inside is left free for what goes in it.
      taken.pop();
    }
  } else if (layout === 'ring') {
    const [x0, z0, x1, z1] = [-hw * 0.2, -hd * 0.55, hw * 0.65, hd * 0.55].map(Math.round);
    line(false, z0, x0, x1, [gapIn(x0, x1)]);
    line(false, z1, x0, x1, [gapIn(x0, x1)]);
    line(true, x0, z0 + 1, z1 - 1, [gapIn(z0, z1)]);
    line(true, x1, z0 + 1, z1 - 1, [gapIn(z0, z1)]);
  } else if (layout === 'channel') {
    const x = Math.round(between(-hw * 0.1, hw * 0.3));
    const fords = [gapIn(-hd, 0), gapIn(0, hd)];
    let start = -hd;
    for (const ford of fords) {
      water.push({ x, z: (start + ford) / 2, w: 4, d: ford - start });
      start = ford + 6;
    }
    water.push({ x, z: (start + hd) / 2, w: 4, d: hd - start });
  }
  const pieces = layout === 'rocks' ? (escort ? 5 : Math.round(between(3, 6))) : 0;
  for (let i = 0; i < pieces; i++) {
    const across = random() < 0.5;
    const long = Math.round(between(6, 12));
    const at = spot(0.22 + (i / pieces) * 0.66, 0.3 + (i / pieces) * 0.66, long / 2 + 2);
    if (!at) continue;
    obstacles.push(
      across ? { x: at.x, z: at.z, w: 2, d: long } : { x: at.x, z: at.z, w: long, d: 2 },
    );
  }
  for (let i = 0; i < 3; i++) {
    const at = spot(0.2, 0.95, 3);
    if (at) obstacles.push({ x: at.x, z: at.z, w: 3, d: 3 });
  }
  // A pond, now and then, off to one side.
  if (layout !== 'channel' && random() < 0.4) {
    const at = spot(0.35, 0.8, 6);
    if (at)
      water.push({ x: at.x, z: at.z, w: Math.round(between(8, 12)), d: Math.round(between(6, 9)) });
  }

  const treasures: TreasureSpawn[] = [];
  const enemies: EnemySpawn[] = [];
  const pods: PodSpawn[] = [];
  const ambushes: { x: number; z: number; kind: EnemyKind; at: number }[] = [];
  if (escort) {
    // The relic, far to the east: the only treasure, so the day ends when it is home.
    const relic = spot(0.86, 0.94, 3);
    if (relic)
      treasures.push({
        id: 'relic',
        ...relic,
        weight: Math.round(between(4, 6)),
        variant: 'lodestone',
      });
    // Beasts waiting along the way, and waves that arrive later, nearer home each time.
    for (let i = 0; i < 2; i++) {
      const at = spot(0.45 + i * 0.2, 0.55 + i * 0.2, 3);
      if (at) enemies.push({ ...at, kind: pick(EASY.filter((k) => k !== 'mound')) });
    }
    for (let wave = 0; wave < 3; wave++) {
      const at = spot(0.7 - wave * 0.15, 0.8 - wave * 0.15, 2);
      if (at) ambushes.push({ ...at, kind: pick(AMBUSH), at: 25 + wave * 25 });
    }
  } else {
    const count = Math.round(between(9, 13));
    for (let i = 0; i < count; i++) {
      const at = spot(0.15, 0.95, 1.5);
      if (at) treasures.push({ id: `shard-${i + 1}`, ...at, weight: 1 + Math.floor(random() * 3) });
    }
    for (let i = 0; i < Math.round(between(1, 3)); i++) {
      const at = spot(0.4, 0.95, 3);
      if (at) enemies.push({ ...at, kind: pick(EASY) });
    }
  }
  for (let i = 0; i < 2; i++) {
    const at = spot(0.1, 0.4, 1.5);
    if (at) pods.push(at);
  }

  return {
    id,
    name: `The ${pick(NAMES.first)} ${pick(NAMES.second)}`,
    brief: escort
      ? 'A Lodestone relic lies at the far end, crawling away from anyone who will not carry it. Bring it home through the beasts waiting on the way, and those that come later.'
      : 'A field laid out fresh by the Academy’s groundskeepers this morning. Bring every Sunshard home.',
    theme: pick(THEMES),
    width,
    depth,
    dayLength: 600,
    seed,
    startingWorkers: escort ? Math.round(between(14, 18)) : Math.round(between(10, 14)),
    captain,
    kiln,
    obstacles,
    ...(water.length > 0 ? { water } : {}),
    treasures,
    pods,
    enemies,
    ...(ambushes.length > 0 ? { ambushes } : {}),
  };
}

/** The challenge a template's fields are played under. */
export const TEMPLATE_RULE: Record<FieldTemplate, ChallengeId> = { hunt: 'hunt', escort: 'escort' };

/** A measured pace's day: half as long again, to the nearest five seconds, at least a minute. */
export function dayFor(pace: number): number {
  return Math.max(60, Math.round((pace * 1.6) / 5) * 5);
}
