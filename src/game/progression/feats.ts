import { HAZARDS } from '../enemies/enemyKinds';
import type { Point } from '../navigation/NavGrid';
import type { DayTally } from '../dandori/tally';
import type { DayFeats } from '../save/saveManager';
import type { Haul } from '../simulation/expedition';
import type { Simulation } from '../simulation/Simulation';
import type { GateSpawn } from '../world/levelTypes';

/** How close to a vent or coil a Sunshard lies for its crew to stand in the hazard. */
const CREW_REACH = 1.2;

function segmentDistance(x: number, z: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = dx * dx + dz * dz;
  const t = length > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}

/** The kind of special job a Sunshard was: sunk in water, by a vent, or under a coil. */
function jobsOf(sim: Simulation, shard: Point): { water: boolean; vent: boolean; coil: boolean } {
  const { level } = sim;
  return {
    water: (level.water ?? []).some(
      (box) => Math.abs(shard.x - box.x) <= box.w / 2 && Math.abs(shard.z - box.z) <= box.d / 2,
    ),
    vent: (level.vents ?? []).some(
      (vent) => Math.hypot(shard.x - vent.x, shard.z - vent.z) < HAZARDS.flame.radius + CREW_REACH,
    ),
    coil: (level.coils ?? []).some(
      (coil) => segmentDistance(shard.x, shard.z, coil.a, coil.b) < HAZARDS.arc.radius + CREW_REACH,
    ),
  };
}

/** What a finished day did beyond its score, for the achievements. */
export function dayFeats(sim: Simulation, tally: DayTally, haul?: Haul): DayFeats {
  const home = new Set(sim.stats.treasuresCollected);
  let sunkHome = 0;
  let ventHome = 0;
  let coilHome = 0;
  for (const shard of sim.level.treasures) {
    if (!home.has(shard.id)) continue;
    const jobs = jobsOf(sim, shard);
    if (jobs.water) sunkHome++;
    if (jobs.vent) ventHome++;
    if (jobs.coil) coilHome++;
  }
  const crystal = (sim.level.gates ?? []).filter((gate) => gate.style === 'crystal').length;
  let crystalStanding = 0;
  for (const [, enemy] of sim.enemies.entries()) {
    if ((enemy.shape as GateSpawn | null)?.style === 'crystal' && enemy.hp > 0) crystalStanding++;
  }
  const kinds = new Set<string>();
  for (const [, worker] of sim.workers.entries()) kinds.add(worker.kind);
  return {
    glowcaps: tally.optional.glowcaps.got,
    glowcapsTotal: tally.optional.glowcaps.of,
    twins: tally.optional.twins.got,
    twinsTotal: tally.optional.twins.of,
    dewglass: tally.optional.dewglass.got,
    dewglassTotal: tally.optional.dewglass.of,
    sunkHome,
    ventHome,
    coilHome,
    crystalBroken: Math.max(0, crystal - crystalStanding),
    rescued: sim.stats.rescued,
    grown: sim.stats.grown,
    kindsAlive: kinds.size,
    caves: haul?.caves.length ?? 0,
    cavesEmptied: haul?.emptied.length ?? 0,
    beasts: sim.level.enemies.filter((enemy) => enemy.kind !== 'mound').length,
    bestChain: sim.stats.bestChain,
  };
}
