import { audio } from '../audio/audioManager';
import type { SimEvent, SimEventType } from '../simulation/events';
import { ParticleSystem, type BurstStyle } from './particles';

export interface Popup {
  text: string;
  color: string;
  /** Bigger text for the moments that matter. */
  big: boolean;
  /** Height of the ground where it was earned. */
  ground: number;
  x: number;
  z: number;
  age: number;
}

export const POPUP_SECONDS = 1.5;
const MAX_POPUPS = 6;

type Rgb = readonly [number, number, number];
const DUST: Rgb = [0.79, 0.72, 0.54];
const GOLD: Rgb = [1, 0.82, 0.34];
const EMBER: Rgb = [1, 0.48, 0.1];
const WISP: Rgb = [0.85, 0.9, 1];
const BLOOD: Rgb = [0.75, 0.2, 0.15];
const MOSS: Rgb = [0.3, 0.55, 0.25];
const GLOB: Rgb = [0.5, 0.62, 0.22];
const DEW: Rgb = [0.75, 0.9, 1];
const THORN: Rgb = [0.35, 0.28, 0.18];
const GLOW: Rgb = [0.4, 1, 0.9];
const SOIL: Rgb = [0.45, 0.33, 0.2];
const SAPGOLD: Rgb = [1, 0.75, 0.25];
const GLOOM: Rgb = [0.3, 0.3, 0.5];
const ZAP: Rgb = [1, 0.95, 0.5];

function style(
  count: number,
  color: Rgb,
  speed: number,
  lift: number,
  life: number,
  size: number,
  gravity = 1,
): BurstStyle {
  return { count, color, speed, lift, life, size, gravity };
}

interface Reaction {
  /** Height the burst starts at. */
  height: number;
  burst?: BurstStyle;
  shake?: number;
}

/** How the game answers each simulation event, beyond its sound. */
const REACTIONS: Partial<Record<SimEventType, Reaction>> = {
  land: { height: 0.1, burst: style(4, DUST, 1.6, 1.2, 0.35, 0.12) },
  latch: { height: 0.9, burst: style(3, GOLD, 2.2, 2, 0.25, 0.08) },
  grab: { height: 0.3, burst: style(2, DUST, 1.2, 1, 0.3, 0.1) },
  deliver: { height: 1.6, burst: style(26, GOLD, 4.5, 5, 0.9, 0.16), shake: 0.12 },
  grow: { height: 1.6, burst: style(14, EMBER, 3, 4, 0.8, 0.14) },
  spawn: { height: 0.3, burst: style(6, EMBER, 1.8, 3, 0.5, 0.1) },
  workerLost: { height: 0.5, burst: style(9, WISP, 0.8, 1.6, 1.1, 0.13, -0.15) },
  bite: { height: 0.4, burst: style(10, BLOOD, 3, 3, 0.4, 0.12), shake: 0.25 },
  shake: { height: 0.2, burst: style(16, DUST, 4.5, 2, 0.5, 0.16), shake: 0.2 },
  enemyDefeated: { height: 0.8, burst: style(32, MOSS, 4.5, 5, 0.9, 0.2), shake: 0.4 },
  captainHurt: { height: 1, burst: style(12, BLOOD, 3.5, 4, 0.5, 0.13), shake: 0.7 },
  slam: { height: 0.2, burst: style(26, DUST, 6, 3, 0.6, 0.2), shake: 0.6 },
  splat: { height: 0.2, burst: style(24, GLOB, 5, 4, 0.6, 0.18), shake: 0.4 },
  splash: { height: 0.2, burst: style(18, DEW, 4, 4, 0.5, 0.12) },
  stomp: { height: 0.2, burst: style(40, DUST, 8, 3, 0.7, 0.24), shake: 0.9 },
  phase: { height: 2, burst: style(30, EMBER, 5, 6, 0.8, 0.18), shake: 0.5 },
  gateBroken: { height: 1, burst: style(40, THORN, 6, 5, 0.9, 0.2), shake: 0.45 },
  shieldDown: { height: 2.5, burst: style(30, GOLD, 4, 6, 1, 0.16), shake: 0.3 },
  regrow: { height: 0.6, burst: style(12, THORN, 2, 4, 0.6, 0.12) },
  bloom: { height: 0.8, burst: style(24, GLOW, 2.5, 4, 1.2, 0.12, -0.1) },
  wilt: { height: 0.4, burst: style(10, DUST, 1.5, 1, 0.8, 0.12) },
  dug: { height: 0.3, burst: style(30, SOIL, 4, 4, 0.7, 0.18), shake: 0.2 },
  crack: { height: 0.8, burst: style(16, DEW, 3, 3, 0.6, 0.08) },
  sap: { height: 1.6, burst: style(24, SAPGOLD, 3, 5, 1, 0.14) },
  twin: { height: 2, burst: style(30, GOLD, 5, 6, 1, 0.16) },
  logPlaced: { height: 0.3, burst: style(14, DUST, 3, 2, 0.5, 0.14) },
  bridgeBuilt: { height: 0.3, burst: style(40, DUST, 5, 3, 0.8, 0.18), shake: 0.3 },
  chain: { height: 2.2, burst: style(14, GOLD, 3, 6, 0.7, 0.12) },
  rescued: { height: 0.6, burst: style(10, WISP, 1.5, 2, 0.5, 0.1) },
  burned: { height: 0.5, burst: style(16, EMBER, 2, 3, 0.8, 0.14, -0.2) },
  drowned: { height: 0.2, burst: style(14, DEW, 1.5, 3, 0.6, 0.1) },
  ignite: { height: 0.6, burst: style(12, EMBER, 2.5, 4, 0.5, 0.12) },
  zap: { height: 1, burst: style(20, ZAP, 6, 4, 0.35, 0.1), shake: 0.25 },
  flare: { height: 0.4, burst: style(34, EMBER, 3.5, 7, 0.9, 0.2, -0.3), shake: 0.15 },
  beaconLit: { height: 1.8, burst: style(36, EMBER, 4, 6, 1, 0.16) },
  snuff: { height: 1.8, burst: style(30, GLOOM, 3, 2, 1.2, 0.2, -0.1), shake: 0.35 },
};

/** Hit-stop seconds and camera punch for the moments that should land hard. */
const WEIGHT: Partial<Record<SimEventType, readonly [number, number]>> = {
  enemyDefeated: [0.07, 0.35],
  gateBroken: [0.05, 0.3],
  shieldDown: [0.09, 0.4],
  phase: [0.12, 0.5],
  bridgeBuilt: [0.04, 0.3],
  twin: [0.05, 0.35],
  captainHurt: [0.1, 0.2],
  stomp: [0.06, 0.25],
};

/** How far to the side a sound must be before it sits fully in one ear. */
const PAN_RANGE = 18;
/** Sounds fade with distance from the Warden, down to this floor. */
const HEARING_RANGE = 70;
const QUIETEST = 0.3;

/**
 * Turns simulation events into what the player sees, hears and feels: sounds,
 * particle bursts, camera shake and floating score text.
 */
export class Feedback {
  readonly particles = new ParticleSystem(480);
  readonly popups: Popup[] = [];
  /** Current camera shake strength in world units. */
  shake = 0;
  /** Brief zoom-in on big moments, 0 to 1; it eases back by itself. */
  punch = 0;
  /** Seconds the simulation holds still, so a big hit lands with weight. */
  hitstop = 0;
  /** Height of the ground at a point, so effects on raised terraces sit on them. */
  ground: (x: number, z: number) => number = () => 0;
  /** Where the listener stands: the Warden. Sounds are panned and faded from here. */
  listenerX = 0;
  listenerZ = 0;

  handle(event: SimEvent): void {
    const dx = event.x - this.listenerX;
    const distance = Math.hypot(dx, event.z - this.listenerZ);
    audio.play(event.type, {
      pan: Math.max(-1, Math.min(1, dx / PAN_RANGE)),
      gain: Math.max(QUIETEST, 1 - distance / HEARING_RANGE),
      pitch: event.amount,
    });
    const weight = WEIGHT[event.type];
    if (weight) {
      this.hitstop = Math.max(this.hitstop, weight[0]);
      this.punch = Math.max(this.punch, weight[1]);
    }
    const reaction = REACTIONS[event.type];
    if (reaction?.burst) {
      const lift = this.ground(event.x, event.z);
      this.particles.burst(event.x, reaction.height + lift, event.z, reaction.burst);
    }
    if (reaction?.shake) this.shake = Math.max(this.shake, reaction.shake);
    if (event.type === 'deliver') this.popup(`+${event.amount}`, event.x, event.z);
    if (event.type === 'chain') {
      this.popup(
        `Chain ×${event.amount}`,
        event.x + 1.5,
        event.z - 1.5,
        '#ffb347',
        event.amount >= 4,
      );
    }
    if (event.type === 'grow') this.popup(`+${event.amount} Emberlings`, event.x, event.z + 1.2);
    if (event.type === 'bloom') this.popup('A Glowcap sprouted!', event.x, event.z);
    if (event.type === 'twin') this.popup(`Twin bonus +${event.amount}`, event.x, event.z + 1.2);
    if (event.type === 'sap') this.popup('Sap! Hauls speed up', event.x, event.z + 1.2);
    if (event.type === 'crack') this.popup('Cracked!', event.x, event.z);
    if (event.type === 'bridgeBuilt') this.popup('Bridge built!', event.x, event.z);
    if (event.type === 'beaconLit') this.popup('Beacon lit!', event.x, event.z);
    if (event.type === 'snuff') this.popup('Snuffed out!', event.x, event.z);
    if (event.type === 'logPlaced' && event.amount > 0) {
      this.popup(`${event.amount} more log${event.amount === 1 ? '' : 's'}`, event.x, event.z);
    }
  }

  popup(text: string, x: number, z: number, color = '#ffd257', big = false): void {
    if (this.popups.length >= MAX_POPUPS) this.popups.shift();
    this.popups.push({ text, color, big, x, z, ground: this.ground(x, z), age: 0 });
  }

  update(dt: number): void {
    this.particles.update(dt);
    this.shake *= Math.exp(-dt * 7);
    this.punch *= Math.exp(-dt * 5);
    this.hitstop = Math.max(0, this.hitstop - dt);
    for (const popup of this.popups) popup.age += dt;
    while (this.popups.length > 0 && this.popups[0].age >= POPUP_SECONDS) this.popups.shift();
  }
}
