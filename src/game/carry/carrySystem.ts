import { CARRY } from '../core/config';
import type { Entity } from '../core/ecs';
import { moveAgent } from '../navigation/steering';
import type { Carryable, Transform } from '../simulation/components';
import type { Simulation } from '../simulation/Simulation';
import { setIdle } from '../workers/squad';

/** Travel speed of a haul: nothing below its weight, faster with every extra carrier. */
export function carrySpeed(carryable: Carryable): number {
  const count = carryable.carriers.length;
  if (count < carryable.weight) return 0;
  const spare = carryable.maxCarriers - carryable.weight;
  const extra = spare > 0 ? (count - carryable.weight) / spare : 0;
  return CARRY.baseSpeed + CARRY.bonusSpeed * extra;
}

function deliver(sim: Simulation, entity: Entity, carryable: Carryable): void {
  for (const worker of [...carryable.claimed]) {
    setIdle(sim, worker, sim.workers.require(worker));
  }
  if (carryable.kind === 'treasure') {
    sim.stats.treasureValue += carryable.value;
    sim.stats.treasuresCollected.push(carryable.id);
  }
  sim.kiln.queue += carryable.workerYield;
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

/** Moves every sufficiently staffed haul along the Kiln flow field and delivers arrivals. */
export function updateCarrying(sim: Simulation, dt: number): void {
  const { kiln } = sim.level;
  for (const [entity, carryable] of sim.carryables.entries()) {
    const at = sim.transforms.require(entity);
    const speed = carrySpeed(carryable);
    if (speed > 0) {
      const toKilnX = kiln.x - at.x;
      const toKilnZ = kiln.z - at.z;
      const dist = Math.hypot(toKilnX, toKilnZ);
      if (dist <= CARRY.deliverRange) {
        deliver(sim, entity, carryable);
        continue;
      }
      let dirX = toKilnX / dist;
      let dirZ = toKilnZ / dist;
      if (!sim.nav.lineOfSight(at.x, at.z, kiln.x, kiln.z)) {
        const cell = sim.nav.cellIndexAt(at.x, at.z);
        dirX = sim.kilnField.dirX[cell];
        dirZ = sim.kilnField.dirZ[cell];
      }
      moveAgent(sim.nav, at, dirX * speed * dt, dirZ * speed * dt);
      at.facing = Math.atan2(dirX, dirZ);
    }
    arrangeCarriers(sim, carryable, at);
  }
}
