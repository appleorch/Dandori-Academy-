import type { SproutKind } from '../workers/sprouts';

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
  | 'dismiss'
  | 'splash'
  | 'slamWindup'
  | 'stomp'
  | 'phase'
  | 'gateBroken'
  | 'shieldDown'
  | 'regrow'
  | 'bloom'
  | 'wilt'
  | 'dug'
  | 'crack'
  | 'sap'
  | 'twin'
  | 'logPlaced'
  | 'bridgeBuilt'
  | 'beaconLit'
  | 'chain'
  | 'rescued'
  | 'burned'
  | 'drowned'
  | 'ignite'
  | 'zap'
  | 'flare'
  | 'select'
  | 'snuff'
  /** Story: a Sproutling drank a Dewdrop (amount: its growth after). */
  | 'nectar'
  /** Story: the Warden plucked a sprout from the ground. */
  | 'pluck';

export interface SimEvent {
  type: SimEventType;
  x: number;
  z: number;
  /** Event-specific number: score for `deliver`, workers for `grow`, otherwise 0. */
  amount: number;
  /** The Sproutling's kind, for events one Sproutling makes: its voice. */
  kind?: SproutKind;
}
