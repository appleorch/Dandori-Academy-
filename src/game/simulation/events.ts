/** Things that happened during a step, for sound, particles and other feedback. */
export type SimEventType =
  | 'throw'
  | 'land'
  | 'latch'
  | 'grab'
  | 'deliver'
  | 'grow'
  | 'spawn'
  | 'workerLost'
  | 'bite'
  | 'shake'
  | 'enemyDefeated'
  | 'captainHurt'
  | 'chargeWindup'
  | 'slam'
  | 'spit'
  | 'splat'
  | 'rush'
  | 'dismiss';

export interface SimEvent {
  type: SimEventType;
  x: number;
  z: number;
  /** Event-specific number: score for `deliver`, workers for `grow`, otherwise 0. */
  amount: number;
}
