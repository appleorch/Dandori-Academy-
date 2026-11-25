import { CARRY, CHAIN, DEWGLASS_BONUS_PER_WEIGHT, SAP, TWIN } from '../core/config';
import type { Entity } from '../core/ecs';
import type { NavGrid, Point } from '../navigation/NavGrid';
import { moveAgent } from '../navigation/steering';
import type { FlowField } from '../pathfinding/flowField';
import type { Carryable, Transform } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { setIdle } from '../workers/squad';
import { UPGRADE_EFFECT } from '../campaign/upgrades';
import {
  mostCommon,
  SPROUT_KINDS,
  SPROUTS,
  STAGE_SPEED,
  stageOf,
  type Squad,
  type SproutKind,
} from '../workers/sprouts';

/** How many carriers a crew counts as: a Stoneling lifts like two. */
export function crewStrength(sim: Simulation, crew: readonly Entity[]): number {
  let strength = 0;
  for (const entity of crew) {
    const worker = sim.workers.get(entity);
    if (worker) strength += SPROUTS[worker.kind].strength;
  }
  return strength;
}

/** True when a haul has a crew and every one of them can wade. */
export function crewWades(sim: Simulation, carryable: Carryable): boolean {
  return (
    carryable.carriers.length > 0 &&
    carryable.carriers.every((entity) => SPROUTS[sim.workers.require(entity).kind].wades)
  );
}

/** Travel speed of a haul: nothing below its weight, faster with every extra carrier and with Sap. */
export function carrySpeed(sim: Simulation, carryable: Carryable): number {
  const count = crewStrength(sim, carryable.carriers);
  if (count < carryable.weight) return 0;
  const spare = carryable.maxCarriers - carryable.weight;
  const extra = spare > 0 ? Math.min(1, (count - carryable.weight) / spare) : 0;
  const sap = sim.sapTimer > 0 ? SAP.speedUp : 1;
  const keel = sim.abilities.has('carry') ? UPGRADE_EFFECT.carrySpeed : 1;
  return (
    (carryable.baseSpeed + carryable.bonusSpeed * extra) * sap * keel * crewStage(sim, carryable)
  );
}

/** How much faster a crew of grown Sproutlings carries: the average of their stages' speeds (1 for leaves). */
function crewStage(sim: Simulation, carryable: Carryable): number {
  if (carryable.carriers.length === 0) return 1;
  let sum = 0;
  for (const entity of carryable.carriers)
    sum += STAGE_SPEED[stageOf(sim.workers.require(entity).growth)];
  return sum / carryable.carriers.length;
}

interface Destination extends Point {
  field: FlowField;
  /** The ground the haul moves on: the dry nav grid, or the wading one for a crew of Dewlings. */
  nav: NavGrid;
  /** The bridge site a Span-log is headed for, or -1 for the Kiln. */
  site: number;
}

/**
 * Where a haul goes. Span-logs go to the bank of the nearest unbuilt bridge (by path,
 * chosen once); everything else goes to the Kiln or a lit beacon, whichever is the shorter walk.
 */
export function destinationOf(
  sim: Simulation,
  carryable: Carryable,
  at: Point,
  wading = false,
): Destination {
  if (carryable.kind === 'log') {
    const current = sim.bridges[carryable.dest];
    if (!current || current.built) {
      const cell = sim.nav.cellIndexAt(at.x, at.z);
      let best = -1;
      let bestDist = Infinity;
      sim.bridges.forEach((site, index) => {
        if (site.built || site.delivered + site.enRoute(sim) >= site.needs) return;
        const dist = site.field.dist[cell];
        if (dist < bestDist) {
          best = index;
          bestDist = dist;
        }
      });
      carryable.dest = best;
    }
    const site = sim.bridges[carryable.dest];
    if (site) return { ...site.bank, field: site.field, nav: sim.nav, site: carryable.dest };
  }
  // The Kiln, unless a lit beacon is a shorter walk.
  const cell = sim.nav.cellIndexAt(at.x, at.z);
  let best: Destination = { ...sim.level.kiln, field: sim.kilnField, nav: sim.nav, site: -1 };
  let bestDist = sim.kilnField.dist[cell];
  for (const beacon of sim.beacons) {
    if (!beacon.lit) continue;
    const dist = beacon.field.dist[cell];
    if (dist < bestDist) {
      best = { x: beacon.x, z: beacon.z, field: beacon.field, nav: sim.nav, site: -1 };
      bestDist = dist;
    }
  }
  // A crew of Dewlings may cut straight through the water to the Kiln, if that is shorter.
  if (wading) {
    const wade = sim.wadeKilnField.dist[sim.wadeNav.cellIndexAt(at.x, at.z)];
    if (wade < bestDist) {
      return { ...sim.level.kiln, field: sim.wadeKilnField, nav: sim.wadeNav, site: -1 };
    }
  }
  return best;
}

/**
 * Whether a haul has a way to its destination from where it lies: on dry ground, or, for a
 * crew of Dewlings, through the water.
 */
export function hasRoute(
  sim: Simulation,
  carryable: Carryable,
  at: Point,
  wading = false,
): boolean {
  const { field, nav } = destinationOf(sim, carryable, at, wading);
  return Number.isFinite(field.dist[nav.cellIndexAt(at.x, at.z)]);
}

/** Pays the twin bonus when a treasure's twin arrived recently; otherwise waits for it. */
function settleTwin(sim: Simulation, carryable: Carryable, kiln: Point): void {
  if (!carryable.twin) return;
  const partner = sim.twinArrivals.get(carryable.twin);
  if (partner && sim.elapsed - partner.time <= TWIN.window) {
    const bonus = Math.round((partner.value + carryable.value) * TWIN.bonus);
    sim.stats.treasureValue += bonus;
    sim.stats.bonus.twins++;
    sim.stats.bonus.twinPoints += bonus;
    sim.emit('twin', kiln.x, kiln.z, bonus);
    sim.twinArrivals.delete(carryable.twin);
  } else {
    sim.twinArrivals.set(carryable.twin, { time: sim.elapsed, value: carryable.value });
  }
}

/** A delivery to the Kiln or a beacon: extends the chain if it came soon after the last one. */
function extendChain(sim: Simulation, at: Point): void {
  sim.chain = sim.elapsed - sim.lastDelivery <= CHAIN.window ? sim.chain + 1 : 1;
  sim.lastDelivery = sim.elapsed;
  sim.stats.bestChain = Math.max(sim.stats.bestChain, sim.chain);
  if (sim.chain >= 2) sim.emit('chain', at.x, at.z, sim.chain);
}

/** A kind that has been part of the day but has no Sproutling left, on the field or growing. */
export function extinctKind(sim: Simulation): SproutKind | null {
  for (const kind of SPROUT_KINDS) {
    if (!sim.knownKinds.has(kind) || sim.kiln.queue.includes(kind)) continue;
    let alive = false;
    for (const [, worker] of sim.workers.entries()) {
      if (worker.kind === kind) {
        alive = true;
        break;
      }
    }
    if (!alive) return kind;
  }
  return null;
}

function deliver(sim: Simulation, entity: Entity, carryable: Carryable, to: Destination): void {
  // A seed grows its own kind; anything else grows the kind most of its crew were.
  const crew: Squad = {};
  for (const carrier of carryable.carriers) {
    const kind = sim.workers.require(carrier).kind;
    crew[kind] = (crew[kind] ?? 0) + 1;
  }
  const grows: SproutKind = carryable.seed ?? mostCommon(crew);
  for (const worker of [...carryable.claimed]) {
    setIdle(sim, worker, sim.workers.require(worker));
  }
  if (to.site >= 0) {
    const site = sim.bridges[to.site];
    // The Bridgewright's Kit makes every log count twice.
    site.delivered += sim.abilities.has('bridgekit') ? UPGRADE_EFFECT.logsPerDelivery : 1;
    sim.emit('logPlaced', to.x, to.z, site.needs - site.delivered);
    if (site.delivered >= site.needs) {
      site.built = true;
      sim.removeWall(site.box);
      sim.emit('bridgeBuilt', site.box.x, site.box.z);
    }
  } else if (carryable.kind === 'treasure') {
    sim.stats.treasureValue += carryable.value;
    sim.stats.treasuresCollected.push(carryable.id);
    sim.stats.deliveryTimes.push(sim.elapsed);
    if (carryable.variant === 'dewglass' && !carryable.cracked) {
      sim.stats.bonus.dewglass++;
      sim.stats.bonus.dewglassPoints += carryable.weight * DEWGLASS_BONUS_PER_WEIGHT;
    }
    extendChain(sim, to);
    sim.emit('deliver', to.x, to.z, carryable.value, mostCommon(crew));
    settleTwin(sim, carryable, to);
  } else if (carryable.kind === 'bloom') {
    // Bonus score: it counts towards the total but not towards clearing the lesson.
    sim.stats.treasureValue += carryable.value;
    sim.stats.bloomsCollected++;
    sim.stats.bonus.glowcaps++;
    sim.stats.bonus.glowcapPoints += carryable.value;
    extendChain(sim, to);
    sim.emit('deliver', to.x, to.z, carryable.value, mostCommon(crew));
  } else if (carryable.kind === 'sap') {
    sim.sapTimer = SAP.seconds;
    sim.emit('sap', to.x, to.z, SAP.seconds);
  }
  if (carryable.kind === 'treasure' || carryable.kind === 'carcass' || carryable.kind === 'bloom') {
    sim.stats.weightDelivered += carryable.weight;
  }
  if (to.site < 0) {
    sim.stats.deliveries.push({
      kind: carryable.kind,
      id: carryable.id,
      from: carryable.from,
      weight: carryable.weight,
      time: sim.elapsed,
    });
  }
  // On a fixed-squad trial the Kiln grows nothing.
  if (carryable.workerYield > 0 && sim.growth) {
    // A kind of the day that has died out comes back first, so no job is ever shut for good.
    const lost = extinctKind(sim);
    for (let i = 0; i < carryable.workerYield; i++) {
      sim.kiln.queue.push(i === 0 && lost ? lost : grows);
    }
    sim.hatchAt.x = to.x;
    sim.hatchAt.z = to.z;
    sim.stats.grown += carryable.workerYield;
    sim.emit('grow', to.x, to.z, carryable.workerYield);
  }
  sim.ecs.destroy(entity);
  sim.entityVersion++;
}

function arrangeCarriers(sim: Simulation, carryable: Carryable, at: Transform): void {
  const count = carryable.carriers.length;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const transform = sim.transforms.require(carryable.carriers[i]);
    transform.x = at.x + Math.sin(angle) * (carryable.radius + 0.2);
    transform.z = at.z + Math.cos(angle) * (carryable.radius + 0.2);
    transform.facing = at.facing;
  }
}

/** Dewglass cracks, once, when the crew carrying it breaks up mid-haul. */
function checkCrack(sim: Simulation, carryable: Carryable, at: Transform): void {
  const moving = crewStrength(sim, carryable.carriers) >= carryable.weight;
  if (carryable.moving && !moving && carryable.variant === 'dewglass' && !carryable.cracked) {
    carryable.cracked = true;
    carryable.value -= carryable.weight * DEWGLASS_BONUS_PER_WEIGHT;
    sim.emit('crack', at.x, at.z);
  }
  carryable.moving = moving;
}

/** Moves every sufficiently staffed haul towards its destination and delivers arrivals. */
export function updateCarrying(sim: Simulation, dt: number): void {
  sim.sapTimer = Math.max(0, sim.sapTimer - dt);
  for (const [entity, carryable] of sim.carryables.entries()) {
    const at = sim.transforms.require(entity);
    checkCrack(sim, carryable, at);
    const speed = carrySpeed(sim, carryable);
    if (speed > 0) {
      const to = destinationOf(sim, carryable, at, crewWades(sim, carryable));
      const toX = to.x - at.x;
      const toZ = to.z - at.z;
      const dist = Math.hypot(toX, toZ);
      if (dist <= CARRY.deliverRange) {
        deliver(sim, entity, carryable, to);
        continue;
      }
      let dirX = toX / dist;
      let dirZ = toZ / dist;
      if (!to.nav.lineOfSight(at.x, at.z, to.x, to.z)) {
        const cell = to.nav.cellIndexAt(at.x, at.z);
        dirX = to.field.dirX[cell];
        dirZ = to.field.dirZ[cell];
      }
      moveAgent(to.nav, at, dirX * speed * dt, dirZ * speed * dt);
      at.facing = Math.atan2(dirX, dirZ);
    }
    arrangeCarriers(sim, carryable, at);
  }
}
