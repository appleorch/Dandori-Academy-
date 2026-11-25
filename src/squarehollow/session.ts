import { audio } from '../game/audio/audioManager';
import { BLOCKS, WATER } from './blocks';
import { LOCAL_SIZE, poke, rayHitsLocal, spawnLocals, updateLocal, type Local } from './locals';
import { mulberry32 } from './noise';
import {
  EYE_HEIGHT,
  newBody,
  overlapsCell,
  stepBody,
  underWater,
  WARDEN_SIZE,
  type Body,
  type Controls,
} from './physics';
import type { IslandSave } from './storage';
import { World, type Cell, type Hit } from './world';

/** How far the Warden can reach to dig or build. */
export const REACH = 5.5;
/** Seconds between digs (or builds) while the button is held. */
const REPEAT = 0.24;
/** Seconds the walk out of the door takes on arrival. */
export const ARRIVAL_SECONDS = 1.1;
/** A day is long and a night is short: seconds for each half of the clock. */
const DAY_SECONDS = 480;
const NIGHT_SECONDS = 180;
/** Metres walked between footsteps. */
const STRIDE = 2.2;

const STILL: Controls = { forward: 0, strafe: 0, jump: false, descend: false, sprint: false };

/** Something worth showing a burst of crumbs for. */
export interface Crumbs {
  x: number;
  y: number;
  z: number;
  id: number;
}

export type Daypart = 'Night' | 'Dawn' | 'Morning' | 'Midday' | 'Afternoon' | 'Dusk';

/** What part of the day a clock time (0 midnight, 0.5 noon) is. */
export function daypart(time: number): Daypart {
  if (time < 0.2 || time >= 0.8) return 'Night';
  if (time < 0.3) return 'Dawn';
  if (time < 0.45) return 'Morning';
  if (time < 0.58) return 'Midday';
  if (time < 0.71) return 'Afternoon';
  return 'Dusk';
}

export interface SessionEvents {
  /** The hotbar or the chosen slot changed. */
  hotbar?: (hotbar: readonly number[], slot: number) => void;
  daypart?: (part: Daypart) => void;
  /** The Warden walked into the dark door. */
  door?: () => void;
  arrived?: () => void;
}

/**
 * One visit to Squarehollow: the island, the Warden's body and gaze, what is held and pressed,
 * the locals, and the clock. `update` runs it a frame at a time; the scene draws it.
 */
export class Session {
  readonly world: World;
  readonly body: Body;
  /** Gaze, in radians. Yaw pi looks along +z, out of the door. */
  yaw = Math.PI;
  pitch = -0.08;
  readonly keys = new Set<string>();
  /** The touch joystick: x to the right, y down the screen, -1 to 1. */
  readonly stick = { x: 0, y: 0 };
  touchJump = false;
  digHeld = false;
  buildHeld = false;
  digQueued = false;
  buildQueued = false;
  pickQueued = false;
  /** Whether input moves the Warden: off while paused or in the block picker. */
  active = false;
  /** Paused, or in the block picker: the island stands still. */
  paused = false;
  hotbar: number[];
  slot = 0;
  /** Seconds since arriving. */
  clock = 0;
  /** 0 is midnight, 0.25 sunrise, 0.5 noon. */
  time = 0.34;
  /** 0 to 1 through the walk out of the door. */
  arrival = 0;
  leaving = false;
  target: Hit | null = null;
  targetLocal: Local | null = null;
  readonly locals: Local[];
  /** Cells changed this frame, for the meshes. */
  readonly changed: Cell[] = [];
  readonly crumbs: Crumbs[] = [];
  /** Seconds since the hand last swung (a dig or a build). */
  swing = 10;
  eyeUnderWater = false;
  /** Metres walked since the last footstep; also drives the head bob. */
  stride = 0;
  edited = false;
  events: SessionEvents = {};
  private nextDig = 0;
  private nextBuild = 0;
  private part: Daypart;
  private readonly random = mulberry32(Date.now() >>> 0);

  constructor(save: IslandSave, localCount = 8) {
    this.world = new World(save.seed);
    this.world.applyEdits(save.edits);
    this.hotbar = [...save.hotbar];
    const { spawn } = this.world;
    this.body = newBody(spawn.x + 0.5, spawn.y, spawn.z + 0.5);
    this.locals = spawnLocals(this.world, localCount, this.random);
    this.part = daypart(this.time);
  }

  save(): IslandSave {
    return { seed: this.world.seed, edits: this.world.editList(), hotbar: [...this.hotbar] };
  }

  get selected(): number {
    return this.hotbar[this.slot];
  }

  /** Where the eye is, and which way it looks. */
  eye(): [number, number, number] {
    return [this.body.x, this.body.y + EYE_HEIGHT, this.body.z];
  }

  look(): [number, number, number] {
    const flat = Math.cos(this.pitch);
    return [-Math.sin(this.yaw) * flat, Math.sin(this.pitch), -Math.cos(this.yaw) * flat];
  }

  turn(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = Math.max(-1.54, Math.min(1.54, this.pitch - dy));
  }

  choose(slot: number): void {
    const next = ((slot % this.hotbar.length) + this.hotbar.length) % this.hotbar.length;
    if (next === this.slot) return;
    this.slot = next;
    audio.play('select');
    this.events.hotbar?.(this.hotbar, this.slot);
  }

  /** Puts a block in the chosen slot, or jumps to the slot that already holds it. */
  hold(id: number): void {
    if (!BLOCKS[id]?.placeable) return;
    const already = this.hotbar.indexOf(id);
    if (already >= 0) {
      this.slot = already;
    } else {
      this.hotbar[this.slot] = id;
    }
    audio.play('select');
    this.events.hotbar?.(this.hotbar, this.slot);
  }

  toggleFlight(): void {
    this.body.flying = !this.body.flying;
    if (this.body.flying && this.body.onGround) this.body.vy = 4;
  }

  /** Lets go of every key and button, as when the game is paused. */
  release(): void {
    this.keys.clear();
    this.stick.x = 0;
    this.stick.y = 0;
    this.touchJump = false;
    this.digHeld = false;
    this.buildHeld = false;
  }

  private controls(): Controls {
    const k = this.keys;
    const key = (...codes: string[]): number => (codes.some((code) => k.has(code)) ? 1 : 0);
    const forward = key('KeyW', 'ArrowUp') - key('KeyS', 'ArrowDown') - this.stick.y;
    const strafe = key('KeyD', 'ArrowRight') - key('KeyA', 'ArrowLeft') + this.stick.x;
    const shift = k.has('ShiftLeft') || k.has('ShiftRight');
    return {
      forward: Math.max(-1, Math.min(1, forward)),
      strafe: Math.max(-1, Math.min(1, strafe)),
      jump: k.has('Space') || this.touchJump,
      descend: shift,
      sprint: shift || Math.hypot(this.stick.x, this.stick.y) > 0.95,
    };
  }

  /** One frame. */
  update(dt: number): void {
    if (this.paused) return;
    this.clock += dt;
    this.swing += dt;
    this.advanceClock(dt);
    if (this.arrival < 1) {
      this.arrival = Math.min(1, this.arrival + dt / ARRIVAL_SECONDS);
      if (this.arrival >= 1) this.events.arrived?.();
    }
    const steering = this.active && this.arrival >= 1 && !this.leaving;
    const controls = steering ? this.controls() : STILL;
    const { body, world } = this;
    const wasWet = body.inWater;
    stepBody(world, body, controls, this.yaw, dt);
    if (!wasWet && body.inWater && body.vy < -3) audio.play('splash', { gain: 0.8 });

    const moving = Math.hypot(body.vx, body.vz);
    if (body.onGround && !body.inWater && !body.flying && moving > 0.5) {
      this.stride += moving * dt;
      if (this.stride > STRIDE) {
        this.stride -= STRIDE;
        audio.play('step', { gain: 0.9 });
      }
    }

    const [ex, ey, ez] = this.eye();
    this.eyeUnderWater = underWater(world, ex, ey, ez);
    const { door } = world;
    if (
      !this.leaving &&
      Math.floor(body.x) === door.x &&
      Math.floor(body.z) === door.z &&
      body.y < door.y + 1
    ) {
      this.leaving = true;
      this.events.door?.();
    }

    this.aim();
    if (steering) this.act();
    this.digQueued = false;
    this.buildQueued = false;
    this.pickQueued = false;

    for (const local of this.locals) updateLocal(world, local, body, dt, this.random);
  }

  private advanceClock(dt: number): void {
    const day = this.time >= 0.25 && this.time < 0.75;
    this.time = (this.time + dt * (0.5 / (day ? DAY_SECONDS : NIGHT_SECONDS))) % 1;
    const part = daypart(this.time);
    if (part !== this.part) {
      const wasNight = this.part === 'Night';
      this.part = part;
      this.events.daypart?.(part);
      // Birds by day, crickets by night; the music thins out after dark.
      if (part === 'Night' || wasNight) {
        audio.setScene(part === 'Night' ? 'dusk' : 'meadow');
        audio.setMusicMood(part === 'Night' ? 0 : 1, false);
      }
    }
  }

  get daypart(): Daypart {
    return this.part;
  }

  /** Finds what the Warden is looking at: a local, or the nearest block within reach. */
  private aim(): void {
    const [ex, ey, ez] = this.eye();
    const [dx, dy, dz] = this.look();
    this.target = this.world.raycast(ex, ey, ez, dx, dy, dz, REACH);
    this.targetLocal = null;
    let nearest = this.target?.distance ?? REACH;
    for (const local of this.locals) {
      const t = rayHitsLocal(local, ex, ey, ez, dx, dy, dz, REACH);
      if (t !== null && t < nearest) {
        nearest = t;
        this.targetLocal = local;
      }
    }
  }

  private act(): void {
    if (this.digQueued || (this.digHeld && this.clock >= this.nextDig)) {
      this.nextDig = this.clock + REPEAT;
      this.dig();
    }
    if (this.buildQueued || (this.buildHeld && this.clock >= this.nextBuild)) {
      this.nextBuild = this.clock + REPEAT;
      this.build();
    }
    if (this.pickQueued && this.target) this.hold(this.target.id);
  }

  private dig(): void {
    if (this.targetLocal) {
      const local = this.targetLocal;
      poke(local);
      this.swing = 0;
      audio.play('voice', { pitch: local.kind === 'stone' ? 0.8 : 1.15 + this.random() * 0.3 });
      return;
    }
    const hit = this.target;
    if (!hit) return;
    this.swing = 0;
    const changed = this.world.dig(hit.x, hit.y, hit.z);
    if (!changed) {
      audio.play('knock', { gain: 0.6 });
      return;
    }
    this.changed.push(...changed);
    this.crumbs.push({ x: hit.x, y: hit.y, z: hit.z, id: hit.id });
    this.edited = true;
    const sound = BLOCKS[hit.id].sound;
    if (sound === 'glass') audio.play('shatter');
    else if (sound === 'leaf') audio.play('rustle');
    else audio.play('dig', { pitch: sound === 'hard' ? 1.5 : sound === 'wood' ? 1.1 : 0.75 });
  }

  private build(): void {
    const hit = this.target;
    if (!hit || this.targetLocal) return;
    const x = hit.x + hit.nx;
    const y = hit.y + hit.ny;
    const z = hit.z + hit.nz;
    if (overlapsCell(this.body, WARDEN_SIZE, x, y, z)) return;
    if (this.locals.some((local) => overlapsCell(local.body, LOCAL_SIZE, x, y, z))) return;
    const there = this.world.get(x, y, z);
    const changed = this.world.place(x, y, z, this.selected);
    if (!changed) return;
    this.swing = 0;
    this.changed.push(...changed);
    this.edited = true;
    audio.play('build', { pitch: there === WATER ? 0.8 : 1 });
  }
}
