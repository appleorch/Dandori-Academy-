import { updateCaptain } from '../captain/captainSystem';
import { updateCarrying } from '../carry/carrySystem';
import type { InputState } from '../commands/input';
import { CAPTAIN, SIM_DT } from '../core/config';
import { EcsWorld, type Entity, type Store } from '../core/ecs';
import { Rng } from '../core/rng';
import { updateEnemies } from '../enemies/enemySystem';
import { applySeparation } from '../flocking/separation';
import { updateKiln } from '../kiln/kilnSystem';
import { NavGrid, type Point } from '../navigation/NavGrid';
import { FlowField } from '../pathfinding/flowField';
import { updateThrowing } from '../throwing/throwSystem';
import { updateWhistle } from '../whistle/whistleSystem';
import { dismissSquad } from '../workers/squad';
import { updateWorkers } from '../workers/workerSystem';
import type { LevelDefinition } from '../world/level';
import { spawnEnemy, spawnTreasure, spawnWorker } from '../world/spawn';
import type { Captain, Carryable, Enemy, Kiln, Transform, Worker } from './components';
import { PhysicsWorld } from './physics';

export type DayEnd = 'timeUp' | 'allCollected' | 'captainDown' | 'wipedOut';

export interface SimStats {
  treasureValue: number;
  treasuresCollected: string[];
  treasuresTotal: number;
  workersLost: number;
  enemiesDefeated: number;
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
  /** Bumped whenever a haul or enemy is created or destroyed, so renderers can resync. */
  entityVersion = 0;

  constructor(readonly level: LevelDefinition) {
    this.nav = new NavGrid(level.width, level.depth, level.obstacles);
    this.physics = new PhysicsWorld(
      level.width,
      level.depth,
      level.obstacles,
      level.captain,
      SIM_DT,
    );
    this.rng = new Rng(level.seed);
    this.kilnField = new FlowField(this.nav);
    this.kilnField.compute(this.nav.cellIndexAt(level.kiln.x, level.kiln.z));
    this.squadField = new FlowField(this.nav);
    this.timeLeft = level.dayLength;
    this.stats = {
      treasureValue: 0,
      treasuresCollected: [],
      treasuresTotal: level.treasures.length,
      workersLost: 0,
      enemiesDefeated: 0,
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
    for (const enemy of level.enemies) spawnEnemy(this, enemy.x, enemy.z);
  }

  /** Advances the day by one fixed step. Does nothing once the day has ended. */
  step(input: InputState): void {
    if (this.ended) return;
    const dt = SIM_DT;
    this.tick++;
    updateCaptain(this, input, dt);
    updateWhistle(this, input, dt);
    updateThrowing(this, input, dt);
    if (input.dismiss) dismissSquad(this);
    updateEnemies(this, dt);
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
