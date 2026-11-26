import { beforeAll, describe, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { challengeFacts } from '../modes/facts';
import type { ChallengeId } from '../modes/modes';
import { defineLevel } from './level';
import { challengeFields } from './levels/challenges/field';
import { composeField, leastPace } from './fieldKit';
import { playChallengeDay } from './diveBot';

/**
 * Not a test: the search for composed fields. `VITE_KIT=<mode>[,<mode>]` composes fields tier by
 * tier, seed by seed, and prints the first ones per tier the test player finishes in fair time
 * with every spawn reachable (`KIT_PER_TIER`, default 1). Their seeds go in the challenge files.
 */
const modes = ((import.meta.env.VITE_KIT as string | undefined) ?? '').split(',').filter(Boolean);
const tiers = ((import.meta.env.VITE_KIT_TIERS as string | undefined) ?? '1-12')
  .split('-')
  .map(Number);
const perTier = Number(import.meta.env.VITE_KIT_PER_TIER ?? 1);
const firstSeed = Number(import.meta.env.VITE_KIT_SEED ?? 1);

beforeAll(async () => {
  await initPhysics();
});

/** Every spawn is on open ground the Kiln can be reached from, once gates and bridges are gone. */
function reachable(level: ReturnType<typeof defineLevel>): boolean {
  const sim = new Simulation(level);
  for (const gate of level.gates ?? []) sim.removeWall(gate);
  for (const bridge of level.bridges ?? []) sim.removeWall(bridge);
  const spots = [
    level.captain,
    ...level.treasures,
    ...level.pods,
    ...level.enemies,
    ...(level.blooms ?? []),
    ...(level.logs ?? []),
    ...(level.bridges ?? []).map((b) => b.bank),
    ...(level.beacons ?? []),
  ];
  const bad = spots.find((spot) => {
    const wet = sim.inWater(spot.x, spot.z);
    const nav = wet ? sim.wadeNav : sim.nav;
    const field = wet ? sim.wadeKilnField : sim.kilnField;
    return !(
      nav.isWalkable(spot.x, spot.z) && Number.isFinite(field.dist[nav.cellIndexAt(spot.x, spot.z)])
    );
  });
  if (bad) console.log('KITBAD', JSON.stringify(bad), sim.nav.isWalkable(bad.x, bad.z));
  const ok = !bad;
  sim.dispose();
  return ok;
}

describe.skipIf(modes.length === 0)('field kit search', () => {
  it('finds fields', () => {
    for (const mode of modes as ChallengeId[]) {
      for (let tier = tiers[0]; tier <= (tiers[1] ?? tiers[0]); tier++) {
        let found = 0;
        for (let seed = firstSeed; seed < firstSeed + 40 && found < perTier; seed++) {
          const composed = composeField(seed, mode, tier, `kit-${tier}`);
          const [spec] = challengeFields(mode, [{ ...composed.spec, pace: 1 }]);
          const level = defineLevel(spec);
          if (!reachable(level)) {
            console.log('KITSKIP', mode, tier, seed, 'unreachable');
            continue;
          }
          const day = playChallengeDay(level, mode);
          const sim = day.surface;
          const facts = challengeFacts(sim);
          const timed = mode !== 'growing' && mode !== 'trial';
          const cleared = sim.ended === 'allCollected';
          const pace =
            mode === 'growing'
              ? facts.alive
              : mode === 'trial'
                ? facts.lost
                : Math.ceil(sim.elapsed);
          const fair =
            mode === 'growing'
              ? sim.ended === 'timeUp' && facts.alive >= level.startingWorkers * 2
              : cleared &&
                sim.elapsed >= leastPace(tier) &&
                (!timed || sim.elapsed <= composed.spec.dayLength * 0.75);
          const row = {
            mode,
            tier,
            seed,
            pace,
            ended: sim.ended,
            elapsed: Math.round(sim.elapsed),
            day: composed.spec.dayLength,
            shards: `${facts.shardsHome}/${facts.shardsTotal}`,
            lost: facts.lost,
            alive: facts.alive,
            size: `${composed.spec.width}x${composed.spec.depth}`,
            zones: composed.zones,
            loops: composed.loops,
            kiln: composed.kilnZone,
            connectors: composed.connectors,
            modules: composed.modules,
          };
          console.log(fair ? 'KITOK' : 'KITSKIP', JSON.stringify(row));
          day.dispose();
          if (fair) found++;
        }
      }
    }
  }, 7_200_000);
});
