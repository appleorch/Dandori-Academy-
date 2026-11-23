import type { Simulation } from '../simulation/Simulation';
import type { Rank } from '../dandori/scoring';
import {
  medalTargets,
  scoreChallenge,
  type ChallengeFacts,
  type ChallengeId,
  type MedalTarget,
} from './modes';

/** What a challenge's rule needs to know about a day, read from its simulation. */
export function challengeFacts(sim: Simulation): ChallengeFacts {
  const carcassWeight = sim.stats.deliveries
    .filter((delivery) => delivery.kind === 'carcass')
    .reduce((sum, delivery) => sum + delivery.weight, 0);
  return {
    treasureValue: sim.stats.treasureValue,
    glowcapValue: sim.stats.bonus.glowcapPoints,
    weight: sim.stats.weightDelivered,
    glowcapWeight: sim.stats.deliveries
      .filter((delivery) => delivery.kind === 'bloom')
      .reduce((sum, delivery) => sum + delivery.weight, 0),
    carcassWeight,
    shardsHome: sim.stats.treasuresCollected.length,
    shardsTotal: sim.stats.treasuresTotal,
    beastsLeft: sim.beastsLeft(),
    everything: sim.everythingCollected(),
    alive: sim.workers.size,
    lost: sim.stats.workersLost,
    timeLeft: sim.timeLeft,
    survived: sim.ended !== 'captainDown' && sim.ended !== 'wipedOut',
  };
}

/** A challenge's score so far, as the HUD shows it during the day. */
export interface LiveChallenge {
  /** Points banked so far: the time bonus is added at the end, if the rule pays one. */
  total: number;
  /** The medal the banked points (Glowcaps aside) already reach, and the next one up. */
  rank: Rank;
  next: MedalTarget | null;
}

export function liveChallenge(mode: ChallengeId, sim: Simulation): LiveChallenge {
  const facts = { ...challengeFacts(sim), timeLeft: 0 };
  const score = scoreChallenge(mode, sim.level, facts);
  const targets = medalTargets(mode, sim.level);
  const reached = [...targets].reverse().find((target) => score.ranked >= target.score);
  return {
    total: score.total,
    rank: reached?.rank ?? 'Copper',
    next: targets.find((target) => target.score > score.ranked) ?? null,
  };
}
