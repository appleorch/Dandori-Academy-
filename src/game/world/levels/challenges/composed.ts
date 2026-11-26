import type { ChallengeId } from '../../../modes/modes';
import { briefFor, composeField } from '../../fieldKit';
import { challengeFields, type FieldSpec } from './field';

/**
 * A challenge's fields as the field composer makes them (`world/fieldKit.ts`): each from its
 * seed and tier, named, with a brief written from what is in it, and the test player's measured
 * result as its pace (found by `fieldKit.report.test.ts`; re-measure with `npm run paces`).
 * They are put in order of pace, so the challenge ramps from its easiest field to its hardest.
 */
export interface ComposedEntry {
  seed: number;
  tier: number;
  name: string;
  pace: number;
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function composedFields(mode: ChallengeId, entries: readonly ComposedEntry[]) {
  const specs: FieldSpec[] = entries.map(({ seed, tier, name, pace }) => {
    const composed = composeField(seed, mode, tier, slug(name));
    return { ...composed.spec, name, brief: briefFor(composed, mode), pace };
  });
  // Easiest first. A Growing Season's pace is a headcount, so its fields go by tier instead.
  const order = (spec: FieldSpec, i: number) =>
    mode === 'growing' ? entries[i].tier : mode === 'trial' ? entries[i].tier : spec.pace;
  const ranked = specs
    .map((spec, i) => ({ spec, key: order(spec, i), i }))
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map(({ spec }) => spec);
  return challengeFields(mode, ranked);
}
