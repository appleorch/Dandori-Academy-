import { damageCaptain } from '../captain/captainSystem';
import { HARD } from '../core/difficulty';
import type { Entity } from '../core/ecs';
import { moveAgent, steerTo } from '../navigation/steering';
import type { Enemy, Transform } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { killWorker, setIdle } from '../workers/squad';
import { spawnCarcass, spawnHazard, spawnPod, spawnSap, spawnTreasure } from '../world/spawn';
import { ENEMY, ENEMY_SPECS, HAZARDS, type EnemySpec } from './enemyKinds';

const dir = { x: 0, z: 0 };

/** Telegraph time, shorter on Hard. */
function windupOf(sim: Simulation, spec: EnemySpec): number {
  return spec.windup * (sim.hard ? HARD.windup : 1);
}
/** Pebbles thrown by a late-phase slam, and how far they scatter. */
const PEBBLES = 3;
const PEBBLE_SCATTER = 8;
const PEBBLE_STAGGER = 0.4;

function walk(
  sim: Simulation,
  enemy: Enemy,
  at: Transform,
  x: number,
  z: number,
  speed: number,
  dt: number,
): void {
  steerTo(sim.nav, enemy.mover, at, x, z, dt, dir);
  moveAgent(sim.nav, at, dir.x * speed * dt, dir.z * speed * dt);
  if (dir.x !== 0 || dir.z !== 0) at.facing = Math.atan2(dir.x, dir.z);
}

/**
 * Nearest prey the enemy will go after: the captain or a worker on the ground,
 * within aggro range and inside the enemy's territory. Null when there is none.
 */
function pickPrey(sim: Simulation, enemy: Enemy, spec: EnemySpec, at: Transform): Transform | null {
  let best: Transform | null = null;
  let bestDist = spec.aggroRange;
  const consider = (prey: Transform): void => {
    const dist = Math.hypot(prey.x - at.x, prey.z - at.z);
    if (dist >= bestDist) return;
    if (Math.hypot(prey.x - enemy.homeX, prey.z - enemy.homeZ) > spec.territory) return;
    best = prey;
    bestDist = dist;
  };
  consider(sim.captainTransform);
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state === 'thrown' || worker.state === 'attacking') continue;
    consider(sim.transforms.require(entity));
  }
  return best;
}

/** The grounded worker with the most others close by, for a lobber that wants the biggest splash. */
function densestCluster(sim: Simulation, at: Transform, range: number): Transform | null {
  const grounded: Transform[] = [];
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state === 'thrown' || worker.state === 'attacking') continue;
    const spot = sim.transforms.require(entity);
    if (Math.hypot(spot.x - at.x, spot.z - at.z) <= range) grounded.push(spot);
  }
  let best: Transform | null = null;
  let bestCount = 0;
  for (const spot of grounded) {
    let count = 0;
    for (const other of grounded) if (Math.hypot(other.x - spot.x, other.z - spot.z) < 2) count++;
    if (count > bestCount) {
      best = spot;
      bestCount = count;
    }
  }
  const captain = sim.captainTransform;
  if (!best && Math.hypot(captain.x - at.x, captain.z - at.z) <= range) return captain;
  return best;
}

function wander(sim: Simulation, enemy: Enemy, at: Transform, dt: number): void {
  enemy.wanderTimer -= dt;
  if (enemy.wanderTimer <= 0) {
    enemy.wanderTimer = sim.rng.range(2, 5);
    const spot = sim.nav.nearestWalkable(
      enemy.homeX + sim.rng.range(-ENEMY.wanderRange, ENEMY.wanderRange),
      enemy.homeZ + sim.rng.range(-ENEMY.wanderRange, ENEMY.wanderRange),
    );
    enemy.wanderX = spot.x;
    enemy.wanderZ = spot.z;
  }
  if (Math.hypot(enemy.wanderX - at.x, enemy.wanderZ - at.z) > 0.3) {
    walk(sim, enemy, at, enemy.wanderX, enemy.wanderZ, ENEMY.wanderSpeed, dt);
  }
}

function beginWindup(enemy: Enemy, at: Transform, windup: number, x: number, z: number): void {
  if (Math.hypot(x - at.x, z - at.z) > 1e-3) at.facing = Math.atan2(x - at.x, z - at.z);
  enemy.state = 'windup';
  enemy.timer = windup;
}

function aimCharge(enemy: Enemy, at: Transform, x: number, z: number): void {
  const dist = Math.hypot(x - at.x, z - at.z);
  enemy.aimX = dist > 1e-3 ? (x - at.x) / dist : Math.sin(at.facing);
  enemy.aimZ = dist > 1e-3 ? (z - at.z) / dist : Math.cos(at.facing);
}

/** Snaps at the ground in front of the enemy, eating workers and hurting the captain. */
function bite(sim: Simulation, enemy: Enemy, at: Transform): void {
  const mouthX = at.x + Math.sin(at.facing) * enemy.radius;
  const mouthZ = at.z + Math.cos(at.facing) * enemy.radius;
  let eaten = 0;
  for (const [entity, worker] of sim.workers.entries()) {
    if (eaten >= ENEMY.biteVictims) break;
    if (worker.state === 'thrown' || worker.state === 'attacking') continue;
    const prey = sim.transforms.require(entity);
    if (Math.hypot(prey.x - mouthX, prey.z - mouthZ) <= ENEMY.biteRange) {
      killWorker(sim, entity, worker);
      eaten++;
    }
  }
  const captain = sim.captainTransform;
  if (Math.hypot(captain.x - mouthX, captain.z - mouthZ) <= ENEMY.biteRange) {
    damageCaptain(sim, at.x, at.z);
  }
  sim.emit('bite', mouthX, mouthZ);
}

/** Runs one step of a charge: move, trample what is in the way. Returns 'wall', 'done' or null. */
function charge(
  sim: Simulation,
  enemy: Enemy,
  spec: EnemySpec,
  at: Transform,
  dt: number,
): 'wall' | 'done' | null {
  const step = spec.chargeSpeed * dt;
  const beforeX = at.x;
  const beforeZ = at.z;
  moveAgent(sim.nav, at, enemy.aimX * step, enemy.aimZ * step);
  const blocked = Math.hypot(at.x - beforeX, at.z - beforeZ) < step * 0.5;

  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state === 'thrown' || worker.state === 'attacking' || worker.stun > 0) continue;
    const prey = sim.transforms.require(entity);
    if (Math.hypot(prey.x - at.x, prey.z - at.z) > enemy.radius + 0.25) continue;
    if (enemy.trampled < spec.trampleKills) {
      killWorker(sim, entity, worker);
      enemy.trampled++;
    } else {
      // The rest are bowled over to the side rather than crushed.
      const side = (prey.x - at.x) * enemy.aimZ - (prey.z - at.z) * enemy.aimX >= 0 ? 1 : -1;
      prey.x += enemy.aimZ * side * 1.2;
      prey.z -= enemy.aimX * side * 1.2;
      setIdle(sim, entity, worker);
      worker.stun = ENEMY.shakeStun;
    }
  }
  const captain = sim.captainTransform;
  if (Math.hypot(captain.x - at.x, captain.z - at.z) <= enemy.radius + 0.5) {
    damageCaptain(sim, at.x, at.z);
  }
  enemy.timer -= dt;
  if (blocked) return 'wall';
  return enemy.timer <= 0 ? 'done' : null;
}

/** Throws every clinging worker to the ground nearby and leaves them dazed. */
function shakeOff(sim: Simulation, enemy: Enemy, spec: EnemySpec, at: Transform): void {
  let firstX = at.x;
  let firstZ = at.z + 1;
  const shaken = [...enemy.latched];
  for (let i = 0; i < shaken.length; i++) {
    const worker = sim.workers.require(shaken[i]);
    const transform = sim.transforms.require(shaken[i]);
    const distance = enemy.radius + sim.rng.range(1, 2);
    transform.x = at.x + Math.sin(worker.slot) * distance;
    transform.z = at.z + Math.cos(worker.slot) * distance;
    setIdle(sim, shaken[i], worker);
    worker.stun = ENEMY.shakeStun;
    if (i === 0) {
      firstX = transform.x;
      firstZ = transform.z;
    }
  }
  enemy.shake = 0;
  sim.emit('shake', at.x, at.z);
  // A biter turns straight on the dazed workers; whistle them clear or lose them.
  if (spec.attack === 'bite') {
    beginWindup(enemy, at, windupOf(sim, spec), firstX, firstZ);
    enemy.timer += ENEMY.shakePause;
  }
}

/** Takes a broken gate out of the world: paths, flow fields and the captain's collision. */
function breakGate(sim: Simulation, enemy: Enemy): void {
  const box = enemy.shape;
  if (!box) return;
  sim.removeWall(box);
  sim.emit('gateBroken', box.x, box.z);
}

/** A root-knot withers instead of dying, and grows back after a while. */
function wither(sim: Simulation, enemy: Enemy, at: Transform): void {
  for (const latched of [...enemy.latched]) setIdle(sim, latched, sim.workers.require(latched));
  enemy.hp = 0;
  enemy.state = 'recover';
  const core = sim.enemies.get(enemy.parent);
  enemy.timer = core && core.phase > 0 ? ENEMY.knotRegrowLate : ENEMY.knotRegrow;
  const siblings = [...sim.enemies.entries()].filter(([, other]) => other.parent === enemy.parent);
  if (siblings.every(([, other]) => other.hp <= 0)) {
    // Every knot is down: the core is open for a while, then they all come back together.
    for (const [, knot] of siblings) knot.timer = ENEMY.coreOpen;
    const coreAt = sim.transforms.get(enemy.parent);
    if (coreAt) sim.emit('shieldDown', coreAt.x, coreAt.z);
  }
  sim.emit('enemyDefeated', at.x, at.z);
}

function defeat(sim: Simulation, entity: Entity, enemy: Enemy, at: Transform): void {
  const spec = ENEMY_SPECS[enemy.kind];
  for (const latched of [...enemy.latched]) setIdle(sim, latched, sim.workers.require(latched));
  const ground = sim.nav.nearestWalkable(at.x, at.z);
  if (enemy.kind === 'gate') {
    breakGate(sim, enemy);
  } else if (enemy.kind === 'mound') {
    if (enemy.reveals === 'pod') spawnPod(sim, ground, 200 + entity);
    if (enemy.reveals === 'sap') spawnSap(sim, ground, entity);
    sim.emit('dug', ground.x, ground.z);
  } else {
    if (spec.carcassYield > 0) spawnCarcass(sim, ground.x, ground.z, enemy.kind);
    sim.stats.enemiesDefeated++;
    if (spec.boss) sim.stats.bossesDefeated.push(enemy.kind);
    sim.emit('enemyDefeated', ground.x, ground.z);
  }
  if (enemy.drop > 0) {
    const shard = sim.nav.nearestWalkable(ground.x + 1.5, ground.z);
    spawnTreasure(sim, { id: `${enemy.kind}-shard`, x: shard.x, z: shard.z, weight: enemy.drop });
  }
  if (enemy.kind === 'lanternroot') {
    for (const [knot, other] of [...sim.enemies.entries()]) {
      if (other.parent !== entity) continue;
      for (const latched of [...other.latched]) setIdle(sim, latched, sim.workers.require(latched));
      sim.ecs.destroy(knot);
    }
    for (let i = 0; i < 2; i++) {
      spawnPod(sim, sim.nav.nearestWalkable(ground.x - 1.5, ground.z + (i * 2 - 1) * 1.5), 100 + i);
    }
  }
  sim.ecs.destroy(entity);
  sim.entityVersion++;
}

/** Decides what an idle enemy does next: start its attack, close in, or wander. */
function roam(sim: Simulation, enemy: Enemy, spec: EnemySpec, at: Transform, dt: number): void {
  if (spec.attack === 'spit' && spec.speed === 0) {
    // A rooted lobber aims at the biggest crowd in range.
    const target = densestCluster(sim, at, spec.aggroRange);
    enemy.alert = target !== null;
    if (target) beginWindup(enemy, at, windupOf(sim, spec), target.x, target.z);
    return;
  }
  const prey = pickPrey(sim, enemy, spec, at);
  enemy.alert = prey !== null;
  if (!prey) {
    if (spec.speed > 0) wander(sim, enemy, at, dt);
    return;
  }
  enemy.targetX = prey.x;
  enemy.targetZ = prey.z;
  const dist = Math.hypot(prey.x - at.x, prey.z - at.z);
  if (spec.attack === 'bite') {
    if (dist <= enemy.radius + ENEMY.biteRange * 0.6)
      beginWindup(enemy, at, windupOf(sim, spec), prey.x, prey.z);
    else walk(sim, enemy, at, prey.x, prey.z, spec.speed, dt);
  } else if (spec.attack === 'charge') {
    if (sim.nav.lineOfSight(at.x, at.z, prey.x, prey.z)) {
      beginWindup(enemy, at, windupOf(sim, spec), prey.x, prey.z);
      aimCharge(enemy, at, prey.x, prey.z);
      enemy.charges = 0;
      sim.emit('chargeWindup', at.x, at.z);
    } else {
      walk(sim, enemy, at, prey.x, prey.z, spec.speed, dt);
    }
  } else if (spec.attack === 'slam') {
    if (dist <= enemy.radius + ENEMY.slamReach) {
      beginWindup(enemy, at, windupOf(sim, spec), prey.x, prey.z);
      // The ring on the ground is the slam itself, landing when the windup ends.
      spawnHazard(sim, 'slam', at, at, windupOf(sim, spec));
      sim.emit('slamWindup', at.x, at.z);
    } else {
      walk(sim, enemy, at, prey.x, prey.z, spec.speed, dt);
    }
  } else if (spec.attack === 'spit') {
    beginWindup(enemy, at, windupOf(sim, spec), prey.x, prey.z);
  }
}

/** The windup has finished: land the bite, start the charge, launch the glob, or follow the slam. */
function strike(sim: Simulation, enemy: Enemy, spec: EnemySpec, at: Transform): void {
  enemy.state = 'recover';
  enemy.timer = spec.recover;
  if (spec.attack === 'bite') {
    bite(sim, enemy, at);
  } else if (spec.attack === 'charge') {
    enemy.state = 'charge';
    enemy.timer = spec.chargeTime;
    enemy.trampled = 0;
  } else if (spec.attack === 'slam') {
    if (enemy.phase > 0) {
      for (let i = 0; i < PEBBLES; i++) {
        const spot = sim.nav.nearestWalkable(
          at.x + sim.rng.range(-PEBBLE_SCATTER, PEBBLE_SCATTER),
          at.z + sim.rng.range(-PEBBLE_SCATTER, PEBBLE_SCATTER),
        );
        spawnHazard(sim, 'pebble', at, spot, HAZARDS.pebble.flight, i * PEBBLE_STAGGER);
      }
    }
  } else if (spec.attack === 'spit') {
    const target =
      spec.speed === 0 ? densestCluster(sim, at, spec.aggroRange) : pickPrey(sim, enemy, spec, at);
    if (!target) {
      enemy.state = 'roam';
      return;
    }
    at.facing = Math.atan2(target.x - at.x, target.z - at.z);
    spawnHazard(sim, 'glob', at, sim.nav.nearestWalkable(target.x, target.z));
    if (enemy.kind === 'lanternroot' && enemy.phase > 0) {
      const second = sim.nav.nearestWalkable(
        target.x + sim.rng.range(-2, 2),
        target.z + sim.rng.range(-2, 2),
      );
      spawnHazard(sim, 'glob', at, second, HAZARDS.glob.flight, ENEMY.secondGlobDelay);
    }
    sim.emit('spit', at.x, at.z);
  }
}

/** A charge has ended. Late phases charge twice; only the last charge can leave it winded. */
function endCharge(
  sim: Simulation,
  enemy: Enemy,
  spec: EnemySpec,
  at: Transform,
  how: 'wall' | 'done',
): void {
  sim.emit('slam', at.x, at.z);
  enemy.charges++;
  if (enemy.kind === 'bellwether' && enemy.phase > 0 && enemy.charges < 2) {
    const prey = pickPrey(sim, enemy, spec, at) ?? sim.captainTransform;
    beginWindup(enemy, at, ENEMY.rechargeWindup * (sim.hard ? HARD.windup : 1), prey.x, prey.z);
    aimCharge(enemy, at, prey.x, prey.z);
    sim.emit('chargeWindup', at.x, at.z);
    return;
  }
  enemy.state = 'recover';
  enemy.timer = how === 'wall' ? spec.recover : spec.missRecover;
}

/** Raises the phase as health drops past each threshold. */
function updatePhase(sim: Simulation, enemy: Enemy, spec: EnemySpec, at: Transform): void {
  const fraction = enemy.hp / enemy.maxHp;
  const phase = spec.phases.filter((threshold) => fraction <= threshold).length;
  if (phase > enemy.phase) {
    enemy.phase = phase;
    sim.emit('phase', at.x, at.z);
  }
}

/** Runs enemy behaviour: hunt, attack, shake off attackers, change phase, die or wither. */
export function updateEnemies(sim: Simulation, dt: number): void {
  for (const [entity, enemy] of sim.enemies.entries()) {
    const at = sim.transforms.require(entity);
    const spec = ENEMY_SPECS[enemy.kind];

    if (enemy.kind === 'rootknot') {
      if (enemy.state === 'recover') {
        enemy.timer -= dt;
        if (enemy.timer <= 0) {
          enemy.hp = enemy.maxHp;
          enemy.state = 'roam';
          sim.emit('regrow', at.x, at.z);
        }
      } else if (enemy.hp <= 0) {
        wither(sim, enemy, at);
      }
      continue;
    }
    if (enemy.hp <= 0) {
      defeat(sim, entity, enemy, at);
      continue;
    }
    if (spec.attack === 'none') continue;
    updatePhase(sim, enemy, spec, at);

    if (enemy.latched.length > 0) {
      enemy.shake += dt;
      if (enemy.shake >= spec.shakeInterval && enemy.state === 'roam')
        shakeOff(sim, enemy, spec, at);
    } else {
      enemy.shake = Math.max(0, enemy.shake - dt * 2);
    }

    if (enemy.state === 'roam') {
      roam(sim, enemy, spec, at, dt);
    } else if (enemy.state === 'charge') {
      const ended = charge(sim, enemy, spec, at, dt);
      if (ended) endCharge(sim, enemy, spec, at, ended);
    } else {
      enemy.timer -= dt;
      if (enemy.timer <= 0) {
        if (enemy.state === 'windup') {
          strike(sim, enemy, spec, at);
        } else {
          enemy.state = 'roam';
          // The Bellwether's last phase wakes with a stomp that floors the squad.
          if (enemy.kind === 'bellwether' && enemy.phase > 1) {
            spawnHazard(sim, 'stomp', at, at);
            sim.emit('stomp', at.x, at.z);
          }
        }
      }
    }

    for (const latched of enemy.latched) {
      const worker = sim.workers.require(latched);
      const transform = sim.transforms.require(latched);
      transform.x = at.x + Math.sin(worker.slot) * enemy.radius * 0.7;
      transform.z = at.z + Math.cos(worker.slot) * enemy.radius * 0.7;
      transform.y = 0.55;
    }
  }
}
