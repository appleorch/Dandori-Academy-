import type { ChallengeId } from '../../../modes/modes';
import type { LevelSpec } from '../../levelTypes';

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
  const timed = mode !== 'growing' && mode !== 'trial';
  return specs.map(({ pace, ...spec }, index) => ({
    ...spec,
    id: `${mode}-${spec.id}`,
    stage: 0,
    // Only the timed challenges have a finishing pace; the rest keep the plain day.
    platinumTime: timed ? pace : spec.dayLength,
    seed: spec.seed,
    challenge: { mode, order: index + 1, pace },
    ...(mode === 'trial' ? { untimed: true, dayLength: 0, platinumTime: 0 } : {}),
  }));
}
