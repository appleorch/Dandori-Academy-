import { beforeAll, describe, expect, it } from 'vitest';
import { NO_INPUT, type InputState } from '../commands/input';
import { NO_ENTITY, type Entity } from '../core/ecs';
import { evaluateDay } from '../dandori/scoring';
import { ENEMY, ENEMY_SPECS } from '../enemies/enemyKinds';
import { createMover, steerTo } from '../navigation/steering';
import { initPhysics } from '../simulation/physics';
import { Simulation } from '../simulation/Simulation';
import { LEVELS } from './level';

const THROW_DISTANCE = 6;

const FULL_SQUAD = 6;
const THREAT_DISTANCE = 6.5;
const CHARGE_REACH = 19;
const DODGE_WIDTH = 3.5;
const RESCUE_RANGE = 10;

/** Workers a haul still needs before it moves. */
function shortfall(sim: Simulation, entity: Entity): number {
  const carryable = sim.carryables.require(entity);
  return Math.max(0, carryable.weight - carryable.claimed.length);
}

/** True while a live enemy's home is close enough that it would hunt workers at this spot. */
function guarded(sim: Simulation, x: number, z: number): boolean {
  for (const [, enemy] of sim.enemies.entries()) {
    const reach = ENEMY_SPECS[enemy.kind].aggroRange + ENEMY.wanderRange;
    if (Math.hypot(enemy.homeX - x, enemy.homeZ - z) < reach) return true;
  }
  return false;
}

function unfinished(sim: Simulation, job: Entity): boolean {
  if (sim.enemies.has(job)) return true;
  return sim.carryables.has(job) && shortfall(sim, job) > 0;
}

/** Nearest job the squad can fully staff: an unguarded haul, else an enemy when at full strength. */
function chooseJob(sim: Simulation, squad: number, total: number): Entity {
  const from = sim.captainTransform;
  const nearest = (candidates: Entity[]): Entity => {
    let best: Entity = NO_ENTITY;
    let bestDist = Infinity;
    for (const entity of candidates) {
      const at = sim.transforms.require(entity);
      const dist = Math.hypot(at.x - from.x, at.z - from.z);
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
    if (needed > 0 && squad >= needed && !guarded(sim, at.x, at.z)) hauls.push(entity);
  }
  if (hauls.length > 0) return nearest(hauls);
  if (squad < Math.min(FULL_SQUAD, total)) return NO_ENTITY;
  return nearest([...sim.enemies.entries()].map(([entity]) => entity));
}

/** Whistles dazed workers back before the enemy that shook them off can eat them. */
function rescue(sim: Simulation, input: InputState): void {
  const from = sim.captainTransform;
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.stun <= 0 || worker.state !== 'idle') continue;
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
  for (const [entity, enemy] of sim.enemies.entries()) {
    if (enemy.kind !== 'ramhorn' || (enemy.state !== 'windup' && enemy.state !== 'charge')) {
      continue;
    }
    const at = sim.transforms.require(entity);
    const along = (from.x - at.x) * enemy.aimX + (from.z - at.z) * enemy.aimZ;
    const across = (from.x - at.x) * enemy.aimZ - (from.z - at.z) * enemy.aimX;
    if (along > -2 && along < CHARGE_REACH && Math.abs(across) < DODGE_WIDTH) {
      const side = across >= 0 ? 1 : -1;
      input.moveX = enemy.aimZ * side;
      input.moveZ = -enemy.aimX * side;
      return;
    }
  }
}

function nearestEnemy(sim: Simulation): Entity {
  const from = sim.captainTransform;
  let best: Entity = NO_ENTITY;
  let bestDist = Infinity;
  for (const [entity] of sim.enemies.entries()) {
    const at = sim.transforms.require(entity);
    const dist = Math.hypot(at.x - from.x, at.z - from.z);
    if (dist < bestDist) {
      best = entity;
      bestDist = dist;
    }
  }
  return best;
}

function nearestIdle(sim: Simulation): Entity {
  const from = sim.captainTransform;
  let best: Entity = NO_ENTITY;
  let bestDist = Infinity;
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state !== 'idle') continue;
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
 * A plain greedy player: commit to the nearest job the squad can staff, throw workers
 * at it until it is staffed or dead, and otherwise walk to idle workers and whistle
 * them back. An enemy that gets close is fought with a squad and avoided without one.
 */
function playGreedy(sim: Simulation): void {
  const mover = createMover();
  const dir = { x: 0, z: 0 };
  let job: Entity = NO_ENTITY;
  for (let tick = 0; tick < 60 * 1200 && !sim.ended; tick++) {
    const from = sim.captainTransform;
    const { squad, total } = sim.countWorkers();
    if (!unfinished(sim, job) || squad === 0) {
      job = chooseJob(sim, squad, total);
    }
    // An enemy this close is dealt with first: fought with a squad, avoided without one.
    const threat = nearestEnemy(sim);
    let threatDist = Infinity;
    if (threat !== NO_ENTITY) {
      const at = sim.transforms.require(threat);
      threatDist = Math.hypot(at.x - from.x, at.z - from.z);
      if (threatDist < THREAT_DISTANCE && squad > 0) job = threat;
    }
    const input: InputState = { ...NO_INPUT, cursorX: from.x, cursorZ: from.z };
    const goal = job !== NO_ENTITY ? job : nearestIdle(sim);
    if (goal !== NO_ENTITY) {
      const at = sim.transforms.require(goal);
      const dist = Math.hypot(at.x - from.x, at.z - from.z);
      input.cursorX = at.x;
      input.cursorZ = at.z;
      if (dist > THROW_DISTANCE || !sim.nav.lineOfSight(from.x, from.z, at.x, at.z)) {
        steerTo(sim.nav, mover, sim.anchor, at.x, at.z, 1 / 60, dir);
        input.moveX = dir.x;
        input.moveZ = dir.z;
      } else if (job !== NO_ENTITY) {
        input.throwHeld = true;
      } else {
        // Tapping keeps the call circle small, so nearby carriers stay on the job.
        input.whistleHeld = tick % 2 === 0;
      }
    }
    if (threatDist < THREAT_DISTANCE && squad === 0) {
      const at = sim.transforms.require(threat);
      input.moveX = (from.x - at.x) / threatDist;
      input.moveZ = (from.z - at.z) / threatDist;
    }
    rescue(sim, input);
    dodge(sim, input);
    sim.step(input);
  }
}

beforeAll(async () => {
  await initPhysics();
});

describe.each(LEVELS)('$name', (level) => {
  it('has every spawn on walkable ground', () => {
    const sim = new Simulation(level);
    for (const spot of [level.captain, level.kiln, ...level.treasures, ...level.enemies]) {
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
    // The bot is quick but clumsy; Platinum is set slower than it, so it must reach it.
    expect(score.rank).toBe('Platinum');
    sim.dispose();
  });
});
