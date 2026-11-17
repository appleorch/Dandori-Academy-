import { beforeAll, describe, expect, it } from 'vitest';
import { evaluateDay } from '../dandori/scoring';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { penaltyPerLoss } from '../core/difficulty';
import { forDifficulty, LEVELS } from './level';
import { playGreedy } from './testBot';

beforeAll(async () => {
  await initPhysics();
});

describe.each(LEVELS)('$name on Hard', (base) => {
  // Hard is not tuned to the bot: it only has to bring home at least 80% of the shards.
  it('stays winnable for a simple greedy player', () => {
    const level = forDifficulty(base, 'hard');
    const sim = new Simulation(level);
    playGreedy(sim);
    const score = evaluateDay(
      {
        treasureValue: sim.stats.treasureValue,
        treasuresCollected: sim.stats.treasuresCollected.length,
        treasuresTotal: sim.stats.treasuresTotal,
        timeLeft: sim.timeLeft,
        workersAlive: sim.workers.size,
        workersLost: sim.stats.workersLost,
      },
      level.parScore,
      penaltyPerLoss('hard'),
    );
    expect(sim.stats.treasuresCollected.length).toBeGreaterThanOrEqual(
      Math.ceil(sim.stats.treasuresTotal * 0.8),
    );
    expect(score.total).toBeGreaterThan(0);
    sim.dispose();
  });
});

describe.each(LEVELS)('$name', (level) => {
  it('has every spawn on walkable ground', () => {
    const sim = new Simulation(level);
    // Every spot must be reachable once the gates are broken and bridges built.
    for (const gate of level.gates ?? []) sim.removeWall(gate);
    for (const bridge of level.bridges ?? []) sim.removeWall(bridge);
    const spots = [
      level.captain,
      level.kiln,
      ...level.treasures,
      ...level.pods,
      ...level.enemies,
      ...(level.blooms ?? []),
      ...(level.roots ?? []).flatMap((root) => root.knots),
      ...(level.logs ?? []),
      ...(level.saps ?? []),
      ...(level.bridges ?? []).map((bridge) => bridge.bank),
      ...(level.beacons ?? []),
      ...(level.secret ? [level.secret] : []),
    ];
    for (const spot of spots) {
      expect(sim.nav.isWalkable(spot.x, spot.z)).toBe(true);
      expect(Number.isFinite(sim.kilnField.dist[sim.nav.cellIndexAt(spot.x, spot.z)])).toBe(true);
    }
    sim.dispose();
  });

  it('can be cleared at Platinum pace by a simple greedy player', () => {
    const sim = new Simulation(level);
    playGreedy(sim);
    const score = evaluateDay(
      {
        treasureValue: sim.stats.treasureValue,
        treasuresCollected: sim.stats.treasuresCollected.length,
        treasuresTotal: sim.stats.treasuresTotal,
        timeLeft: sim.timeLeft,
        workersAlive: sim.workers.size,
        workersLost: sim.stats.workersLost,
      },
      level.parScore,
    );
    expect(sim.ended).toBe('allCollected');
    // Platinum times are measured from this bot, so it must keep reaching them.
    expect(score.rank).toBe('Platinum');
    sim.dispose();
  });
});
