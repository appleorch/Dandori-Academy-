import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  Color,
  LatheGeometry,
  Matrix4,
  Object3D,
  Vector2,
  type InstancedMesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three';
import { WORKER } from '../core/config';
import { useGameStore } from '../core/gameStore';
import type { Entity } from '../core/ecs';
import type { Worker, WorkerState } from '../simulation/components';
import { SPROUT_KINDS, stageOf, type SproutKind } from '../workers/sprouts';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';
import { butterflySpots } from './Butterflies';
import { inDanger } from './danger';
import { PALETTE_SETS } from './palette';
import { crownGeometries } from './sproutCrowns';
import { gameTextures } from './textures';

/*
 * The Emberlings. Each is a small rig of parts, every part one instanced mesh, so a full
 * field of a hundred costs about fifteen draw calls:
 *
 *   body ─┬─ eyes, pupils
 *         ├─ legs ── feet       (pedal with speed)
 *         ├─ arms               (swing, lift a haul, flail on an enemy)
 *         ├─ basket, basket rim (woven, on the back)
 *         ├─ cap                (Stonelings: a square cap on the head)
 *         └─ stalk ─┬─ leaves   (on a damped spring: they lag and bob)
 *                   └─ crown    (flame tuft, droplet or zig-zag bolt, by kind)
 *
 * Animation is driven from what the simulation says each worker is doing, plus a little
 * remembered state per worker (speed, turn, spring, landing) kept here, never in the sim.
 */

const BODY_PROFILE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.19, 0.03],
  [0.27, 0.18],
  [0.26, 0.36],
  [0.18, 0.56],
  [0.08, 0.68],
  [0, 0.71],
];
const BASKET_PROFILE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.1, 0],
  [0.13, 0.04],
  [0.15, 0.2],
  [0.155, 0.22],
];
/** Each kind's colours, from the player's palette (see palette.ts). */
interface KindTints {
  /** Body while in the squad, while working, and while idle (paler). */
  bodies: readonly [Color, Color, Color];
  /** The head ornament, lit (working or in the squad) and cold (idle). */
  crowns: readonly [Color, Color];
}
type Tints = Record<SproutKind, KindTints>;

function tintsFor(palette: keyof typeof PALETTE_SETS): Tints {
  const set = PALETTE_SETS[palette].kinds;
  const tints = {} as Tints;
  for (const kind of SPROUT_KINDS) {
    const c = set[kind];
    tints[kind] = {
      bodies: [new Color(c.body), new Color(c.work), new Color(c.idle)],
      crowns: [new Color(c.crown), new Color(c.crownCold)],
    };
  }
  return tints;
}
/**
 * How each kind's crown sits: on the stalk's tip or flat on the head (the Stoneling's cap),
 * how high, its scale, and how fast it turns.
 */
const CROWN_SHAPE: Record<
  SproutKind,
  { on: 'stalk' | 'head'; y: number; size: number; spin: number; glow: number }
> = {
  ember: { on: 'stalk', y: 0.13, size: 1.35, spin: 1.5, glow: 1.8 },
  dew: { on: 'stalk', y: 0.12, size: 1.2, spin: 1, glow: 1.9 },
  stone: { on: 'head', y: 0.66, size: 1.05, spin: 0, glow: 1.3 },
  spark: { on: 'stalk', y: 0.13, size: 1.45, spin: 0, glow: 1.6 },
};
/** Stonelings are a size bigger. */
const BULK: Record<SproutKind, number> = { ember: 1, dew: 1, stone: 1.18, spark: 0.95 };
const FIRE = new Color('#ff7a1a');
const EYE_WHITE = new Color('#fff8ec');
/** A grown Sproutling's head: a closed pink bud, then a flower in a shade of its kind. */
const BUD = new Color('#e98fae');
const BLOOM_PETAL: Record<SproutKind, Color> = {
  ember: new Color('#ffd8c8'),
  dew: new Color('#dcecff'),
  stone: new Color('#f4ecdc'),
  spark: new Color('#fff4c0'),
};
const DANGER = new Color('#ffffff');
const dummy = new Object3D();
const part = new Matrix4();
const flame = new Color();
const tint = new Color();

const MAX = WORKER.maxOnField;
const TRAIL = 6;
const SWEAT = 80;
const EYES = [-0.09, 0.09] as const;
const EYE_HEIGHT = 0.46;
const EYE_FORWARD = 0.22;
/** Radians of gait per unit walked. */
const STRIDE = 3.4;
/** Head-sprout spring: stiffness, damping, and how hard body acceleration throws it. */
const SPRING_K = 90;
const SPRING_D = 9;
const SPRING_PUSH = 0.022;
const LAND_SECONDS = 0.32;
const LEAP_SECONDS = 0.45;
const CHAT_RANGE = 1.4;

interface Anim {
  x: number;
  z: number;
  speed: number;
  /** Smoothed heading for drawing, and how fast it is turning. */
  facing: number;
  turn: number;
  phase: number;
  /** Head-sprout spring offset and velocity, in the body's frame. */
  sx: number;
  sz: number;
  svx: number;
  svz: number;
  vx: number;
  vz: number;
  state: WorkerState;
  land: number;
  leap: number;
  /** Idle behaviour: where it is glancing, and when it next changes its mind. */
  glance: number;
  glanceTimer: number;
  hop: number;
  chatWith: number;
  /** Idle fidgets: seconds left sitting down, and of a cheer when a haul came home. */
  sit: number;
  cheer: number;
  trail: { x: number; y: number; z: number }[];
}

interface Drop {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

function bodyColor(state: WorkerState, kind: SproutKind, tints: Tints): Color {
  const [squad, working, idle] = tints[kind].bodies;
  if (state === 'follow' || state === 'thrown' || state === 'rush') return squad;
  return state === 'idle' ? idle : working;
}

function newAnim(x: number, z: number, facing: number, state: WorkerState): Anim {
  return {
    x,
    z,
    speed: 0,
    facing,
    turn: 0,
    phase: Math.random() * 6,
    sx: 0,
    sz: 0,
    svx: 0,
    svz: 0,
    vx: 0,
    vz: 0,
    state,
    land: 0,
    leap: 0,
    glance: 0,
    glanceTimer: Math.random() * 3,
    hop: 0,
    chatWith: -1,
    sit: 0,
    cheer: 0,
    trail: [],
  };
}

/** Shortest signed difference between two angles. */
function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** Where a thrown worker is drawn: its arc, lifted by the ground at both ends of the throw. */
function flightLift(sim: Simulation, worker: Worker): number {
  const u = Math.min(1, worker.throwTime / Math.max(0.01, worker.throwDuration));
  const from = heightAt(sim.level, worker.throwFromX, worker.throwFromZ);
  const to = heightAt(sim.level, worker.throwToX, worker.throwToZ);
  return from + (to - from) * u;
}

/** Emberlings, drawn and animated. */
export function WorkerInstances({ sim }: { sim: Simulation }) {
  const refs = {
    body: useRef<InstancedMesh>(null),
    ember: useRef<InstancedMesh>(null),
    droplet: useRef<InstancedMesh>(null),
    pebble: useRef<InstancedMesh>(null),
    spark: useRef<InstancedMesh>(null),
    blaze: useRef<InstancedMesh>(null),
    stalk: useRef<InstancedMesh>(null),
    leaf: useRef<InstancedMesh>(null),
    eye: useRef<InstancedMesh>(null),
    pupil: useRef<InstancedMesh>(null),
    blob: useRef<InstancedMesh>(null),
    arm: useRef<InstancedMesh>(null),
    leg: useRef<InstancedMesh>(null),
    foot: useRef<InstancedMesh>(null),
    basket: useRef<InstancedMesh>(null),
    rim: useRef<InstancedMesh>(null),
    star: useRef<InstancedMesh>(null),
    ribbon: useRef<InstancedMesh>(null),
    sweat: useRef<InstancedMesh>(null),
    flower: useRef<InstancedMesh>(null),
  };
  const lastHome = useRef(0);
  const anims = useRef(new Map<Entity, Anim>());
  const drops = useRef<Drop[]>([]);
  const geometries = useMemo(
    () => ({
      body: new LatheGeometry(
        BODY_PROFILE.map(([x, y]) => new Vector2(x, y)),
        16,
      ),
      basket: new LatheGeometry(
        BASKET_PROFILE.map(([x, y]) => new Vector2(x, y)),
        12,
      ),
    }),
    [],
  );
  const weave = gameTextures().weave;
  const crownShapes = useMemo(() => crownGeometries(), []);
  const palette = useGameStore((state) => state.settings.palette);
  const tints = useMemo(() => tintsFor(palette), [palette]);

  useFrame(({ clock }, frameDelta) => {
    const m = {
      body: refs.body.current,
      ember: refs.ember.current,
      droplet: refs.droplet.current,
      pebble: refs.pebble.current,
      spark: refs.spark.current,
      blaze: refs.blaze.current,
      stalk: refs.stalk.current,
      leaf: refs.leaf.current,
      eye: refs.eye.current,
      pupil: refs.pupil.current,
      blob: refs.blob.current,
      arm: refs.arm.current,
      leg: refs.leg.current,
      foot: refs.foot.current,
      basket: refs.basket.current,
      rim: refs.rim.current,
      star: refs.star.current,
      ribbon: refs.ribbon.current,
      sweat: refs.sweat.current,
      flower: refs.flower.current,
    };
    if (Object.values(m).some((mesh) => !mesh)) return;
    const mesh = m as { [K in keyof typeof m]: InstancedMesh };
    // Its colours must exist before the first flower is drawn, or the shader is built without them.
    if (!mesh.flower.instanceColor) {
      mesh.flower.setColorAt(0, BUD);
      (mesh.flower.material as MeshStandardMaterial).needsUpdate = true;
    }
    const dt = Math.min(0.05, Math.max(0.001, frameDelta));
    const time = clock.elapsedTime;
    const seen = new Set<Entity>();
    let index = 0;
    let stars = 0;
    let ribbons = 0;
    // Each kind's crown is its own instanced mesh, filled in its own order.
    const crowns: Record<SproutKind, number> = { ember: 0, dew: 0, stone: 0, spark: 0 };
    let blazes = 0;
    let flowers = 0;
    // A haul just came home: everyone idle near the Kiln cheers.
    const homeValue = sim.stats.treasureValue + sim.stats.bloomsCollected;
    const cheering = homeValue !== lastHome.current;
    lastHome.current = homeValue;
    // Beasts on the hunt make idle Sproutlings near them cower.
    const hunters: { x: number; z: number }[] = [];
    for (const [foe, enemy] of sim.enemies.entries()) {
      if (enemy.alert && enemy.hp > 0 && !enemy.shape) hunters.push(sim.transforms.require(foe));
    }

    // Idle Emberlings near each other strike up a conversation; found once per frame.
    const idle: { entity: Entity; x: number; z: number }[] = [];
    for (const [entity, worker] of sim.workers.entries()) {
      if (worker.state === 'idle' && worker.stun <= 0) {
        const at = sim.transforms.require(entity);
        idle.push({ entity, x: at.x, z: at.z });
      }
    }

    for (const [entity, worker] of sim.workers.entries()) {
      const at = sim.transforms.require(entity);
      seen.add(entity);
      let anim = anims.current.get(entity);
      if (!anim) {
        anim = newAnim(at.x, at.z, at.facing, worker.state);
        anims.current.set(entity, anim);
      }
      const { state } = worker;
      const dazed = worker.stun > 0;

      // Motion: speed and acceleration from how far it moved since the last frame.
      const vx = (at.x - anim.x) / dt;
      const vz = (at.z - anim.z) / dt;
      const teleport = Math.hypot(at.x - anim.x, at.z - anim.z) > 2;
      const ax = teleport ? 0 : (vx - anim.vx) / dt;
      const az = teleport ? 0 : (vz - anim.vz) / dt;
      anim.vx = teleport ? 0 : vx;
      anim.vz = teleport ? 0 : vz;
      const speed = teleport ? 0 : Math.hypot(vx, vz);
      anim.speed += (speed - anim.speed) * Math.min(1, dt * 12);
      anim.x = at.x;
      anim.z = at.z;
      anim.phase += anim.speed * dt * STRIDE;

      // Heading eases round instead of snapping, and how fast it turns tilts the body.
      let target = at.facing;
      if (
        state === 'idle' &&
        cheering &&
        Math.hypot(at.x - sim.level.kiln.x, at.z - sim.level.kiln.z) < 9
      )
        anim.cheer = 1.2;
      anim.cheer = Math.max(0, anim.cheer - dt);
      anim.sit = state === 'idle' ? Math.max(0, anim.sit - dt) : 0;
      if (state === 'idle' && !dazed) {
        anim.glanceTimer -= dt;
        if (anim.glanceTimer <= 0) {
          anim.glanceTimer = 1.5 + Math.random() * 3;
          anim.glance = (Math.random() - 0.5) * 1.8;
          const roll = Math.random();
          // Now and then, a little hop for no reason at all, or a sit down for a rest.
          if (roll < 0.3) anim.hop = 0.35;
          else if (roll < 0.42) anim.sit = 2 + Math.random() * 3;
          // A butterfly close by: off after it, hopping.
          const butterfly = butterflySpots.find(
            (fly) => Math.hypot(fly.x - at.x, fly.z - at.z) < 3,
          );
          if (butterfly) {
            anim.glance = angleDelta(at.facing, Math.atan2(butterfly.x - at.x, butterfly.z - at.z));
            anim.hop = 0.35;
            anim.sit = 0;
            anim.glanceTimer = 0.5;
          }
          // A wave (a hop, facing the Warden) when the Warden is close.
          const warden = sim.captainTransform;
          if (roll > 0.8 && Math.hypot(warden.x - at.x, warden.z - at.z) < 5) {
            anim.glance = angleDelta(at.facing, Math.atan2(warden.x - at.x, warden.z - at.z));
            anim.hop = 0.35;
          }
          // Find someone to talk to.
          anim.chatWith = -1;
          for (const other of idle) {
            if (other.entity === entity) continue;
            if (Math.hypot(other.x - at.x, other.z - at.z) < CHAT_RANGE) {
              anim.chatWith = other.entity;
              break;
            }
          }
        }
        const friend = anim.chatWith >= 0 ? sim.transforms.get(anim.chatWith) : undefined;
        target = friend ? Math.atan2(friend.x - at.x, friend.z - at.z) : at.facing + anim.glance;
      }
      const turnBy = angleDelta(anim.facing, target);
      const turnStep = turnBy * Math.min(1, dt * 10);
      anim.facing += turnStep;
      anim.turn += (turnStep / dt - anim.turn) * Math.min(1, dt * 8);

      // Spring on the head-sprout, pushed by acceleration in the body's own frame.
      const cos = Math.cos(anim.facing);
      const sin = Math.sin(anim.facing);
      const forward = ax * sin + az * cos;
      const side = ax * cos - az * sin;
      anim.svx += (-SPRING_K * anim.sx - SPRING_D * anim.svx - forward * SPRING_PUSH) * dt;
      anim.svz += (-SPRING_K * anim.sz - SPRING_D * anim.svz + side * SPRING_PUSH) * dt;
      anim.sx = Math.max(-0.7, Math.min(0.7, anim.sx + anim.svx * dt));
      anim.sz = Math.max(-0.7, Math.min(0.7, anim.sz + anim.svz * dt));

      // Landing: the frame a throw ends, a squash begins. Plucked from the ground: the same pop.
      if (
        (anim.state === 'thrown' || anim.state === 'planted') &&
        state !== anim.state &&
        state !== 'thrown'
      )
        anim.land = LAND_SECONDS;
      if (state === 'thrown' && anim.state !== 'thrown') anim.trail.length = 0;
      anim.state = state;
      anim.land = Math.max(0, anim.land - dt);
      anim.hop = Math.max(0, anim.hop - dt);

      // A worker standing where an attack is about to land panics: wide eyes and a leap back.
      const threatened = state !== 'thrown' && state !== 'attacking' && inDanger(sim, at.x, at.z);
      if (threatened && anim.leap <= 0) anim.leap = LEAP_SECONDS;
      anim.leap = Math.max(0, anim.leap - dt);

      // ---- Body pose ----
      const ground = state === 'thrown' ? flightLift(sim, worker) : heightAt(sim.level, at.x, at.z);
      const moving = anim.speed > 0.4 && state !== 'thrown';
      const gait = Math.min(1, anim.speed / 6);
      let lift = 0;
      let pitch = 0;
      let roll = 0;
      let squashY = 1;
      let squashXZ = 1;
      let backstep = 0;
      if (state === 'thrown') {
        // A forward flip through the air.
        pitch = worker.throwTime * 13;
      } else if (worker.peril === 'water') {
        // Out of its depth: bobbing, arms up, half under.
        lift = -0.3 + Math.sin(time * 7 + entity) * 0.08;
        pitch = -0.2;
      } else if (dazed) {
        pitch = 1.45;
        lift = 0.2;
      } else if (state === 'planted') {
        // In the ground up to its head-sprout, swaying a little, waiting to be plucked.
        lift = -0.5;
        pitch = Math.sin(time * 1.6 + entity) * 0.06;
      } else {
        if (moving) {
          lift = Math.abs(Math.sin(anim.phase)) * 0.07 * gait;
          pitch = 0.08 + 0.18 * gait;
          roll = Math.max(-0.35, Math.min(0.35, -anim.turn * 0.06 * gait));
        }
        if (state === 'carrying') {
          // The whole crew heaves on the same beat: the beat belongs to the haul.
          const heave = Math.abs(Math.sin(time * 5.5 + worker.target * 1.7));
          squashY = 1 - heave * 0.08;
          squashXZ = 1 + heave * 0.05;
          pitch = 0.2;
        } else if (state === 'attacking') {
          lift = Math.abs(Math.sin(time * 30 + entity)) * 0.06;
        } else if (state === 'idle') {
          const chatting = anim.chatWith >= 0;
          lift = anim.hop > 0 ? Math.sin((anim.hop / 0.35) * Math.PI) * 0.22 : 0;
          if (chatting) squashY = 1 + Math.sin(time * 9 + entity) * 0.05;
          else lift += Math.abs(Math.sin(time * 2.5 + entity)) * 0.02;
          if (anim.sit > 0) {
            squashY *= 0.8;
            squashXZ *= 1.08;
            pitch = -0.18;
          }
          if (anim.cheer > 0) lift += Math.abs(Math.sin(anim.cheer * 9)) * 0.25;
          if (hunters.some((foe) => Math.hypot(foe.x - at.x, foe.z - at.z) < 6)) {
            // Cowering: low, small, leaning away.
            squashY *= 0.78;
            squashXZ *= 1.1;
            pitch = -0.35;
          }
        }
      }
      if (anim.land > 0) {
        const k = anim.land / LAND_SECONDS;
        // Squash on impact, a little overshoot on the way back.
        const s = Math.sin(k * Math.PI) * k;
        squashY = 1 - s * 0.45;
        squashXZ = 1 + s * 0.3;
      }
      if (anim.leap > 0) {
        const k = 1 - anim.leap / LEAP_SECONDS;
        lift += Math.sin(k * Math.PI) * 0.35;
        backstep = Math.sin(k * Math.PI) * 0.25;
        pitch = -0.3;
      }
      const yaw = anim.facing;
      dummy.position.set(
        at.x - Math.sin(yaw) * backstep,
        at.y + ground + lift,
        at.z - Math.cos(yaw) * backstep,
      );
      dummy.rotation.set(pitch, yaw, roll, 'YXZ');
      const bulk = BULK[worker.kind];
      dummy.scale.set(squashXZ * bulk, squashY * bulk, squashXZ * bulk);
      dummy.updateMatrix();
      const body = dummy.matrix.clone();
      mesh.body.setMatrixAt(index, body);
      const color =
        worker.peril === 'fire' && Math.sin(time * 20) > 0
          ? FIRE
          : bodyColor(state, worker.kind, tints);
      mesh.body.setColorAt(
        index,
        threatened && Math.sin(time * 30) > 0 ? tint.copy(color).lerp(DANGER, 0.7) : color,
      );

      const place = (
        target: InstancedMesh,
        slot: number,
        x: number,
        y: number,
        z: number,
        rx: number,
        ry: number,
        rz: number,
        sx = 1,
        sy = 1,
        sz = 1,
        parent = body,
      ): Matrix4 => {
        dummy.position.set(x, y, z);
        dummy.rotation.set(rx, ry, rz);
        dummy.scale.set(sx, sy, sz);
        dummy.updateMatrix();
        part.multiplyMatrices(parent, dummy.matrix);
        target.setMatrixAt(slot, part);
        return part.clone();
      };

      // ---- Legs and feet: they pedal with speed, tuck up in flight ----
      for (let s = 0; s < 2; s++) {
        const sign = s === 0 ? -1 : 1;
        let swing = 0;
        if (state === 'thrown') swing = -0.9;
        else if (moving) swing = Math.sin(anim.phase + s * Math.PI) * 0.9 * gait;
        else if (state === 'carrying')
          swing = Math.sin(time * 5.5 + worker.target * 1.7 + s * Math.PI) * 0.25;
        const hip = place(mesh.leg, index * 2 + s, sign * 0.1, 0.13, 0, swing, 0, 0);
        place(mesh.foot, index * 2 + s, 0, -0.12, 0.05, -swing * 0.5, 0, 0, 1, 1, 1, hip);
      }

      // ---- Arms ----
      for (let s = 0; s < 2; s++) {
        const sign = s === 0 ? -1 : 1;
        let raise = 0.2;
        let spread = 0.35;
        if (state === 'carrying') {
          raise = -2.7 + Math.sin(time * 5.5 + worker.target * 1.7) * 0.15;
        } else if (state === 'attacking') {
          raise = -1.6 + Math.sin(time * 30 + entity + s * 2) * 0.9;
        } else if (state === 'thrown') {
          raise = -2.9;
          spread = 0.9;
        } else if (anim.leap > 0) {
          raise = -2.4;
          spread = 1.1;
        } else if (moving) {
          raise = -Math.sin(anim.phase + s * Math.PI) * 0.7 * gait;
        } else if (anim.chatWith >= 0 && s === 1) {
          // Gesturing while it talks.
          raise = -1.2 + Math.sin(time * 7 + entity) * 0.5;
        }
        place(mesh.arm, index * 2 + s, sign * 0.24, 0.36, 0.02, raise, 0, sign * spread);
        mesh.arm.setColorAt(index * 2 + s, color);
      }

      // ---- Basket on its back ----
      place(mesh.basket, index, 0, 0.22, -0.2, -0.25, 0, 0);
      place(mesh.rim, index, 0, 0.44, -0.255, -0.25 + Math.PI / 2, 0, 0);

      // ---- Head-sprout on its spring, with leaves and the ember ----
      const sway = moving
        ? Math.sin(anim.phase * 2) * 0.05 * gait
        : Math.sin(time * 3 + entity) * 0.04;
      const stalk = place(mesh.stalk, index, 0, 0.7, 0, anim.sx + sway, 0, anim.sz);
      for (let s = 0; s < 2; s++) {
        const sign = s === 0 ? -1 : 1;
        // The leaves flap on their own, a beat behind the stalk.
        const flap = Math.sin(time * 6 + entity + s) * 0.15 - anim.sx * 0.6;
        place(
          mesh.leaf,
          index * 2 + s,
          sign * 0.09,
          0.12,
          0,
          0,
          sign * 0.4,
          sign * (0.5 + flap),
          1,
          1,
          1,
          stalk,
        );
      }
      // A bud or a bloom on top of the head-sprout, for a Sproutling that has grown.
      const stage = stageOf(worker.growth);
      if (stage !== 'leaf') {
        const open = stage === 'bloom';
        place(
          mesh.flower,
          flowers,
          0,
          0.42,
          0,
          0,
          time * 0.4,
          0,
          open ? 2 : 0.85,
          open ? 0.5 : 1.3,
          open ? 2 : 0.85,
          stalk,
        );
        mesh.flower.setColorAt(flowers, open ? BLOOM_PETAL[worker.kind] : BUD);
        flowers++;
      }
      const lit = state !== 'idle';
      const kind = worker.kind;
      const crown =
        kind === 'ember'
          ? mesh.ember
          : kind === 'dew'
            ? mesh.droplet
            : kind === 'stone'
              ? mesh.pebble
              : mesh.spark;
      const slot = crowns[kind]++;
      const shape = CROWN_SHAPE[kind];
      // Embers flicker, droplets wobble, pebbles sit still, sparks crackle.
      const flicker =
        kind === 'ember'
          ? lit
            ? 1 + Math.sin(time * 17 + entity * 3.1) * 0.12
            : 0.75
          : kind === 'dew'
            ? 1 + Math.sin(time * 6 + entity) * 0.06
            : kind === 'spark'
              ? 0.8 + Math.abs(Math.sin(time * 31 + entity * 2.3)) * 0.4
              : 1;
      // A bolt sways rather than spins, so its zig-zag always shows.
      const turn =
        kind === 'spark' ? Math.sin(time * 9 + entity) * 0.35 : time * shape.spin + entity;
      place(
        crown,
        slot,
        0,
        shape.y,
        0,
        0,
        turn,
        0,
        flicker * shape.size,
        flicker * shape.size * (kind === 'ember' ? 1.15 : 1),
        flicker * shape.size,
        shape.on === 'stalk' ? stalk : body,
      );
      const [hot, cold] = tints[kind].crowns;
      // Lit, it glows; not so much that the bloom hides its outline.
      crown.setColorAt(slot, flame.copy(lit ? hot : cold).multiplyScalar(lit ? shape.glow : 0.9));
      // On fire: flames lick up from the body until it is whistled out or lost.
      if (worker.peril === 'fire') {
        for (let k = 0; k < 3; k++) {
          const a = time * 9 + k * 2.1 + entity;
          place(
            mesh.blaze,
            blazes++,
            Math.sin(a) * 0.15,
            0.5 + Math.abs(Math.sin(time * 13 + k)) * 0.2,
            Math.cos(a) * 0.15,
            0,
            a,
            0,
            1,
            1 + Math.abs(Math.sin(time * 17 + k)) * 0.6,
            1,
          );
        }
      }

      // ---- Eyes: blink, glance, widen in fright ----
      const fright = threatened || anim.leap > 0 || state === 'thrown';
      for (let s = 0; s < 2; s++) {
        const slot = index * 2 + s;
        const blink = (time + entity * 0.37) % 4 < 0.12 ? 0.15 : 1;
        const open = dazed ? 0.15 : fright ? 1.45 : blink;
        const eyeMatrix = place(
          mesh.eye,
          slot,
          EYES[s],
          EYE_HEIGHT,
          EYE_FORWARD,
          0,
          0,
          0,
          fright ? 1.3 : 1,
          open,
          fright ? 1.3 : 1,
        );
        const look = state === 'idle' ? anim.glance * 0.03 : 0;
        place(
          mesh.pupil,
          slot,
          look * 1.5,
          0,
          0.055,
          0,
          0,
          0,
          fright ? 0.6 : 1,
          fright ? 0.6 : 1,
          1,
          eyeMatrix,
        );
      }

      // ---- Dazed stars ----
      if (dazed) {
        for (let k = 0; k < 3; k++) {
          const angle = time * 5 + (k * Math.PI * 2) / 3;
          dummy.position.set(
            at.x + Math.sin(angle) * 0.35,
            ground + 0.75,
            at.z + Math.cos(angle) * 0.35,
          );
          dummy.rotation.set(0, angle, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          mesh.star.setMatrixAt(stars++, dummy.matrix);
        }
      }

      // ---- Wind ribbons behind a thrown worker ----
      if (state === 'thrown') {
        anim.trail.unshift({ x: at.x, y: at.y + ground + 0.35, z: at.z });
        if (anim.trail.length > TRAIL) anim.trail.length = TRAIL;
        for (let k = 0; k + 1 < anim.trail.length && ribbons < MAX * TRAIL; k++) {
          const a = anim.trail[k];
          const b = anim.trail[k + 1];
          const length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
          if (length < 0.01) continue;
          dummy.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
          dummy.lookAt(b.x, b.y, b.z);
          const fade = 1 - k / TRAIL;
          dummy.scale.set(0.09 * fade, 0.02, length);
          dummy.updateMatrix();
          mesh.ribbon.setMatrixAt(ribbons++, dummy.matrix);
        }
      }

      // ---- Sweat on a heavy haul with a bare-minimum crew ----
      if (state === 'carrying') {
        const haul = sim.carryables.get(worker.target);
        const straining =
          haul !== undefined && haul.weight >= 3 && haul.carriers.length <= haul.weight;
        if (straining && drops.current.length < SWEAT && Math.random() < dt * 1.2) {
          const out = Math.random() < 0.5 ? -1 : 1;
          drops.current.push({
            x: at.x,
            y: ground + 0.8,
            z: at.z,
            vx: Math.cos(yaw) * out * 1.2,
            vy: 2.2,
            vz: -Math.sin(yaw) * out * 1.2,
            life: 0.7,
          });
        }
      }

      // ---- Contact shadow ----
      dummy.position.set(at.x, ground + 0.02, at.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(Math.max(0.3, 1 - Math.max(0, at.y) * 0.18));
      dummy.updateMatrix();
      mesh.blob.setMatrixAt(index, dummy.matrix);
      index++;
    }

    // Forget workers that are gone.
    for (const entity of anims.current.keys()) if (!seen.has(entity)) anims.current.delete(entity);

    // Sweat drops fly and fall.
    let sweatCount = 0;
    drops.current = drops.current.filter((drop) => {
      drop.life -= dt;
      drop.vy -= 9 * dt;
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.z += drop.vz * dt;
      if (drop.life <= 0) return false;
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1.5, 1);
      dummy.updateMatrix();
      mesh.sweat.setMatrixAt(sweatCount++, dummy.matrix);
      return true;
    });

    for (const one of [mesh.body, mesh.stalk, mesh.blob, mesh.basket, mesh.rim]) {
      one.count = index;
    }
    mesh.ember.count = crowns.ember;
    mesh.droplet.count = crowns.dew;
    mesh.pebble.count = crowns.stone;
    mesh.spark.count = crowns.spark;
    mesh.blaze.count = blazes;
    for (const two of [mesh.eye, mesh.pupil, mesh.arm, mesh.leg, mesh.foot, mesh.leaf]) {
      two.count = index * 2;
    }
    mesh.star.count = stars;
    mesh.ribbon.count = ribbons;
    mesh.sweat.count = sweatCount;
    mesh.flower.count = flowers;
    (mesh.ribbon.material as MeshBasicMaterial).opacity = 0.55;
    for (const one of Object.values(mesh)) {
      one.instanceMatrix.needsUpdate = true;
      if (one.instanceColor) one.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={refs.body}
        args={[geometries.body, undefined, MAX]}
        frustumCulled={false}
        castShadow
      >
        <meshStandardMaterial roughness={0.45} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={refs.stalk} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <cylinderGeometry args={[0.02, 0.035, 0.32, 5]} />
        <meshStandardMaterial color="#5a3a2a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={refs.flower} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <sphereGeometry args={[0.09, 10, 6]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={refs.leaf} args={[undefined, undefined, MAX * 2]} frustumCulled={false}>
        <sphereGeometry args={[0.1, 8, 4]} />
        <meshStandardMaterial color="#6ab04a" roughness={0.6} />
      </instancedMesh>
      <instancedMesh
        ref={refs.ember}
        args={[crownShapes.ember, undefined, MAX]}
        frustumCulled={false}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={refs.droplet}
        args={[crownShapes.dew, undefined, MAX]}
        frustumCulled={false}
      >
        <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={refs.pebble}
        args={[crownShapes.stone, undefined, MAX]}
        frustumCulled={false}
      >
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={refs.spark}
        args={[crownShapes.spark, undefined, MAX]}
        frustumCulled={false}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={refs.blaze} args={[undefined, undefined, MAX * 3]} frustumCulled={false}>
        <coneGeometry args={[0.12, 0.4, 6]} />
        <meshBasicMaterial color={[3, 1.4, 0.3]} toneMapped={false} transparent opacity={0.9} />
      </instancedMesh>
      <instancedMesh ref={refs.eye} args={[undefined, undefined, MAX * 2]} frustumCulled={false}>
        <sphereGeometry args={[0.065, 10, 8]} />
        <meshStandardMaterial color={EYE_WHITE} roughness={0.2} />
      </instancedMesh>
      <instancedMesh ref={refs.pupil} args={[undefined, undefined, MAX * 2]} frustumCulled={false}>
        <sphereGeometry args={[0.033, 8, 6]} />
        <meshBasicMaterial color="#1c1410" />
      </instancedMesh>
      <instancedMesh ref={refs.leg} args={[undefined, undefined, MAX * 2]} frustumCulled={false}>
        <capsuleGeometry args={[0.045, 0.1, 3, 6]} />
        <meshStandardMaterial color="#6e1d12" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={refs.foot} args={[undefined, undefined, MAX * 2]} frustumCulled={false}>
        <sphereGeometry args={[0.065, 8, 6]} />
        <meshStandardMaterial color="#4a140c" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={refs.arm} args={[undefined, undefined, MAX * 2]} frustumCulled={false}>
        <capsuleGeometry args={[0.04, 0.16, 3, 6]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
      <instancedMesh
        ref={refs.basket}
        args={[geometries.basket, undefined, MAX]}
        frustumCulled={false}
        castShadow
      >
        <meshStandardMaterial
          map={weave.color}
          bumpMap={weave.bump}
          bumpScale={2}
          roughness={0.9}
        />
      </instancedMesh>
      <instancedMesh ref={refs.rim} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <torusGeometry args={[0.155, 0.018, 5, 14]} />
        <meshStandardMaterial color="#7a5226" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={refs.star} args={[undefined, undefined, MAX * 3]} frustumCulled={false}>
        <octahedronGeometry args={[0.07, 0]} />
        <meshBasicMaterial color={[2, 1.8, 0.6]} toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={refs.ribbon}
        args={[undefined, undefined, MAX * TRAIL]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#fff6dc" transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={refs.sweat} args={[undefined, undefined, SWEAT]} frustumCulled={false}>
        <sphereGeometry args={[0.045, 6, 5]} />
        <meshBasicMaterial color="#bfe8ff" transparent opacity={0.85} />
      </instancedMesh>
      <instancedMesh ref={refs.blob} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
