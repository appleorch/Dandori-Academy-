import type { InputState } from '../commands/input';
import { THROW } from '../core/config';
import type { Entity } from '../core/ecs';
import { NO_ENTITY } from '../core/ecs';
import type { Simulation } from '../simulation/Simulation';
import { SPROUT_KINDS, type SproutKind } from '../workers/sprouts';

/** The kinds of Sproutling in the squad right now, ready to throw. */
function readyKinds(sim: Simulation): Set<SproutKind> {
  const kinds = new Set<SproutKind>();
  for (const [, worker] of sim.workers.entries()) {
    if (worker.state === 'follow' && worker.stun <= 0) kinds.add(worker.kind);
  }
  return kinds;
}

/**
 * The next kind after `from` in table order (or before it, going back) that is in `kinds`;
 * `from` itself if none is.
 */
function nextKind(from: SproutKind, kinds: Set<SproutKind>, direction: 1 | -1 = 1): SproutKind {
  const start = SPROUT_KINDS.indexOf(from);
  const count = SPROUT_KINDS.length;
  for (let step = 1; step <= count; step++) {
    const kind = SPROUT_KINDS[(((start + step * direction) % count) + count) % count];
    if (kinds.has(kind)) return kind;
  }
  return from;
}

/**
 * Chooses which kind of Sproutling the Warden throws: a key picks one, the cycle buttons step
 * to the next or the previous, and when the chosen kind runs out of the squad the next one present takes over.
 */
export function updateSelection(sim: Simulation, input: InputState): void {
  const kinds = readyKinds(sim);
  const before = sim.selected;
  if (input.selectKind && kinds.has(input.selectKind)) sim.selected = input.selectKind;
  else if (input.cycleKind) sim.selected = nextKind(sim.selected, kinds);
  else if (input.cycleBack) sim.selected = nextKind(sim.selected, kinds, -1);
  else if (!kinds.has(sim.selected) && kinds.size > 0) {
    sim.selected = nextKind(sim.selected, kinds);
    if (input.throwHeld) sim.captainState.throwLatched = true;
  }
  if (sim.selected !== before && (input.selectKind || input.cycleKind || input.cycleBack)) {
    const { x, z } = sim.captainTransform;
    sim.emit('select', x, z, 1 + SPROUT_KINDS.indexOf(sim.selected) * 0.12);
  }
}

/** While throw is held, launches the squad member of the chosen kind nearest the captain at the cursor. */
export function updateThrowing(sim: Simulation, input: InputState, dt: number): void {
  const state = sim.captainState;
  state.throwCooldown = Math.max(0, state.throwCooldown - dt);
  if (!input.throwHeld) state.throwLatched = false;
  if (!input.throwHeld || input.whistleHeld || state.throwCooldown > 0 || state.throwLatched)
    return;

  const from = sim.captainTransform;
  let chosen: Entity = NO_ENTITY;
  let chosenDist: number = THROW.pickupRange;
  for (const [entity, worker] of sim.workers.entries()) {
    if (worker.state !== 'follow' || worker.stun > 0 || worker.kind !== sim.selected) continue;
    const at = sim.transforms.require(entity);
    const dist = Math.hypot(at.x - from.x, at.z - from.z);
    if (dist < chosenDist) {
      chosen = entity;
      chosenDist = dist;
    }
  }
  if (chosen === NO_ENTITY) return;

  const worker = sim.workers.require(chosen);
  // Aim assist: a throw aimed near an enemy goes for the enemy itself.
  let aimX = sim.cursor.x;
  let aimZ = sim.cursor.z;
  let lockDist: number = THROW.aimAssist;
  for (const [entity, enemy] of sim.enemies.entries()) {
    // Gates are aimed at like ground, so a throw can still clear one.
    if (enemy.shape) continue;
    const at = sim.transforms.require(entity);
    const dist = Math.hypot(at.x - sim.cursor.x, at.z - sim.cursor.z) - enemy.radius;
    if (enemy.hp > 0 && dist < lockDist) {
      lockDist = dist;
      aimX = at.x;
      aimZ = at.z;
    }
  }
  // A little scatter keeps a volley from landing on a single point. Water is somewhere a
  // Sproutling can land: a Dewling wades, anything else flounders until whistled out.
  const landing = sim.wadeNav.nearestWalkable(
    aimX + sim.rng.range(-THROW.scatter, THROW.scatter),
    aimZ + sim.rng.range(-THROW.scatter, THROW.scatter),
  );
  worker.state = 'thrown';
  worker.throwFromX = from.x;
  worker.throwFromZ = from.z;
  worker.throwToX = landing.x;
  worker.throwToZ = landing.z;
  worker.throwTime = 0;
  worker.throwDuration = Math.max(
    THROW.minDuration,
    Math.hypot(landing.x - from.x, landing.z - from.z) / THROW.speed,
  );
  from.facing = Math.atan2(landing.x - from.x, landing.z - from.z);
  state.throwCooldown = THROW.cooldown;
  sim.emit('throw', from.x, from.z, 0, worker.kind);
}
