import type { ChallengeId } from '../../../modes/modes';
import type { LevelSpec, PropKind, PropSpawn, WallLook } from '../../levelTypes';

/** Each setting's walls and its family of giant objects (docs-design/ART_DIRECTION.md). */
const DRESSING: Record<string, { look: WallLook; props: readonly PropKind[] }> = {
  meadow: {
    look: 'hedge',
    props: ['flowerpot', 'watering-can', 'trowel', 'glove', 'croquet-hoop'],
  },
  autumn: { look: 'fence', props: ['acorn-cap', 'conker', 'spool', 'teacup', 'button'] },
  marsh: { look: 'root', props: ['lily-pad', 'watering-can', 'coin', 'teacup', 'button'] },
  dusk: { look: 'book', props: ['candle', 'pocket-watch', 'thimble', 'spool', 'coin'] },
  terrarium: { look: 'glass', props: ['plant-label', 'gear', 'pocket-watch', 'thimble', 'coin'] },
  cave: { look: 'rock', props: ['coin', 'button', 'candle', 'thimble', 'spool'] },
};

/**
 * Dressing for a field written without its own: its setting's walls, and a giant object just
 * outside each corner and the middle of each long side, so the field reads as a small patch of
 * a much bigger garden. Art only: never in the field, never in the fingerprint.
 */
export function dressField(spec: Pick<LevelSpec, 'theme' | 'width' | 'depth' | 'seed'>): {
  wallLook: WallLook;
  props: PropSpawn[];
} {
  const family = DRESSING[spec.theme ?? 'meadow'] ?? DRESSING.meadow;
  const hw = spec.width / 2 + 3;
  const hd = spec.depth / 2 + 3;
  const spots: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
    [0, -hd - 1],
    [0, hd + 1],
  ];
  return {
    wallLook: family.look,
    props: spots.map(([x, z], i) => ({
      kind: family.props[(i + spec.seed) % family.props.length],
      x,
      z,
      scale: 1.2 + ((spec.seed * 7 + i * 13) % 6) / 10,
      turn: ((spec.seed + i * 37) % 63) / 10,
    })),
  };
}

/**
 * A challenge field as written: a lesson's layout without a stage or a Platinum time, and with
 * `pace`, the test player's measured result there (see `ChallengeField`). Its id is short; the
 * challenge's own id is put in front of it.
 */
export type FieldSpec = Omit<LevelSpec, 'stage' | 'platinumTime' | 'challenge' | 'untimed'> & {
  pace: number;
};

/**
 * Turns a challenge's fields into lesson specs. Their place in the list is their order. A Lean
 * Squad Trial has no clock. Fields have no stage: they are not part of the numbered run.
 */
export function challengeFields(mode: ChallengeId, specs: readonly FieldSpec[]): LevelSpec[] {
  const timed = mode !== 'growing' && mode !== 'trial' && mode !== 'expedition';
  return specs.map(({ pace, ...spec }, index) => ({
    // Fields written without dressing of their own are dressed for their setting.
    ...(spec.props ? {} : dressField(spec)),
    ...spec,
    id: `${mode}-${spec.id}`,
    stage: 0,
    // Only the timed challenges have a finishing pace; the rest keep the plain day.
    platinumTime: timed ? pace : spec.dayLength,
    seed: spec.seed,
    challenge: { mode, order: index + 1, pace },
    ...(mode === 'trial' || mode === 'expedition'
      ? { untimed: true, dayLength: 0, platinumTime: 0 }
      : {}),
  }));
}
