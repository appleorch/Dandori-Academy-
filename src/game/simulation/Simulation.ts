import { updateCaptain } from '../captain/captainSystem';
import { updateCarrying } from '../carry/carrySystem';
import type { InputState } from '../commands/input';
import { CAPTAIN, SIM_DT } from '../core/config';
import { HARD } from '../core/difficulty';
import { EcsWorld, type Entity, type Store } from '../core/ecs';
import { Rng } from '../core/rng';
import { updateEnemies } from '../enemies/enemySystem';
import { updateDrips } from '../enemies/dripSystem';
import { updateHazards } from '../enemies/hazardSystem';
import { updateBlooms } from '../carry/bloomSystem';
import { applySeparation } from '../flocking/separation';
import { updateKiln } from '../kiln/kilnSystem';
import { NavGrid, type Box, type Point } from '../navigation/NavGrid';
import { FlowField } from '../pathfinding/flowField';
import { updateThrowing } from '../throwing/throwSystem';
import { updateWhistle } from '../whistle/whistleSystem';
import { dismissSquad, rushSquad } from '../workers/squad';
import { updateWorkers } from '../workers/workerSystem';
import { shardCount, type LevelDefinition } from '../world/level';
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
import type { SimEvent, SimEventType } from './events';
import { PhysicsWorld } from './physics';

export type DayEnd = 'timeUp' | 'allCollected' | 'captainDown' | 'wipedOut';

export interface SimStats {
  treasureValue: number;
  treasuresCollected: string[];
  treasuresTotal: number;
  workersLost: number;
  enemiesDefeated: number;
  bossesDefeated: string[];
  bloomsCollected: number;
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
  /** Seconds of Sap left; while positive every haul moves faster. */
  sapTimer = 0;
  /** Twins that arrived alone, waiting for their partner. */
  readonly twinArrivals = new Map<string, { time: number; value: number }>();
  /** Every solid box: the lesson's walls, water, unbuilt bridges, and gates not yet broken. */
  readonly walls: Box[];
  readonly nav: NavGrid;
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
    whistleRadius: 0,
  };
  /** Walkable point nearest the captain; where the squad gathers. */
  readonly anchor: Point;
  readonly cursor: Point;
  readonly kiln: Kiln = { queue: 0, spawnTimer: 0 };

  readonly stats: SimStats;
  squadSize = 0;
  timeLeft: number;
  tick = 0;
  ended: DayEnd | null = null;
  /** Bumped whenever a haul, enemy or glob is created or destroyed, so renderers can resync. */
  entityVersion = 0;

  constructor(readonly level: LevelDefinition) {
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
    this.physics = new PhysicsWorld(level.width, level.depth, this.walls, level.captain, SIM_DT);
    this.rng = new Rng(level.seed);
    this.kilnField = new FlowField(this.nav);
    this.kilnField.compute(this.nav.cellIndexAt(level.kiln.x, level.kiln.z));
    this.squadField = new FlowField(this.nav);
    this.bridges = (level.bridges ?? []).map(
      (bridge) => new BridgeSite(bridge, bridge.bank, bridge.needs, this.nav),
    );
    this.timeLeft = level.dayLength;
    this.stats = {
      treasureValue: 0,
      treasuresCollected: [],
      treasuresTotal: shardCount(level),
      workersLost: 0,
      enemiesDefeated: 0,
      bossesDefeated: [],
      bloomsCollected: 0,
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

    for (let i = 0; i < level.startingWorkers; i++) {
      const angle = (i / level.startingWorkers) * Math.PI * 2;
      const spot = this.nav.nearestWalkable(
        level.captain.x + Math.sin(angle) * 1.5,
        level.captain.z + Math.cos(angle) * 1.5,
      );
      spawnWorker(this, spot.x, spot.z, 'follow');
    }
    for (const treasure of level.treasures) spawnTreasure(this, treasure);
    level.pods.forEach((pod, index) => spawnPod(this, pod, index));
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
    this.physics.removeWall(box);
    this.kilnField.invalidate();
    this.kilnField.compute(this.nav.cellIndexAt(this.level.kiln.x, this.level.kiln.z));
    this.squadField.invalidate();
    for (const site of this.bridges) site.refresh();
  }

  /** Advances the day by one fixed step. Does nothing once the day has ended. */
  step(input: InputState): void {
    if (this.ended) return;
    const dt = SIM_DT;
    this.tick++;
    this.events.length = 0;
    updateCaptain(this, input, dt);
    updateWhistle(this, input, dt);
    updateThrowing(this, input, dt);
    if (input.dismiss) dismissSquad(this);
    if (input.rush) rushSquad(this);
    updateEnemies(this, dt);
    updateDrips(this);
    updateBlooms(this);
    updateHazards(this, dt);
    updateWorkers(this, dt);
    applySeparation(this);
    updateCarrying(this, dt);
    updateKiln(this, dt);

    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.ended) return;
    if (this.stats.treasuresCollected.length === this.stats.treasuresTotal) {
      this.ended = 'allCollected';
    } else if (this.workers.size === 0 && this.kiln.queue === 0) {
      this.ended = 'wipedOut';
    } else if (this.timeLeft === 0) {
      this.ended = 'timeUp';
    }
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
