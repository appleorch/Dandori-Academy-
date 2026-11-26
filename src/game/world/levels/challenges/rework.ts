import type { ChallengeId } from '../../../modes/modes';
import type { Box, Point } from '../../../navigation/NavGrid';
import type { BloomSpawn } from '../../levelTypes';
import { challengeFields, type FieldSpec } from './field';

/**
 * The design pass over the hand-built challenge fields (roadmap chunk 14), applied the same way
 * to every one of them, so each field keeps its own idea:
 *
 * Fields with vents or coils are left as laid out: those hazards keep their size, and the ways
 * round them are measured by hand.
 *
 * - Small fields grow: one written smaller than `ROOMY` square units is scaled up evenly (every
 *   place and every wall's size, up to `MOST_GROWTH` each way). Each field's day is written in
 *   its file, long enough for the bigger field: at least half as long again as its pace.
 * - Risk and reward: a field that scores treasure gets a Glowcap on the farthest open ground
 *   from the Kiln, sprouting partway through the day. It is worth points of its own but never
 *   counts for a medal, so going for it is a detour that costs pace.
 * - A ramp: each challenge's fields are put in order of how hard the test player found them
 *   (`difficulty`), so the first ones teach and the last ones test.
 */

/** Fields smaller than this (in square units) are grown. */
export const ROOMY = 3600;
/** The most a field grows, each way. */
export const MOST_GROWTH = 1.3;

/** Properties that are places or sizes on the ground, wherever they appear in a field. */
const SPATIAL = new Set(['x', 'z', 'w', 'd']);
/** Properties that hold directions, heights or anything else not to be scaled. */
const NOT_SPATIAL = new Set(['dx', 'dz', 'props', 'challenge']);

function scaled<T>(value: T, by: number): T {
  if (Array.isArray(value)) return value.map((item) => scaled(item, by)) as T;
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (NOT_SPATIAL.has(key)) out[key] = item;
    else if (SPATIAL.has(key) && typeof item === 'number')
      out[key] = Math.round(item * by * 1000) / 1000;
    else out[key] = scaled(item, by);
  }
  return out as T;
}

/** Whether a field has vents or coils, whose ways round are laid out by hand. */
const hazardous = (spec: Pick<FieldSpec, 'vents' | 'coils'>) =>
  (spec.vents ?? []).length > 0 || (spec.coils ?? []).length > 0;

/** How much a field grows each way: enough to be roomy, never more than `MOST_GROWTH`. */
export function growthOf(spec: Pick<FieldSpec, 'width' | 'depth' | 'vents' | 'coils'>): number {
  const area = spec.width * spec.depth;
  // Vents and coils keep their size, so a field laid out round them keeps its own.
  if (area >= ROOMY || hazardous(spec)) return 1;
  return Math.min(MOST_GROWTH, Math.round(Math.sqrt(ROOMY / area) * 100) / 100);
}

/** A field grown evenly by `by`: its size, every place on it and every wall's size. */
export function grow(spec: FieldSpec, by: number): FieldSpec {
  if (by === 1) return spec;
  const grown = scaled(spec, by);
  return {
    ...grown,
    width: Math.round(spec.width * by),
    depth: Math.round(spec.depth * by),
  };
}

const inside = (box: Box, x: number, z: number, margin: number) =>
  Math.abs(x - box.x) < box.w / 2 + margin && Math.abs(z - box.z) < box.d / 2 + margin;

/** The farthest open spot from the Kiln: off every wall, pond, ledge and other thing placed. */
export function farthestOpen(spec: FieldSpec): Point | null {
  const boxes: Box[] = [
    ...spec.obstacles,
    ...(spec.water ?? []),
    ...(spec.plateaus ?? []),
    ...(spec.ramps ?? []),
    ...(spec.gates ?? []),
    ...(spec.bridges ?? []),
    ...(spec.conveyors ?? []),
  ];
  const points: Point[] = [
    spec.captain,
    ...spec.treasures,
    ...spec.enemies,
    ...spec.pods,
    ...(spec.vents ?? []),
    ...(spec.drips ?? []),
    ...(spec.beacons ?? []),
    ...(spec.logs ?? []),
    ...(spec.saps ?? []),
    ...(spec.roots ?? []),
    ...(spec.coils ?? []).flatMap((coil) => [coil.a, coil.b]),
  ];
  const hw = spec.width / 2 - 4;
  const hd = spec.depth / 2 - 4;
  let best: Point | null = null;
  let bestDist = -1;
  for (let x = -hw; x <= hw; x += 2) {
    for (let z = -hd; z <= hd; z += 2) {
      if (boxes.some((box) => inside(box, x, z, 2.5))) continue;
      if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 4)) continue;
      const dist = Math.hypot(x - spec.kiln.x, z - spec.kiln.z);
      if (dist > bestDist) {
        best = { x, z };
        bestDist = dist;
      }
    }
  }
  return best;
}

/** The rules that score treasure, where a Glowcap tempts. */
const TEMPTED: ReadonlySet<ChallengeId> = new Set(['hunt', 'mission', 'dandori', 'trial']);

/** A Glowcap for a field, sprouting a quarter of the way into its day, or none. */
export function glowcapFor(spec: FieldSpec, mode: ChallengeId): BloomSpawn | null {
  if (!TEMPTED.has(mode) || (spec.blooms ?? []).length > 0 || hazardous(spec)) return null;
  const spot = farthestOpen(spec);
  if (!spot) return null;
  // By the day, never by the pace, so measuring a field again never moves its Glowcap.
  const at = mode === 'trial' ? 60 : Math.max(20, Math.round(spec.dayLength * 0.25));
  return { ...spot, weight: 3, at, lifetime: 70 };
}

/**
 * How hard the test player found a field, for its place in the ramp: its time for the timed
 * challenges, its losses (then the weight to carry) for a Trial, and for a Growing Season how
 * far its headcount fell short of the most the field can grow, then its size.
 */
export function difficulty(mode: ChallengeId, spec: FieldSpec): number {
  if (mode === 'trial') {
    const weight = spec.treasures.reduce((sum, shard) => sum + shard.weight, 0);
    return spec.pace * 100 + weight;
  }
  if (mode === 'growing') return spec.width * spec.depth;
  return spec.pace;
}

/**
 * Fields kept exactly as laid out: their trick depends on distances the pass would change (a
 * bramble wall's reach, a pond's banks, a drip's timing), and the test player cannot finish
 * them grown.
 */
const AS_LAID_OUT: ReadonlySet<string> = new Set([
  'behind-brambles',
  'sunken-hoard',
  'the-mire',
  'drip-corridor',
]);

/** A challenge's hand-built fields with the design pass applied, easiest first. */
export function handmadeFields(mode: ChallengeId, specs: readonly FieldSpec[]) {
  const reworked = specs.map((spec) => {
    if (AS_LAID_OUT.has(spec.id)) return spec;
    const grown = grow(spec, growthOf(spec));
    const glowcap = glowcapFor(grown, mode);
    return glowcap ? { ...grown, blooms: [glowcap] } : grown;
  });
  const ranked = reworked
    .map((spec, index) => ({ spec, index }))
    .sort((a, b) => difficulty(mode, a.spec) - difficulty(mode, b.spec) || a.index - b.index)
    .map(({ spec }) => spec);
  return challengeFields(mode, ranked);
}
