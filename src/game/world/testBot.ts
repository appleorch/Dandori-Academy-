import { crewStrength, hasRoute } from '../carry/carrySystem';
import { NO_INPUT, type InputState } from '../commands/input';
import { NO_ENTITY, type Entity } from '../core/ecs';
import { approachPoint, damageTaken, isTargetable } from '../enemies/combat';
import { ENEMY, ENEMY_SPECS, HAZARDS } from '../enemies/enemyKinds';
import type { Point } from '../navigation/NavGrid';
import { createMover, steerTo } from '../navigation/steering';
import type { Carryable, Enemy, Transform } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { SPROUT_KINDS, SPROUTS, type SproutKind } from '../workers/sprouts';
import type { GateSpawn } from './levelTypes';
import { heightAt } from './heightMap';

/**
 * The test player used to measure every lesson: see `playGreedy`. It lives outside the
 * test files so the balance report can use it too. It is never shipped in the game.
 */

/**
 * Small differences in how the test player plays: how close it walks before throwing and how
 * near an enemy may come before it turns to fight or back off. The first is the standard
 * player every Platinum time is measured with; the others are a player trying again.
 */
export interface BotStyle {
  throwDistance: number;
  threatDistance: number;
}

export const BOT_STYLES: readonly BotStyle[] = [
  { throwDistance: 6, threatDistance: 6.5 },
  { throwDistance: 5, threatDistance: 8 },
  { throwDistance: 7.5, threatDistance: 5 },
];

const FULL_SQUAD = 6;
const CHARGE_REACH = 19;
const DODGE_WIDTH = 3.5;
/** Width either side of a charger's body inside which a trailing follower counts as in its path. */
const SQUAD_MARGIN = 0.6;
const RESCUE_RANGE = 10;

/** Strength a haul still needs before it moves (a Stoneling lifts like two). */
function shortfall(sim: Simulation, entity: Entity): number {
  const carryable = sim.carryables.require(entity);
  return Math.max(0, carryable.weight - crewStrength(sim, carryable.claimed));
}

/** Margin round a vent or coil inside which a Sproutling sent to a job would be caught. */
const HAZARD_MARGIN = 1.8;

/** Distance from a point to a segment. */
function segmentDistance(x: number, z: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = dx * dx + dz * dz;
  const t = length > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}

/**
 * The one kind of Sproutling a job can be done with, or null if any will do: only Dewlings
 * go into water, only Emberlings work by a flame vent, only Sparklings under a coil's arc.
 */
function requiredKind(sim: Simulation, x: number, z: number): SproutKind | null {
  if (sim.inWater(x, z)) return 'dew';
  for (const vent of sim.level.vents ?? []) {
    if (Math.hypot(vent.x - x, vent.z - z) < HAZARDS.flame.radius + HAZARD_MARGIN) return 'ember';
  }
  for (const coil of sim.level.coils ?? []) {
    if (segmentDistance(x, z, coil.a, coil.b) < HAZARDS.arc.radius + HAZARD_MARGIN) return 'spark';
  }
  return null;
}

/** Strength of the squad, of one kind or of all. */
function squadStrength(sim: Simulation, kind: SproutKind | null): number {
  let strength = 0;
  for (const [, worker] of sim.workers.entries()) {
    if (worker.state !== 'follow' || worker.stun > 0) continue;
    if (kind === null || worker.kind === kind) strength += SPROUTS[worker.kind].strength;
  }
  return strength;
}

/** Squad members of a kind, ready to throw. */
function squadOf(sim: Simulation, kind: SproutKind): number {
  let count = 0;
  for (const [, worker] of sim.workers.entries()) {
    if (worker.state === 'follow' && worker.stun <= 0 && worker.kind === kind) count++;
  }
  return count;
}

/**
 * The kind to throw at a job: the one it needs, if it needs one; Stonelings at a crystal
 * gate; otherwise the kind there are most of, so no single kind runs dry.
 */
function throwKind(sim: Simulation, job: Entity): SproutKind | null {
  const at = sim.transforms.require(job);
  const needed = requiredKind(sim, at.x, at.z);
  if (needed) return needed;
  const foe = sim.enemies.get(job);
  if (
    (foe?.shape as GateSpawn | null | undefined)?.style === 'crystal' &&
    squadOf(sim, 'stone') > 0
  )
    return 'stone';
  let best: SproutKind | null = null;
  let bestCount = 0;
  for (const kind of SPROUT_KINDS) {
    const count = squadOf(sim, kind);
    if (count > bestCount) {
      best = kind;
      bestCount = count;
    }
  }
  return best;
}

/** True while a live enemy's home is close enough that it would hunt workers at this spot. */
function guarded(sim: Simulation, x: number, z: number): boolean {
  for (const [, enemy] of sim.enemies.entries()) {
    const spec = ENEMY_SPECS[enemy.kind];
    if (spec.attack === 'none') continue;
    // A boss hunts across its whole territory, and its hauls' paths cross it too.
    const reach = spec.boss
      ? spec.territory + spec.aggroRange
      : spec.aggroRange + ENEMY.wanderRange;
    if (Math.hypot(enemy.homeX - x, enemy.homeZ - z) < reach) return true;
  }
  return false;
}

function unfinished(sim: Simulation, job: Entity): boolean {
  const enemy = sim.enemies.get(job);
  if (enemy) return enemy.hp > 0 && (isTargetable(sim, job, enemy) || ENEMY_SPECS[enemy.kind].boss);
  if (!sim.carryables.has(job)) return false;
  const needed = shortfall(sim, job);
  if (needed <= 0) return false;
  // A job that needs a kind the squad has run out of is put down until there are enough.
  const at = sim.transforms.require(job);
  const kind = requiredKind(sim, at.x, at.z);
  return kind === null || squadStrength(sim, kind) >= needed;
}

/** Sproutlings of a kind anywhere on the field. */
function fieldOf(sim: Simulation, kind: SproutKind): number {
  let count = 0;
  for (const [, worker] of sim.workers.entries()) if (worker.kind === kind) count++;
  return count;
}

/** True when the haul has a way to where it goes; one shut behind a gate or river waits. */
function reachable(sim: Simulation, entity: Entity, wading = false): boolean {
  return hasRoute(sim, sim.carryables.require(entity), sim.transforms.require(entity), wading);
}

/**
 * How far away a job looks. Across open ground a player judges by eye, in a straight
 * line; in tunnels the only honest measure is the walk, and a spot that cannot be
 * walked to counts as very far.
 */
function walkDistance(sim: Simulation, x: number, z: number): number {
  const from = sim.captainTransform;
  const line = Math.hypot(x - from.x, z - from.z);
  // On flat open ground the eye is good enough; terraces and tunnels need the walk.
  if (sim.level.theme !== 'cave' && !sim.level.plateaus?.length) return line;
  const dist = sim.squadField.dist[sim.nav.cellIndexAt(x, z)];
  return Number.isFinite(dist) ? dist : 1000 + line;
}

/**
 * Where to stand to throw at a haul in the water: the nearest dry spot within throwing
 * reach that the Warden can actually walk to (the near bank, not the far one).
 */
function bankSpot(sim: Simulation, at: Point): Point {
  let best: Point | null = null;
  let bestDist = Infinity;
  for (let ring = 1; ring <= 8; ring++) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const x = at.x + Math.sin(angle) * ring;
      const z = at.z + Math.cos(angle) * ring;
      if (!sim.nav.isWalkable(x, z)) continue;
      const walk = sim.squadField.dist[sim.nav.cellIndexAt(x, z)];
      if (!Number.isFinite(walk)) continue;
      const score = walk + ring * 2;
      if (score < bestDist) {
        best = { x, z };
        bestDist = score;
      }
    }
    if (best) return best;
  }
  return sim.nav.nearestWalkable(at.x, at.z);
}

/** Where to stand to attack: for a gate, the middle of whichever face the captain can walk to. */
function reachSpot(sim: Simulation, foe: Enemy, at: Transform): Point {
  const box = foe.shape;
  if (!box) return at;
  if (sim.level.theme !== 'cave') {
    const from = sim.captainTransform;
    return approachPoint(sim, foe, at, from.x, from.z);
  }
  let best: Point = at;
  let bestDist = Infinity;
  for (const [sx, sz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const x = box.x + sx * (box.w / 2 + 1);
    const z = box.z + sz * (box.d / 2 + 1);
    if (!sim.nav.isWalkable(x, z)) continue;
    const dist = sim.squadField.dist[sim.nav.cellIndexAt(x, z)];
    if (dist < bestDist) {
      best = { x, z };
      bestDist = dist;
    }
  }
  return best;
}

/** Nearest job the squad can fully staff: an unguarded haul, else an enemy when at full strength. */
function chooseJob(
  sim: Simulation,
  squad: number,
  total: number,
  prefer?: (carryable: Carryable) => boolean,
): Entity {
  const nearest = (candidates: Entity[]): Entity => {
    let best: Entity = NO_ENTITY;
    let bestDist = Infinity;
    for (const entity of candidates) {
      const at = sim.transforms.require(entity);
      const foe = sim.enemies.get(entity);
      const wet = sim.inWater(at.x, at.z);
      const spot = foe ? reachSpot(sim, foe, at) : wet ? bankSpot(sim, at) : at;
      const dist = walkDistance(sim, spot.x, spot.z);
      if (dist < bestDist) {
        best = entity;
        bestDist = dist;
      }
    }
    return best;
  };
  const hauls: Entity[] = [];
  for (const [entity] of sim.carryables.entries()) {
    const at = sim.transforms.require(entity);
    const needed = shortfall(sim, entity);
    const kind = requiredKind(sim, at.x, at.z);
    if (
      needed > 0 &&
      squadStrength(sim, kind) >= needed &&
      !guarded(sim, at.x, at.z) &&
      reachable(sim, entity, kind === 'dew')
    ) {
      hauls.push(entity);
    }
  }
  // Hauls it prefers come first, when any can be staffed.
  const preferred = prefer ? hauls.filter((entity) => prefer(sim.carryables.require(entity))) : [];
  if (preferred.length > 0) return nearest(preferred);
  if (hauls.length > 0) return nearest(hauls);
  // A haul is waiting for a kind that is standing idle somewhere: fetch them before fighting.
  if (wantedKind(sim)) return NO_ENTITY;
  if (squad < Math.min(FULL_SQUAD, total)) return NO_ENTITY;
  // Fight what can be hurt; a shielded boss is left until its knots are down, and a foe
  // standing in a hazard waits for the one kind that can go in after it.
  const foes = [...sim.enemies.entries()]
    .filter(([entity, enemy]) => {
      if (!isTargetable(sim, entity, enemy)) return false;
      // Crystal is left for Stonelings while there are any to call on.
      if ((enemy.shape as GateSpawn | null)?.style === 'crystal' && fieldOf(sim, 'stone') > 0) {
        if (squadOf(sim, 'stone') === 0) return false;
      }
      const at = sim.transforms.require(entity);
      const kind = requiredKind(sim, at.x, at.z);
      return kind === null || squadOf(sim, kind) >= Math.min(FULL_SQUAD, squad);
    })
    .map(([entity]) => entity);
  return nearest(foes);
}

/**
 * Whistles dazed workers back before the enemy that shook them off can eat them, and
 * Sproutlings that are burning or drowning before it is too late.
 */
function rescue(sim: Simulation, input: InputState): void {
  const from = sim.captainTransform;
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.peril === null && (worker.stun <= 0 || worker.state !== 'idle')) continue;
    const at = sim.transforms.require(entity);
    if (Math.hypot(at.x - from.x, at.z - from.z) > RESCUE_RANGE) continue;
    input.cursorX = at.x;
    input.cursorZ = at.z;
    input.whistleHeld = true;
    input.throwHeld = false;
    return;
  }
}

/** Steps out of a glob's landing zone or a Ramhorn's charge line, as any player would. */
function dodge(sim: Simulation, input: InputState): void {
  const from = sim.captainTransform;
  for (const [, hazard] of sim.hazards.entries()) {
    const dx = from.x - hazard.toX;
    const dz = from.z - hazard.toZ;
    const dist = Math.hypot(dx, dz);
    if (dist < hazard.radius + 1.5) {
      input.moveX = dist > 0.01 ? dx / dist : 1;
      input.moveZ = dist > 0.01 ? dz / dist : 0;
      return;
    }
  }
  // A bite is telegraphed: step back out of reach of the mouth while the jaws wind up.
  for (const [entity, enemy] of sim.enemies.entries()) {
    if (ENEMY_SPECS[enemy.kind].attack !== 'bite' || enemy.state !== 'windup') continue;
    const at = sim.transforms.require(entity);
    const mouthX = at.x + Math.sin(at.facing) * enemy.radius;
    const mouthZ = at.z + Math.cos(at.facing) * enemy.radius;
    const dx = from.x - mouthX;
    const dz = from.z - mouthZ;
    const dist = Math.hypot(dx, dz);
    if (dist < ENEMY.biteRange + 1.2) {
      input.moveX = dist > 0.01 ? dx / dist : Math.sin(at.facing);
      input.moveZ = dist > 0.01 ? dz / dist : Math.cos(at.facing);
      return;
    }
  }
  for (const [entity, enemy] of sim.enemies.entries()) {
    if (
      ENEMY_SPECS[enemy.kind].attack !== 'charge' ||
      (enemy.state !== 'windup' && enemy.state !== 'charge')
    ) {
      continue;
    }
    const at = sim.transforms.require(entity);
    // The squad follows the Warden into danger, so the Warden leads it out: away from the
    // charge line until neither they nor any follower stands in it.
    const inLine = (x: number, z: number, width: number) => {
      const along = (x - at.x) * enemy.aimX + (z - at.z) * enemy.aimZ;
      const across = (x - at.x) * enemy.aimZ - (z - at.z) * enemy.aimX;
      return along > -2 && along < CHARGE_REACH && Math.abs(across) < width ? across : null;
    };
    let across = inLine(from.x, from.z, DODGE_WIDTH);
    if (across === null) {
      for (const [follower, worker] of sim.workers.entries()) {
        if (worker.state !== 'follow') continue;
        const spot = sim.transforms.require(follower);
        if (inLine(spot.x, spot.z, enemy.radius + SQUAD_MARGIN) !== null) {
          across = inLine(from.x, from.z, Infinity);
          break;
        }
      }
    }
    if (across !== null) {
      const side = across >= 0 ? 1 : -1;
      input.moveX = enemy.aimZ * side;
      input.moveZ = -enemy.aimX * side;
      return;
    }
  }
}

/** A point on the line from the boss through the captain, `hold` away from the boss. */
function holdSpot(at: { x: number; z: number }, from: { x: number; z: number }, hold: number) {
  const dx = from.x - at.x;
  const dz = from.z - at.z;
  const dist = Math.hypot(dx, dz) || 1;
  return { x: at.x + (dx / dist) * hold, z: at.z + (dz / dist) * hold };
}

/** Just in front of the nearest pillar, on the side facing the charger, so a charge ends in stone. */
function baitSpot(sim: Simulation, at: { x: number; z: number }) {
  let best = sim.level.obstacles[0];
  let bestDist = Infinity;
  for (const box of sim.level.obstacles) {
    if (box.w > 4 || box.d > 4) continue;
    const dist = Math.hypot(box.x - at.x, box.z - at.z);
    if (dist < bestDist) {
      best = box;
      bestDist = dist;
    }
  }
  const dx = at.x - best.x;
  const dz = at.z - best.z;
  const dist = Math.hypot(dx, dz) || 1;
  const offset = Math.max(best.w, best.d) / 2 + 1.6;
  return sim.nav.nearestWalkable(best.x + (dx / dist) * offset, best.z + (dz / dist) * offset);
}

function nearestEnemy(sim: Simulation): Entity {
  const from = sim.captainTransform;
  let best: Entity = NO_ENTITY;
  let bestDist = Infinity;
  for (const [entity, enemy] of sim.enemies.entries()) {
    const spec = ENEMY_SPECS[enemy.kind];
    if (spec.attack === 'none' || spec.boss) continue;
    const at = sim.transforms.require(entity);
    const dist = Math.hypot(at.x - from.x, at.z - from.z);
    if (dist < bestDist) {
      best = entity;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * The kind a waiting haul needs more of than the squad has, when there are idle ones of that
 * kind on the field to call back; null otherwise.
 */
function wantedKind(sim: Simulation): SproutKind | null {
  for (const [entity] of sim.carryables.entries()) {
    const at = sim.transforms.require(entity);
    const kind = requiredKind(sim, at.x, at.z);
    if (!kind) continue;
    if (squadStrength(sim, kind) >= shortfall(sim, entity)) continue;
    for (const [, worker] of sim.workers.entries()) {
      if (worker.kind === kind && worker.state === 'idle') return kind;
    }
  }
  return null;
}

/** Nearest idle worker to call back; failing that, one stuck on a haul too heavy for its crew. */
function nearestIdle(sim: Simulation, kind: SproutKind | null = null): Entity {
  const from = sim.captainTransform;
  const nearest = (test: (entity: Entity) => boolean): Entity => {
    let best: Entity = NO_ENTITY;
    let bestDist = Infinity;
    for (const [entity] of sim.workers.entries()) {
      if (!test(entity)) continue;
      const at = sim.transforms.require(entity);
      const dist = Math.hypot(at.x - from.x, at.z - from.z);
      if (dist < bestDist) {
        best = entity;
        bestDist = dist;
      }
    }
    return best;
  };
  const idle = nearest((entity) => {
    const worker = sim.workers.require(entity);
    return worker.state === 'idle' && (kind === null || worker.kind === kind);
  });
  if (idle !== NO_ENTITY) return idle;
  // Only a crew that cannot be completed, even with the whole squad, is called off.
  const { squad } = sim.countWorkers();
  return nearest((entity) => {
    const worker = sim.workers.require(entity);
    const haul = sim.carryables.get(worker.target);
    return (
      worker.state === 'carrying' && haul !== undefined && haul.claimed.length + squad < haul.weight
    );
  });
}

const BEACON_DETOUR = 18;
const FIGHT_RANGE = 14;

/** True while the job is a boss with workers still on or around it: no time to wander off. */
function bossFight(sim: Simulation, job: Entity): boolean {
  const foe = sim.enemies.get(job);
  if (!foe || !ENEMY_SPECS[foe.kind].boss) return false;
  if (foe.latched.length === 0 && !isTargetable(sim, job, foe)) return false;
  const at = sim.transforms.require(job);
  for (const [entity] of sim.workers.entries()) {
    const spot = sim.transforms.require(entity);
    if (Math.hypot(spot.x - at.x, spot.z - at.z) < FIGHT_RANGE) return true;
  }
  return false;
}

/** Nearest cold beacon the captain can walk to and is already close to. */
function coldBeacon(sim: Simulation): { x: number; z: number } | null {
  const from = sim.captainTransform;
  let best: { x: number; z: number } | null = null;
  let bestDist = BEACON_DETOUR;
  for (const beacon of sim.beacons) {
    if (beacon.lit) continue;
    if (!Number.isFinite(sim.squadField.dist[sim.nav.cellIndexAt(beacon.x, beacon.z)])) continue;
    const dist = Math.hypot(beacon.x - from.x, beacon.z - from.z);
    if (dist < bestDist) {
      best = beacon;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * A plain greedy player: commit to the nearest job the squad can staff, throw workers
 * at it until it is staffed or dead, and otherwise walk to idle workers and whistle
 * them back. An enemy that gets close is fought with a squad and avoided without one.
 */
export function playGreedy(
  sim: Simulation,
  watch?: (tick: number, job: Entity) => void,
  style: BotStyle = BOT_STYLES[0],
): void {
  const player = greedyPlayer(sim, style);
  for (let tick = 0; tick < 60 * 1500 && !sim.ended; tick++) {
    sim.step(player.input(tick));
    watch?.(tick, player.job);
  }
}

/** The test player one step at a time: what it would press now. Used for the CPU rival. */
export interface GreedyPlayer {
  input(tick: number): InputState;
  /** The job it is on, for watching. */
  readonly job: Entity;
}

/**
 * The greedy player as a step-by-step controller. `prefer`, if given, picks out hauls it goes
 * for first (a battle's marbles, or the squares on its bingo card).
 */
export function greedyPlayer(
  sim: Simulation,
  style: BotStyle = BOT_STYLES[0],
  prefer?: (carryable: Carryable) => boolean,
): GreedyPlayer {
  const mover = createMover();
  const dir = { x: 0, z: 0 };
  let job: Entity = NO_ENTITY;
  const input = (tick: number): InputState => {
    const from = sim.captainTransform;
    const { squad, total } = sim.countWorkers();
    if (!unfinished(sim, job) || (squad === 0 && !bossFight(sim, job))) {
      job = chooseJob(sim, squad, total, prefer);
    }
    // An enemy this close is dealt with first: fought with a squad, avoided without one.
    const threat = nearestEnemy(sim);
    let threatDist = Infinity;
    if (threat !== NO_ENTITY) {
      const at = sim.transforms.require(threat);
      threatDist = Math.hypot(at.x - from.x, at.z - from.z);
      if (threatDist < style.threatDistance && squad > 0) job = threat;
    }
    const input: InputState = { ...NO_INPUT, cursorX: from.x, cursorZ: from.z };
    const goal = job !== NO_ENTITY ? job : nearestIdle(sim, wantedKind(sim));
    const foe = sim.enemies.get(job);
    const cold = coldBeacon(sim);
    if (cold) {
      // A cold beacon nearby is lit first: it shortens every haul around it.
      steerTo(sim.nav, mover, sim.anchor, cold.x, cold.z, 1 / 60, dir);
      input.moveX = dir.x;
      input.moveZ = dir.z;
    } else if (foe && ENEMY_SPECS[foe.kind].armour < 1 && damageTaken(sim, job, foe) < 1) {
      // An armoured boss: call everyone off it, wait out of reach until it lies open,
      // then pile on. A charger is baited into a pillar so that it ends up winded.
      const at = sim.transforms.require(job);
      // A slammer is baited by standing just outside its ring, close enough that it rears.
      const spot =
        ENEMY_SPECS[foe.kind].attack === 'charge'
          ? baitSpot(sim, at)
          : holdSpot(at, from, foe.radius + ENEMY.slamReach - 0.3);
      const dist = Math.hypot(spot.x - from.x, spot.z - from.z);
      if (dist > 0.8) {
        steerTo(sim.nav, mover, sim.anchor, spot.x, spot.z, 1 / 60, dir);
        input.moveX = dir.x;
        input.moveZ = dir.z;
      }
      if (foe.latched.length > 0) {
        input.cursorX = at.x;
        input.cursorZ = at.z;
        input.whistleHeld = true;
      }
    } else if (goal !== NO_ENTITY) {
      const at = sim.transforms.require(goal);
      // A gate is reached at its near face, not its centre; a haul in the water from the bank.
      const wet = sim.inWater(at.x, at.z);
      const spot = foe ? reachSpot(sim, foe, at) : wet ? bankSpot(sim, at) : at;
      // Measured from the nearest walkable point: the captain may stand where the grid says blocked.
      const base = sim.anchor;
      const dist = Math.hypot(spot.x - base.x, spot.z - base.z);
      input.cursorX = at.x;
      input.cursorZ = at.z;
      // Emberlings fly over a cliff edge, so a job just above one is thrown to from below.
      const upCliff = heightAt(sim.level, spot.x, spot.z) > heightAt(sim.level, base.x, base.z);
      const clear =
        upCliff ||
        sim.nav.lineOfSight(base.x, base.z, spot.x, spot.z) ||
        (wet && sim.wadeNav.lineOfSight(base.x, base.z, at.x, at.z));
      if (dist > style.throwDistance || !clear) {
        steerTo(sim.nav, mover, sim.anchor, spot.x, spot.z, 1 / 60, dir);
        input.moveX = dir.x;
        input.moveZ = dir.z;
      } else if (job !== NO_ENTITY) {
        const kind = throwKind(sim, job);
        if (kind) {
          input.selectKind = kind;
          input.throwHeld = squadOf(sim, kind) > 0;
        }
      } else {
        // Tapping keeps the call circle small, so nearby carriers stay on the job.
        input.whistleHeld = tick % 2 === 0;
      }
    }
    // Without a squad it backs away from big game; it simply outruns a Skitter to fetch help.
    const small = threat !== NO_ENTITY && sim.enemies.require(threat).radius < 1;
    if (threatDist < style.threatDistance && squad === 0 && !(small && goal !== NO_ENTITY)) {
      const at = sim.transforms.require(threat);
      input.moveX = (from.x - at.x) / threatDist;
      input.moveZ = (from.z - at.z) / threatDist;
    }
    rescue(sim, input);
    dodge(sim, input);
    return input;
  };
  return {
    input,
    get job() {
      return job;
    },
  };
}
