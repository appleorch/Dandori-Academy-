import { updateCaptain } from '../captain/captainSystem';
import { updateCarrying } from '../carry/carrySystem';
import type { InputState } from '../commands/input';
import { CAPTAIN, SIM_DT } from '../core/config';
import { HARD } from '../core/difficulty';
import { EcsWorld, type Entity, type Store } from '../core/ecs';
import { Rng } from '../core/rng';
import { updateEnemies } from '../enemies/enemySystem';
import { updateDrips } from '../enemies/dripSystem';
import { updateVents } from '../enemies/ventSystem';
import { updateHazards } from '../enemies/hazardSystem';
import { updateBlooms } from '../carry/bloomSystem';
import { applySeparation } from '../flocking/separation';
import { updateKiln } from '../kiln/kilnSystem';
import { NavGrid, type Box, type Point } from '../navigation/NavGrid';
import { FlowField } from '../pathfinding/flowField';
import { updateSelection, updateThrowing } from '../throwing/throwSystem';
import { updateWhistle } from '../whistle/whistleSystem';
import { dismissSquad, rushSquad } from '../workers/squad';
import { updateWorkers } from '../workers/workerSystem';
import { shardCount, type LevelDefinition } from '../world/level';
import { Beacon, updateBeacons } from '../carry/beacon';
import { BridgeSite } from '../carry/bridgeSite';
import {
  spawnEnemy,
  spawnLog,
  spawnPod,
  spawnSap,
  spawnTreasure,
  spawnWorker,
} from '../world/spawn';
import type { Captain, Carryable, Enemy, Hazard, Kiln, Transform, Worker } from './components';
import { SPROUT_KINDS, type SproutKind } from '../workers/sprouts';
import type { SimEvent, SimEventType } from './events';
import { PhysicsWorld } from './physics';

/** The starting squad as a list of kinds: the lesson's make-up, or all Emberlings. */
export function startingKinds(level: LevelDefinition): SproutKind[] {
  if (!level.squad) return Array.from({ length: level.startingWorkers }, () => 'ember' as const);
  return SPROUT_KINDS.flatMap((kind) =>
    Array.from({ length: level.squad?.[kind] ?? 0 }, () => kind),
  );
}

export type DayEnd = 'timeUp' | 'allCollected' | 'captainDown' | 'wipedOut';

export interface SimStats {
  treasureValue: number;
  treasuresCollected: string[];
  treasuresTotal: number;
  workersLost: number;
  enemiesDefeated: number;
  bossesDefeated: string[];
  bloomsCollected: number;
  /** Seconds into the day at which each Sunshard arrived, in order: the day's splits. */
  deliveryTimes: number[];
  /** Longest run of deliveries each within CHAIN.window of the last. */
  bestChain: number;
}

export interface WorkerCounts {
  total: number;
  squad: number;
  idle: number;
  working: number;
}

/**
 * The whole game state plus the fixed-step update. It has no rendering or DOM
 * dependencies: the same inputs always produce the same day.
 * `initPhysics()` must have resolved before constructing one.
 */
export class Simulation {
  readonly ecs = new EcsWorld();
  readonly transforms: Store<Transform> = this.ecs.createStore();
  readonly workers: Store<Worker> = this.ecs.createStore();
  readonly carryables: Store<Carryable> = this.ecs.createStore();
  readonly enemies: Store<Enemy> = this.ecs.createStore();
  readonly hazards: Store<Hazard> = this.ecs.createStore();
  /** What happened during the most recent step. Cleared at the start of the next. */
  readonly events: SimEvent[] = [];

  /** True on Hard: tougher, faster enemies and lethal drips (see core/difficulty). */
  readonly hard: boolean;
  readonly captainMaxHp: number;
  /** Bridge sites, in the lesson's order. */
  readonly bridges: BridgeSite[];
  /** Beacons, in the lesson's order: second drop-offs once the Warden lights them. */
  readonly beacons: Beacon[];
  /** Where the next new Emberlings appear: the Kiln, or the beacon that took the last pod. */
  readonly hatchAt: Point;
  /** Seconds of Sap left; while positive every haul moves faster. */
  sapTimer = 0;
  /** Deliveries in the current chain, and when the last one arrived. */
  chain = 0;
  lastDelivery = -Infinity;
  /** Twins that arrived alone, waiting for their partner. */
  readonly twinArrivals = new Map<string, { time: number; value: number }>();
  /** Every solid box: the lesson's walls, water, unbuilt bridges, and gates not yet broken. */
  readonly walls: Box[];
  readonly nav: NavGrid;
  /**
   * The same ground for those who wade: walls and gates are solid, water is not. Dewlings
   * walk and carry on it; anyone else in the water (thrown there, or whistled out) uses it
   * only to scramble back to the bank.
   */
  readonly wadeWalls: Box[];
  readonly wadeNav: NavGrid;
  /** Shortest wading paths to the Kiln, for a crew of Dewlings. */
  readonly wadeKilnField: FlowField;
  /** The kind of Sproutling the Warden throws next. */
  selected: SproutKind;
  readonly physics: PhysicsWorld;
  readonly rng: Rng;
  /** Shortest paths to the Kiln, followed by hauls. */
  readonly kilnField: FlowField;
  /** Shortest paths to the captain, followed by the squad. */
  readonly squadField: FlowField;

  readonly captain: Entity;
  readonly captainTransform: Transform;
  readonly captainState: Captain = {
    hp: CAPTAIN.maxHp,
    invuln: 0,
    throwCooldown: 0,
    throwLatched: false,
    whistleRadius: 0,
  };
  /** Walkable point nearest the captain; where the squad gathers. */
  readonly anchor: Point;
  readonly cursor: Point;
  readonly kiln: Kiln = { queue: [], spawnTimer: 0 };

  readonly stats: SimStats;
  squadSize = 0;
  timeLeft: number;
  tick = 0;
  ended: DayEnd | null = null;
  /** Bumped whenever a haul, enemy or glob is created or destroyed, so renderers can resync. */
  entityVersion = 0;

  /**
   * True for a cave entered from the surface: it keeps no clock (the surface's is stopped
   * while the Warden is below), and it has a way back up where the Warden arrives.
   */
  readonly visit: boolean;

  constructor(
    readonly level: LevelDefinition,
    options: { visit?: boolean } = {},
  ) {
    this.visit = options.visit ?? false;
    this.hard = level.difficulty === 'hard';
    this.captainMaxHp = this.hard ? HARD.captainHp : CAPTAIN.maxHp;
    this.captainState.hp = this.captainMaxHp;
    this.walls = [
      ...level.obstacles,
      ...(level.gates ?? []),
      ...(level.water ?? []),
      ...(level.bridges ?? []),
    ];
    this.nav = new NavGrid(level.width, level.depth, this.walls);
    this.nav.setLedges(level.ledges ?? []);
    this.wadeWalls = [...level.obstacles, ...(level.gates ?? [])];
    this.wadeNav = new NavGrid(level.width, level.depth, this.wadeWalls);
    this.wadeNav.setLedges(level.ledges ?? []);
    this.wadeKilnField = new FlowField(this.wadeNav);
    this.wadeKilnField.compute(this.wadeNav.cellIndexAt(level.kiln.x, level.kiln.z));
    this.physics = new PhysicsWorld(level.width, level.depth, this.walls, level.captain, SIM_DT);
    this.rng = new Rng(level.seed);
    this.kilnField = new FlowField(this.nav);
    this.kilnField.compute(this.nav.cellIndexAt(level.kiln.x, level.kiln.z));
    this.squadField = new FlowField(this.nav);
    this.bridges = (level.bridges ?? []).map(
      (bridge) => new BridgeSite(bridge, bridge.bank, bridge.needs, this.nav),
    );
    this.beacons = (level.beacons ?? []).map((spot) => new Beacon(spot.x, spot.z, this.nav));
    this.hatchAt = { ...level.kiln };
    this.timeLeft = level.dayLength;
    this.stats = {
      treasureValue: 0,
      treasuresCollected: [],
      treasuresTotal: shardCount(level),
      workersLost: 0,
      enemiesDefeated: 0,
      bossesDefeated: [],
      bloomsCollected: 0,
      deliveryTimes: [],
      bestChain: 0,
    };

    this.captain = this.ecs.create();
    this.captainTransform = this.transforms.set(this.captain, {
      x: level.captain.x,
      y: 0,
      z: level.captain.z,
      facing: 0,
    });
    this.anchor = { ...level.captain };
    this.cursor = { ...level.captain };

    const kinds = startingKinds(level);
    kinds.forEach((kind, i) => {
      const angle = (i / kinds.length) * Math.PI * 2;
      const spot = this.nav.nearestWalkable(
        level.captain.x + Math.sin(angle) * 1.5,
        level.captain.z + Math.cos(angle) * 1.5,
      );
      spawnWorker(this, spot.x, spot.z, 'follow', kind);
    });
    this.selected = kinds[0] ?? 'ember';
    for (const treasure of level.treasures) spawnTreasure(this, treasure);
    level.pods.forEach((pod, index) => spawnPod(this, pod, index, pod.kind));
    (level.logs ?? []).forEach((log, index) => spawnLog(this, log, index));
    (level.saps ?? []).forEach((sap, index) => spawnSap(this, sap, index));
    for (const enemy of level.enemies) {
      spawnEnemy(this, enemy.x, enemy.z, enemy.kind, {
        drop: enemy.drop ?? 0,
        reveals: enemy.reveals,
      });
    }
    for (const gate of level.gates ?? []) {
      spawnEnemy(this, gate.x, gate.z, 'gate', { hp: gate.hp, shape: gate });
    }
    for (const root of level.roots ?? []) {
      const core = spawnEnemy(this, root.x, root.z, 'lanternroot', { drop: root.drop });
      for (const knot of root.knots) spawnEnemy(this, knot.x, knot.z, 'rootknot', { parent: core });
    }
  }

  /** Seconds since the day began. */
  get elapsed(): number {
    return this.tick * SIM_DT;
  }

  /**
   * `elapsed` as it was one step ago. Computed the same way, so it matches the previous
   * step's `elapsed` exactly; timers that fire "when a time is crossed" rely on that.
   */
  get previousElapsed(): number {
    return (this.tick - 1) * SIM_DT;
  }

  /** Takes a wall out of the world (a broken gate) and reroutes everything around the change. */
  removeWall(box: Box): void {
    const index = this.walls.indexOf(box);
    if (index < 0) return;
    this.walls.splice(index, 1);
    this.nav.setObstacles(this.walls);
    // A broken gate opens the wading ground too; a finished bridge was never solid there.
    const wading = this.wadeWalls.indexOf(box);
    if (wading >= 0) {
      this.wadeWalls.splice(wading, 1);
      this.wadeNav.setObstacles(this.wadeWalls);
      this.wadeKilnField.invalidate();
      this.wadeKilnField.compute(this.wadeNav.cellIndexAt(this.level.kiln.x, this.level.kiln.z));
    }
    this.physics.removeWall(box);
    this.kilnField.invalidate();
    this.kilnField.compute(this.nav.cellIndexAt(this.level.kiln.x, this.level.kiln.z));
    this.squadField.invalidate();
    for (const site of this.bridges) site.refresh();
    for (const beacon of this.beacons) beacon.refresh();
  }

  /** Advances the day by one fixed step. Does nothing once the day has ended. */
  step(input: InputState): void {
    if (this.ended) return;
    const dt = SIM_DT;
    this.tick++;
    this.events.length = 0;
    updateSelection(this, input);
    updateCaptain(this, input, dt);
    updateBeacons(this);
    updateWhistle(this, input, dt);
    updateThrowing(this, input, dt);
    if (input.dismiss) dismissSquad(this);
    if (input.rush) rushSquad(this);
    updateEnemies(this, dt);
    updateDrips(this);
    updateVents(this);
    updateBlooms(this);
    updateHazards(this, dt);
    updateWorkers(this, dt);
    applySeparation(this);
    updateCarrying(this, dt);
    updateKiln(this, dt);

    if (!this.visit) this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.ended) return;
    if (this.stats.treasuresCollected.length === this.stats.treasuresTotal) {
      this.ended = 'allCollected';
    } else if (this.workers.size === 0 && this.kiln.queue.length === 0) {
      this.ended = 'wipedOut';
    } else if (this.timeLeft === 0) {
      this.ended = 'timeUp';
    }
  }

  /** True on open water: a river, or a bridge site not yet built. */
  inWater(x: number, z: number): boolean {
    const inside = (box: Box): boolean =>
      Math.abs(x - box.x) <= box.w / 2 && Math.abs(z - box.z) <= box.d / 2;
    if ((this.level.water ?? []).some(inside)) return true;
    return this.bridges.some((site) => !site.built && inside(site.box));
  }

  emit(type: SimEventType, x: number, z: number, amount = 0): void {
    this.events.push({ type, x, z, amount });
  }

  countWorkers(): WorkerCounts {
    const counts: WorkerCounts = { total: this.workers.size, squad: 0, idle: 0, working: 0 };
    for (const [, worker] of this.workers.entries()) {
      if (worker.state === 'follow') counts.squad++;
      else if (worker.state === 'idle') counts.idle++;
      else counts.working++;
    }
    return counts;
  }

  dispose(): void {
    this.physics.dispose();
  }
}
