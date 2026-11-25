import { AIR, GRASS, WATER } from './blocks';
import { newBody, stepBody, type Body, type Controls, type Size } from './physics';
import type { World } from './world';

export type LocalKind = 'ember' | 'dew' | 'stone' | 'spark';

/** Body colour and crown colour of each kind, as the Academy grows them. */
export const LOCAL_COLOURS: Record<LocalKind, { body: string; crown: string }> = {
  ember: { body: '#e8432d', crown: '#ffb02e' },
  dew: { body: '#3a8ae8', crown: '#9ae0ff' },
  stone: { body: '#8a8a92', crown: '#d8d4c8' },
  spark: { body: '#f2c62a', crown: '#fff27a' },
};
const KINDS: readonly LocalKind[] = ['ember', 'dew', 'stone', 'spark'];

export const LOCAL_SIZE: Size = { half: 0.24, height: 0.72 };

type Mood = 'idle' | 'wander' | 'watch' | 'flee';

/**
 * A Sproutling who lives on the island, squared off like everything else here. They potter about,
 * stop to stare at the Warden, and run off squeaking when poked.
 */
export interface Local {
  kind: LocalKind;
  body: Body;
  /** Which way it faces, as for the camera: 0 looks along -z. */
  yaw: number;
  heading: number;
  mood: Mood;
  /** Seconds left in the current mood. */
  timer: number;
  /** Seconds since it was last poked, for the squash and squeak. */
  poked: number;
  home: { x: number; z: number };
  /** Set on a frame when it bumped into something and wants to hop. */
  hop: boolean;
}

const STILL: Controls = { forward: 0, strafe: 0, jump: false, descend: false, sprint: false };

/** A handful of locals on open turf round the door, each on its own patch. */
export function spawnLocals(world: World, count: number, random: () => number): Local[] {
  const locals: Local[] = [];
  const { spawn } = world;
  for (let tries = 0; tries < count * 40 && locals.length < count; tries++) {
    const angle = random() * Math.PI * 2;
    const reach = 5 + random() * 14;
    const x = Math.floor(spawn.x + Math.cos(angle) * reach);
    const z = Math.floor(spawn.z + Math.sin(angle) * reach);
    if (!world.inside(x, 1, z)) continue;
    const top = world.topAt(x, z);
    if (top < 0 || world.get(x, top, z) !== GRASS || world.get(x, top + 1, z) !== AIR) continue;
    if (locals.some((other) => Math.hypot(other.home.x - x, other.home.z - z) < 3)) continue;
    locals.push({
      kind: KINDS[locals.length % KINDS.length],
      body: newBody(x + 0.5, top + 1, z + 0.5),
      yaw: random() * Math.PI * 2,
      heading: random() * Math.PI * 2,
      mood: 'idle',
      timer: random() * 2,
      poked: 10,
      home: { x: x + 0.5, z: z + 0.5 },
      hop: false,
    });
  }
  return locals;
}

const turnTowards = (from: number, to: number, rate: number): number => {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * Math.min(1, rate);
};

/** Yaw that faces from one point towards another. */
export function yawTowards(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(-(toX - fromX), -(toZ - fromZ));
}

/** Whether the ground ahead is somewhere a local would rather not walk: water or a long drop. */
function badFooting(world: World, local: Local): boolean {
  const ax = Math.floor(local.body.x - Math.sin(local.heading) * 0.7);
  const az = Math.floor(local.body.z - Math.cos(local.heading) * 0.7);
  const y = Math.floor(local.body.y);
  if (world.get(ax, y, az) === WATER || world.get(ax, y - 1, az) === WATER) return true;
  return world.get(ax, y - 1, az) === AIR && world.get(ax, y - 2, az) === AIR;
}

/** One frame of a local's life. */
export function updateLocal(
  world: World,
  local: Local,
  warden: { x: number; z: number },
  dt: number,
  random: () => number,
): void {
  local.timer -= dt;
  local.poked += dt;
  const { body } = local;
  const near = Math.hypot(warden.x - body.x, warden.z - body.z);

  if (local.mood !== 'flee' && near < 3.2) {
    local.mood = 'watch';
    local.timer = Math.max(local.timer, 0.6);
  }
  if (local.timer <= 0) {
    const roll = random();
    if (roll < 0.4) {
      local.mood = 'idle';
      local.timer = 1 + random() * 3;
    } else {
      local.mood = 'wander';
      local.timer = 2 + random() * 4;
      const away = Math.hypot(local.home.x - body.x, local.home.z - body.z);
      // Strays wander back towards home.
      local.heading =
        away > 14 ? yawTowards(body.x, body.z, local.home.x, local.home.z) : random() * Math.PI * 2;
    }
  }

  let forward = 0;
  if (local.mood === 'watch') {
    local.heading = yawTowards(body.x, body.z, warden.x, warden.z);
  } else if (local.mood === 'flee') {
    local.heading = yawTowards(warden.x, warden.z, body.x, body.z);
    forward = 0.75;
  } else if (local.mood === 'wander') {
    forward = 0.38;
  }
  if (forward > 0 && body.onGround && badFooting(world, local)) {
    local.heading += Math.PI * (0.6 + random() * 0.8);
    if (local.mood === 'flee') local.mood = 'wander';
  }
  local.yaw = turnTowards(local.yaw, local.heading, dt * 6);

  const controls: Controls = {
    ...STILL,
    forward: forward * Math.max(0, Math.cos(local.yaw - local.heading)),
    jump: local.hop || body.inWater,
  };
  local.hop = stepBody(world, body, controls, local.yaw, dt, LOCAL_SIZE) && body.onGround;
}

/** The Warden poked it: a squeak, a jump, and away. */
export function poke(local: Local): void {
  local.poked = 0;
  local.mood = 'flee';
  local.timer = 1.6;
  if (local.body.onGround) local.body.vy = 6.5;
}

/** How far along a ray a local's box is, or null if the ray misses it. */
export function rayHitsLocal(
  local: Local,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  reach: number,
): number | null {
  const { body } = local;
  const min = [body.x - LOCAL_SIZE.half, body.y, body.z - LOCAL_SIZE.half];
  const max = [body.x + LOCAL_SIZE.half, body.y + LOCAL_SIZE.height, body.z + LOCAL_SIZE.half];
  const origin = [ox, oy, oz];
  const dir = [dx, dy, dz];
  let near = 0;
  let far = reach;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(dir[axis]) < 1e-9) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
      continue;
    }
    let t0 = (min[axis] - origin[axis]) / dir[axis];
    let t1 = (max[axis] - origin[axis]) / dir[axis];
    if (t0 > t1) [t0, t1] = [t1, t0];
    near = Math.max(near, t0);
    far = Math.min(far, t1);
    if (near > far) return null;
  }
  return near;
}
