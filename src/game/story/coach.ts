import { BEACON } from '../core/config';
import { damageTaken, isShielded } from '../enemies/combat';
import { ENEMY_SPECS } from '../enemies/enemyKinds';
import type { Simulation } from '../simulation/Simulation';

/**
 * Proctor Ashwick, watching from the wall. The coach reads the simulation a few times a
 * second and now and then offers one line of advice: what the controls are in the first
 * lessons, and after that only what the player seems to be missing right now. It never
 * changes the simulation.
 */

interface Rule {
  id: string;
  /** Seconds before the same line may be said again. */
  cooldown: number;
  /** Most times it is said in one day. */
  limit: number;
  /** The line to say, or null when it does not apply. */
  test: (sim: Simulation, coach: Coach) => string | null;
}

const SHOW_SECONDS = 6;
/** Quiet time between two lines, so advice never becomes chatter. */
const GAP_SECONDS = 4;
const IDLE_PATIENCE = 6;
const BUSY_PATIENCE = 9;

function bossOf(sim: Simulation) {
  for (const [entity, enemy] of sim.enemies.entries()) {
    if (ENEMY_SPECS[enemy.kind].boss) return { entity, enemy, at: sim.transforms.require(entity) };
  }
  return null;
}

function near(sim: Simulation, x: number, z: number, range: number): boolean {
  const captain = sim.captainTransform;
  return Math.hypot(captain.x - x, captain.z - z) < range;
}

const RULES: readonly Rule[] = [
  {
    id: 'throw',
    cooldown: 999,
    limit: 1,
    test: (sim, coach) =>
      sim.level.stage === 1 && sim.elapsed > 1
        ? coach.touch
          ? 'Touch a Sunshard and hold: your Sproutlings are thrown at it one after another.'
          : 'Move with WASD. Point at a Sunshard and hold the left mouse button to throw Sproutlings at it.'
        : null,
  },
  {
    id: 'numbers',
    cooldown: 999,
    limit: 1,
    test: (sim) =>
      sim.level.stage === 1 && sim.elapsed > 9
        ? 'The number on a shard is how many carriers it needs. Extra hands make it faster, up to double.'
        : null,
  },
  {
    id: 'over-walls',
    cooldown: 999,
    limit: 1,
    test: (sim) =>
      sim.level.stage === 2 && sim.elapsed > 2
        ? 'You can throw over a wall even where you cannot walk. The haul will find its own way home.'
        : null,
  },
  {
    id: 'dazed',
    cooldown: 15,
    limit: 4,
    test: (sim, coach) => {
      for (const [entity, worker] of sim.workers.entries()) {
        if (worker.stun <= 0.4) continue;
        const at = sim.transforms.require(entity);
        for (const [foe, enemy] of sim.enemies.entries()) {
          const spec = ENEMY_SPECS[enemy.kind];
          if (spec.attack === 'none' || enemy.hp <= 0) continue;
          const where = sim.transforms.require(foe);
          if (Math.hypot(where.x - at.x, where.z - at.z) < enemy.radius + 4) {
            return coach.touch
              ? 'They are dazed! Hold Whistle and drag it over them before it strikes.'
              : 'They are dazed! Whistle them clear before it strikes: hold the right mouse button over them.';
          }
        }
      }
      return null;
    },
  },
  {
    id: 'boss-open',
    cooldown: 14,
    limit: 4,
    test: (sim) => {
      const boss = bossOf(sim);
      if (!boss || boss.enemy.state !== 'recover') return null;
      if (ENEMY_SPECS[boss.enemy.kind].armour >= 1 || isShielded(sim, boss.entity, boss.enemy))
        return null;
      return near(sim, boss.at.x, boss.at.z, 16) ? 'It is winded. Everyone on it, now!' : null;
    },
  },
  {
    id: 'boss-dark',
    cooldown: 25,
    limit: 3,
    test: (sim) => {
      const boss = bossOf(sim);
      if (!boss || boss.enemy.kind !== 'snuffer' || !near(sim, boss.at.x, boss.at.z, 14))
        return null;
      return isShielded(sim, boss.entity, boss.enemy)
        ? 'Nothing hurts it in the dark. Light a beacon and draw it into the glow.'
        : null;
    },
  },
  {
    id: 'boss-shield',
    cooldown: 30,
    limit: 2,
    test: (sim) => {
      const boss = bossOf(sim);
      if (!boss || boss.enemy.kind !== 'lanternroot' || !near(sim, boss.at.x, boss.at.z, 14))
        return null;
      return isShielded(sim, boss.entity, boss.enemy)
        ? 'It is shielded while a root-knot lives. Take all three knots first.'
        : null;
    },
  },
  {
    id: 'boss-armour',
    cooldown: 40,
    limit: 2,
    test: (sim) => {
      const boss = bossOf(sim);
      if (!boss || boss.enemy.latched.length < 3) return null;
      const taken = damageTaken(sim, boss.entity, boss.enemy);
      return taken > 0 && taken < 1
        ? 'Its armour turns most of that aside. Call them off and wait for it to miss.'
        : null;
    },
  },
  {
    id: 'beacon',
    cooldown: 999,
    limit: 1,
    test: (sim) => {
      for (const beacon of sim.beacons) {
        if (!beacon.lit && near(sim, beacon.x, beacon.z, BEACON.lightRange + 8)) {
          return 'A cold beacon. Walk up to it: once lit, hauls nearby are delivered there.';
        }
      }
      return null;
    },
  },
  {
    id: 'descent',
    cooldown: 999,
    limit: 1,
    test: (sim) => {
      const { descent } = sim.level;
      return descent && near(sim, descent.x, descent.z, 14)
        ? 'There is a cold draught coming up out of the ground near here. Old stonework, by the look of it.'
        : null;
    },
  },
  {
    id: 'idle',
    cooldown: 28,
    limit: 3,
    test: (sim, coach) => {
      if (coach.idleFor < IDLE_PATIENCE) return null;
      const { idle } = sim.countWorkers();
      return coach.touch
        ? `${idle} Sproutlings are standing idle. Hold Whistle over them to call them back.`
        : `${idle} Sproutlings are standing idle. Hold the right mouse button over them to call them back.`;
    },
  },
  {
    id: 'loss',
    cooldown: 999,
    limit: 1,
    test: (sim) =>
      sim.stats.workersLost > 0
        ? 'You lost one. Every loss costs points, and a pair of hands.'
        : null,
  },
  {
    id: 'fast',
    cooldown: 999,
    limit: 1,
    test: (sim, coach) =>
      sim.level.stage >= 2 && coach.busyFor > BUSY_PATIENCE
        ? coach.touch
          ? 'Everyone is busy. Scout the next job, or hold the fast-forward button to hurry the day along.'
          : 'Everyone is busy. Scout the next job, or hold Shift to hurry the day along.'
        : null,
  },
  {
    id: 'peek',
    cooldown: 999,
    limit: 1,
    test: (sim, coach) =>
      !coach.touch && sim.level.stage >= 4 && coach.idleFor > 3 && sim.level.width > 55
        ? 'Lost track of someone? Hold Tab to look at your idle Sproutlings.'
        : null,
  },
  {
    id: 'sunset',
    cooldown: 999,
    limit: 1,
    test: (sim) =>
      sim.timeLeft < 60 &&
      sim.level.dayLength > 150 &&
      sim.stats.treasuresCollected.length < sim.stats.treasuresTotal
        ? 'One minute of daylight left. Bring home what you can.'
        : null,
  },
];

export class Coach {
  /** Seconds for which three or more Emberlings have stood idle. */
  idleFor = 0;
  /** Seconds for which every Emberling has been busy and the squad empty. */
  busyFor = 0;
  private line: string | null = null;
  private lineFor = 0;
  private quietFor = GAP_SECONDS;
  private readonly said = new Map<string, { count: number; last: number }>();

  constructor(readonly touch: boolean) {}

  /** Advances the coach by `dt` seconds of play and returns the line to show, if any. */
  update(sim: Simulation, dt: number): string | null {
    const counts = sim.countWorkers();
    this.idleFor = counts.idle >= 3 ? this.idleFor + dt : 0;
    this.busyFor =
      counts.squad === 0 && counts.idle === 0 && counts.total > 0 ? this.busyFor + dt : 0;

    if (this.line) {
      this.lineFor += dt;
      if (this.lineFor < SHOW_SECONDS) return this.line;
      this.line = null;
      this.quietFor = 0;
    }
    this.quietFor += dt;
    if (this.quietFor < GAP_SECONDS) return null;

    for (const rule of RULES) {
      const record = this.said.get(rule.id);
      if (record && (record.count >= rule.limit || sim.elapsed - record.last < rule.cooldown))
        continue;
      const line = rule.test(sim, this);
      if (!line) continue;
      this.said.set(rule.id, { count: (record?.count ?? 0) + 1, last: sim.elapsed });
      this.line = line;
      this.lineFor = 0;
      return line;
    }
    return null;
  }
}
