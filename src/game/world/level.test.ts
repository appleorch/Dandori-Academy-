import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../simulation/physics';
import { Simulation, startingKinds } from '../simulation/Simulation';
import { HAZARDS } from '../enemies/enemyKinds';
import type { Point } from '../navigation/NavGrid';
import type { SproutKind } from '../workers/sprouts';
import { CHALLENGE_LEVELS, LEVELS } from './level';

/** Most of a kind's starting number that a shard only that kind can lift may need. */
const KIND_SHARE = 0.6;

/** How far from a haul's centre its carriers stand. */
const CARRIER_REACH = 1.2;

function segmentDistance(x: number, z: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = dx * dx + dz * dz;
  const t = length > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}

beforeAll(async () => {
  await initPhysics();
});

// Every field, lessons and challenge fields alike, is checked for a sound layout.
describe.each([...LEVELS, ...CHALLENGE_LEVELS])('$id', (level) => {
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
      ...(level.descent ? [level.descent] : []),
    ];
    for (const spot of spots) {
      // A spot in the water is for Dewlings: reachable by wading, and from there home.
      const nav = sim.inWater(spot.x, spot.z) ? sim.wadeNav : sim.nav;
      const field = sim.inWater(spot.x, spot.z) ? sim.wadeKilnField : sim.kilnField;
      expect(nav.isWalkable(spot.x, spot.z), `${spot.x},${spot.z}`).toBe(true);
      expect(
        Number.isFinite(field.dist[nav.cellIndexAt(spot.x, spot.z)]),
        `${spot.x},${spot.z}`,
      ).toBe(true);
    }
    // Vents and coil pylons stand on open ground, clear of the Warden's start and the Kiln.
    const fixtures = [
      ...(level.vents ?? []),
      ...(level.coils ?? []).flatMap((coil) => [coil.a, coil.b]),
    ];
    for (const spot of fixtures) {
      expect(sim.nav.isWalkable(spot.x, spot.z), `${spot.x},${spot.z}`).toBe(true);
      for (const home of [level.captain, level.kiln]) {
        expect(Math.hypot(spot.x - home.x, spot.z - home.z)).toBeGreaterThan(6);
      }
    }
    sim.dispose();
  });

  it('keeps vents and coils off every other haul’s way home', () => {
    const sim = new Simulation(level);
    for (const gate of level.gates ?? []) sim.removeWall(gate);
    for (const bridge of level.bridges ?? []) sim.removeWall(bridge);
    // A haul's carriers stand round it, so the path is checked a carrier's reach either side.
    const zones = [
      ...(level.vents ?? []).map((vent) => ({
        name: `vent ${vent.x},${vent.z}`,
        dist: (x: number, z: number) => Math.hypot(x - vent.x, z - vent.z),
        reach: HAZARDS.flame.radius + CARRIER_REACH,
      })),
      ...(level.coils ?? []).map((coil) => ({
        name: `coil ${coil.a.x},${coil.a.z}`,
        dist: (x: number, z: number) => segmentDistance(x, z, coil.a, coil.b),
        reach: HAZARDS.arc.radius + CARRIER_REACH,
      })),
    ];
    // Everything that is ever carried home: shards, pods, Glowcaps, and what beasts and mounds leave.
    const starts = [
      ...level.treasures,
      ...level.pods,
      ...(level.blooms ?? []),
      ...level.enemies,
      ...(level.roots ?? []),
    ];
    const kiln = sim.level.kiln;
    for (const start of starts) {
      if (sim.inWater(start.x, start.z)) continue;
      const own = zones.filter((zone) => zone.dist(start.x, start.z) < zone.reach);
      let x = start.x;
      let z = start.z;
      for (let i = 0; i < 4000 && Math.hypot(x - kiln.x, z - kiln.z) > 2; i++) {
        const cell = sim.nav.cellIndexAt(x, z);
        if (!Number.isFinite(sim.kilnField.dist[cell])) break;
        x += sim.kilnField.dirX[cell] * 0.4;
        z += sim.kilnField.dirZ[cell] * 0.4;
        for (const zone of zones) {
          if (own.includes(zone)) continue;
          expect(
            zone.dist(x, z) >= zone.reach,
            `the way home from ${start.x},${start.z} crosses the ${zone.name}`,
          ).toBe(true);
        }
      }
    }
    sim.dispose();
  });

  it('gives the squad every kind its special jobs need', () => {
    const sim = new Simulation(level);
    const kinds = new Set([
      ...startingKinds(level),
      ...level.pods.flatMap((pod) => (pod.kind ? [pod.kind] : [])),
    ]);
    for (const shard of level.treasures) {
      if (sim.inWater(shard.x, shard.z)) expect(kinds.has('dew'), shard.id).toBe(true);
    }
    // A shard only one kind can lift needs at most 60% of the squad's starting number of that
    // kind, so losses on the way never leave it stranded.
    const most = (kind: SproutKind) => Math.ceil(only(kind) * KIND_SHARE);
    const start = startingKinds(level);
    const only = (kind: SproutKind) => start.filter((candidate) => candidate === kind).length;
    for (const shard of level.treasures) {
      const near = (x: number, z: number, reach: number) =>
        Math.hypot(shard.x - x, shard.z - z) < reach;
      if (sim.inWater(shard.x, shard.z))
        expect(shard.weight, shard.id).toBeLessThanOrEqual(most('dew'));
      for (const vent of level.vents ?? []) {
        if (near(vent.x, vent.z, HAZARDS.flame.radius + CARRIER_REACH)) {
          expect(shard.weight, shard.id).toBeLessThanOrEqual(most('ember'));
        }
      }
      for (const coil of level.coils ?? []) {
        if (
          segmentDistance(shard.x, shard.z, coil.a, coil.b) <
          HAZARDS.arc.radius + CARRIER_REACH
        ) {
          expect(shard.weight, shard.id).toBeLessThanOrEqual(most('spark'));
        }
      }
    }
    if ((level.vents ?? []).length > 0) expect(kinds.has('ember')).toBe(true);
    if ((level.coils ?? []).length > 0) expect(kinds.has('spark')).toBe(true);
    if ((level.gates ?? []).some((gate) => gate.style === 'crystal')) {
      expect(kinds.has('stone')).toBe(true);
    }
    sim.dispose();
  });
});
