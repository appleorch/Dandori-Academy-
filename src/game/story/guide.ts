import type { SproutKind } from '../workers/sprouts';
import type { Simulation } from '../simulation/Simulation';
import type { CoachControls } from './coach';

/**
 * The guided morning: the story's first day, on a fenced lawn round the Kiln, taught one step
 * at a time. Each step's prompt stays up until the player has done it, read from the
 * simulation (which it never changes); the fence opens by itself once the first Clock part is
 * home (Simulation.openFence). Also here: the line for each kind met for the first time, and
 * the first day's sunset warning. Pure, so it is tested without a browser.
 */
export type GuideStep = 'move' | 'pluck' | 'throw' | 'carry' | 'whistle' | 'pod' | 'part' | 'open';

export const GUIDE_STEPS: readonly GuideStep[] = [
  'move',
  'pluck',
  'throw',
  'carry',
  'whistle',
  'pod',
  'part',
  'open',
];

export interface GuideProgress {
  step: number;
  /** Where the Warden started, for the first step. */
  startX: number;
  startZ: number;
  /** Seconds the last step's line has been up: it leaves after a while. */
  shownFor: number;
  /** Whether anyone has been thrown, or the whistle blown, today. */
  thrown: boolean;
  whistled: boolean;
}

/** How long the gate-open line stays before the guide bows out. */
const OPEN_SECONDS = 8;
/** How far the Warden walks to finish the first step. */
const WALK = 6;

export function newGuide(sim: Simulation): GuideProgress {
  return {
    step: 0,
    startX: sim.captainTransform.x,
    startZ: sim.captainTransform.z,
    shownFor: 0,
    thrown: false,
    whistled: false,
  };
}

/** Whether a step is done, by what the day shows. */
function done(step: GuideStep, sim: Simulation, guide: GuideProgress): boolean {
  switch (step) {
    case 'move':
      return (
        Math.hypot(sim.captainTransform.x - guide.startX, sim.captainTransform.z - guide.startZ) >
        WALK
      );
    case 'pluck':
      return sim.countWorkers().squad >= 3;
    case 'throw':
      return guide.thrown;
    case 'carry':
      return sim.stats.treasuresCollected.length > 0;
    case 'whistle':
      return guide.whistled;
    case 'pod':
      return sim.stats.grown > 0;
    case 'part':
      return sim.fenceOpened || sim.stats.treasuresCollected.some((id) => id.startsWith('part-'));
    case 'open':
      return guide.shownFor > OPEN_SECONDS;
  }
}

/**
 * Moves the guide on by `dt` seconds of play. Steps done out of order are skipped past, so a
 * player who carries something home before whistling is never asked to carry again. Returns
 * null once the guide is over.
 */
export function advanceGuide(
  guide: GuideProgress,
  sim: Simulation,
  dt: number,
): GuideProgress | null {
  let next = { ...guide, shownFor: guide.shownFor + dt };
  for (const [, worker] of sim.workers.entries()) {
    if (worker.state === 'thrown') next.thrown = true;
  }
  if (sim.captainState.whistleRadius > 0) next.whistled = true;
  while (next.step < GUIDE_STEPS.length && done(GUIDE_STEPS[next.step], sim, next)) {
    next = { ...next, step: next.step + 1, shownFor: 0 };
  }
  return next.step >= GUIDE_STEPS.length ? null : next;
}

/** The prompt for a step, naming the player's own controls. */
export function guideText(step: GuideStep, controls: CoachControls, touch: boolean): string {
  const name = controls.name;
  const move = controls.pad()
    ? 'the left stick'
    : (['moveUp', 'moveLeft', 'moveDown', 'moveRight'] as const).map(name).join('');
  switch (step) {
    case 'move':
      return touch
        ? 'Drag the stick at the bottom left to walk.'
        : `Walk about with ${move}. This lawn is yours to practise on.`;
    case 'pluck':
      return touch
        ? 'Your sprouts are in the ground by the Kiln. Walk up and tap Pluck.'
        : `Your sprouts are in the ground by the Kiln. Walk up to them and press ${name('interact')} to pluck them.`;
    case 'throw':
      return touch
        ? 'Touch the shining relic and hold: your Sproutlings are thrown at it.'
        : `Point at the shining relic and press ${name('throw')} to throw a Sproutling at it.`;
    case 'carry':
      return 'The number on a relic is how many it needs to lift. Throw enough, and they carry it home to the Kiln.';
    case 'whistle':
      return touch
        ? 'Hold Whistle and drag it over anyone standing about, to call them back.'
        : `Anyone left standing about? Hold ${name('whistle')} to whistle them back into your squad.`;
    case 'pod':
      return 'Carry a seed pod to the Kiln: it grows new sprouts by it, ready to pluck.';
    case 'part':
      return 'A part of the Great Clock lies on this lawn, behind the old stone. Bring it home and the gate will open.';
    case 'open':
      return 'The lawn gate is open. The whole Quad is yours to explore, as far as daylight allows.';
  }
}

/** The line for a kind met for the first time in the story, and what to try with it. */
export const KIND_TRIES: Record<Exclude<SproutKind, 'ember'>, string> = {
  dew: 'Dewlings wade where others drown. I have dropped a shard in the water nearby: send a Dewling for it.',
  stone:
    'Stonelings lift like two. There is a heavy shard by the Kiln that wants four hands: try two Stonelings.',
  spark:
    'Sparklings fly farthest. The ledge in this ground\u2019s corner is out of every other kind\u2019s reach: try a Sparkling.',
};

/** The first day's gentle warning, three minutes before sunset. */
export const SUNSET_WARNING =
  'Three minutes of daylight left. At sunset, anyone outside the rings round the Kiln and the lit beacons is lost. Tonight I will fetch any stragglers myself, just this once.';

/** Seconds before sunset the first day's warning comes, and the safe rings appear. */
export const FIRST_DAY_WARNING = 180;
