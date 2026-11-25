import { WATER } from './blocks';
import { WATER_TOP, type World } from './world';

/** Something that walks about the island: the Warden, or one of the locals. */
export interface Body {
  /** The middle of its feet. */
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  onGround: boolean;
  /** Waist deep or more. */
  inWater: boolean;
  flying: boolean;
}

export interface Size {
  /** Half the width of its square footprint. */
  half: number;
  height: number;
}

export const WARDEN_SIZE: Size = { half: 0.3, height: 1.8 };
/** Eye height above the feet. The same as the Warden's seat at the card table. */
export const EYE_HEIGHT = 1.62;

/** What the body is asked to do this frame. Forward and strafe run -1 to 1. */
export interface Controls {
  forward: number;
  strafe: number;
  jump: boolean;
  descend: boolean;
  sprint: boolean;
}

export const MOVE = {
  walk: 4.3,
  sprint: 6.4,
  swim: 2.6,
  fly: 10,
  gravity: 28,
  /** Enough to clear one block with a little to spare. */
  jump: 8.7,
  /** How quickly the body reaches the speed it wants, per second, on the ground and in the air. */
  grip: 14,
  airGrip: 6,
  waterGrip: 5,
} as const;

const EPSILON = 1e-4;
/** Longest move checked in one go, so nothing tunnels through a block. */
const MAX_STEP = 0.4;

export function newBody(x: number, y: number, z: number): Body {
  return { x, y, z, vx: 0, vy: 0, vz: 0, onGround: false, inWater: false, flying: false };
}

/** Whether a body standing at (x, y, z) overlaps anything solid. */
export function collides(world: World, x: number, y: number, z: number, size: Size): boolean {
  const x0 = Math.floor(x - size.half);
  const x1 = Math.floor(x + size.half);
  const y0 = Math.floor(y);
  const y1 = Math.floor(y + size.height);
  const z0 = Math.floor(z - size.half);
  const z1 = Math.floor(z + size.half);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) if (world.solidAt(cx, cy, cz)) return true;
    }
  }
  return false;
}

/** Whether a cell overlaps the body, so a block put there would trap it. */
export function overlapsCell(body: Body, size: Size, x: number, y: number, z: number): boolean {
  return (
    x + 1 > body.x - size.half &&
    x < body.x + size.half &&
    z + 1 > body.z - size.half &&
    z < body.z + size.half &&
    y + 1 > body.y &&
    y < body.y + size.height
  );
}

/** Whether a point is under water, counting the low surface of the top water cell. */
export function underWater(world: World, x: number, y: number, z: number): boolean {
  const cy = Math.floor(y);
  if (world.get(Math.floor(x), cy, Math.floor(z)) !== WATER) return false;
  if (world.get(Math.floor(x), cy + 1, Math.floor(z)) === WATER) return true;
  return y - cy < WATER_TOP;
}

const approach = (value: number, target: number, rate: number, dt: number): number =>
  value + (target - value) * Math.min(1, rate * dt);

/**
 * Moves a body for one frame: walking, jumping, swimming or flying, then sliding along whatever
 * it runs into, one axis at a time. Returns true if it ran into a wall sideways.
 */
export function stepBody(
  world: World,
  body: Body,
  controls: Controls,
  yaw: number,
  dt: number,
  size: Size = WARDEN_SIZE,
): boolean {
  body.inWater = underWater(world, body.x, body.y + 0.45, body.z);
  const speed = body.flying
    ? MOVE.fly
    : body.inWater
      ? MOVE.swim
      : controls.sprint
        ? MOVE.sprint
        : MOVE.walk;
  // Forward is along -z at no yaw, as for the camera.
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  let wishX = fx * controls.forward + Math.cos(yaw) * controls.strafe;
  let wishZ = fz * controls.forward - Math.sin(yaw) * controls.strafe;
  const length = Math.hypot(wishX, wishZ);
  if (length > 1) {
    wishX /= length;
    wishZ /= length;
  }
  const grip = body.flying
    ? MOVE.grip * 0.6
    : body.inWater
      ? MOVE.waterGrip
      : body.onGround
        ? MOVE.grip
        : MOVE.airGrip;
  body.vx = approach(body.vx, wishX * speed, grip, dt);
  body.vz = approach(body.vz, wishZ * speed, grip, dt);

  if (body.flying) {
    const lift = (controls.jump ? 1 : 0) - (controls.descend ? 1 : 0);
    body.vy = approach(body.vy, lift * MOVE.fly * 0.7, MOVE.grip, dt);
  } else if (body.inWater) {
    body.vy -= MOVE.gravity * 0.12 * dt;
    body.vy *= Math.max(0, 1 - 2.5 * dt);
    if (controls.jump) body.vy = approach(body.vy, 3.4, 8, dt);
    body.vy = Math.max(body.vy, -3.5);
  } else {
    body.vy -= MOVE.gravity * dt;
    if (controls.jump && body.onGround) body.vy = MOVE.jump;
    body.vy = Math.max(body.vy, -40);
  }

  const travel = Math.max(Math.abs(body.vx), Math.abs(body.vy), Math.abs(body.vz)) * dt;
  const steps = Math.max(1, Math.ceil(travel / MAX_STEP));
  const h = dt / steps;
  let wall = false;
  body.onGround = false;
  for (let i = 0; i < steps; i++) {
    body.y += body.vy * h;
    if (collides(world, body.x, body.y, body.z, size)) {
      if (body.vy < 0) {
        body.y = Math.floor(body.y) + 1;
        body.onGround = true;
      } else {
        body.y = Math.floor(body.y + size.height) - size.height - EPSILON;
      }
      body.vy = 0;
    }
    body.x += body.vx * h;
    if (collides(world, body.x, body.y, body.z, size)) {
      body.x =
        body.vx > 0
          ? Math.floor(body.x + size.half) - size.half - EPSILON
          : Math.floor(body.x - size.half) + 1 + size.half + EPSILON;
      body.vx = 0;
      wall = true;
    }
    body.z += body.vz * h;
    if (collides(world, body.x, body.y, body.z, size)) {
      body.z =
        body.vz > 0
          ? Math.floor(body.z + size.half) - size.half - EPSILON
          : Math.floor(body.z - size.half) + 1 + size.half + EPSILON;
      body.vz = 0;
      wall = true;
    }
  }
  // Swimming into a bank with jump held climbs out of the water.
  if (wall && body.inWater && controls.jump) body.vy = Math.max(body.vy, 6.2);
  // Landing on the ground ends a flight.
  if (body.flying && body.onGround && controls.descend) body.flying = false;
  return wall;
}
