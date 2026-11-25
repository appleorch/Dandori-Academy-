import type { LevelSpec } from '../../levelTypes';
import { DANDORI_FIELDS } from './dandori';
import { GROWING_FIELDS } from './growing';
import { HUNT_FIELDS } from './hunt';
import { MISSION_FIELDS } from './mission';
import { TRIAL_FIELDS } from './trial';
import { ESCORT_FIELDS } from './escort';

/** Every challenge field, challenge by challenge, each in its own order. */
export const CHALLENGE_SPECS: readonly LevelSpec[] = [
  ...GROWING_FIELDS,
  ...HUNT_FIELDS,
  ...MISSION_FIELDS,
  ...DANDORI_FIELDS,
  ...TRIAL_FIELDS,
  ...ESCORT_FIELDS,
];
