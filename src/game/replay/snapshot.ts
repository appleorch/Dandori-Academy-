import { SIM_DT } from '../core/config';
import type { Expedition } from '../simulation/expedition';
import { PhysicsWorld } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';

/**
 * Snapshots of a day in play, for the replay viewer's seeking: a copy of the whole expedition
 * (every simulation in it) that can be played on from exactly where it was taken.
 *
 * The copy is deep and keeps each object's class, so the copied simulation works as the
 * original did; shared references stay shared within the copy. Two things are not copied: the
 * level (never changed in play, so it is shared) and the physics world, which lives in WASM and
 * holds only the Warden's body among the walls: it is built afresh from the copy's walls with
 * the Warden where they stand.
 */

type Memo = Map<object, unknown>;

/** Keys never copied: shared as they are (the level) or rebuilt (the physics). */
const SHARED = new Set(['level']);
const REBUILT = new Set(['physics']);

function copy(value: unknown, memo: Memo): unknown {
  if (value === null || typeof value !== 'object') return value;
  const known = memo.get(value);
  if (known !== undefined) return known;
  if (ArrayBuffer.isView(value)) {
    const view = value as unknown as { slice(): unknown };
    const out = view.slice();
    memo.set(value, out);
    return out;
  }
  if (value instanceof Map) {
    const out = new Map();
    memo.set(value, out);
    for (const [k, v] of value) out.set(copy(k, memo), copy(v, memo));
    return out;
  }
  if (value instanceof Set) {
    const out = new Set();
    memo.set(value, out);
    for (const v of value) out.add(copy(v, memo));
    return out;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    memo.set(value, out);
    for (const v of value) out.push(copy(v, memo));
    return out;
  }
  const out = Object.create(Object.getPrototypeOf(value) as object | null) as Record<
    string,
    unknown
  >;
  memo.set(value, out);
  for (const key of Object.getOwnPropertyNames(value)) {
    const v = (value as Record<string, unknown>)[key];
    out[key] = SHARED.has(key) || REBUILT.has(key) || typeof v === 'function' ? v : copy(v, memo);
  }
  return out;
}

/** Builds a fresh physics world for a copied simulation: its walls, the Warden where they are. */
function rebuildPhysics(sim: Simulation): void {
  const walls = (sim as unknown as { walls: { x: number; z: number; w: number; d: number }[] })
    .walls;
  const physics = new PhysicsWorld(
    sim.level.width,
    sim.level.depth,
    walls,
    sim.captainTransform,
    SIM_DT,
  );
  (sim as unknown as { physics: PhysicsWorld }).physics = physics;
}

/** A copy of an expedition (and every simulation in it), ready to be played on. */
export function snapshotExpedition(expedition: Expedition): Expedition {
  const memo: Memo = new Map();
  const out = copy(expedition, memo) as Expedition;
  for (const made of memo.values()) if (made instanceof Simulation) rebuildPhysics(made);
  return out;
}
