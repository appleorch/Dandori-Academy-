import { updateCaptain } from '../captain/captainSystem';
import { updateCarrying } from '../carry/carrySystem';
import type { InputState } from '../commands/input';
import { CAPTAIN, KILN, SIM_DT } from '../core/config';
import type { TreasureSpawn } from '../world/levelTypes';
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
import { updateConveyors } from '../world/conveyorSystem';
import { TRACK_EVERY } from '../modes/timeAttack';
import { updateDewdrops } from '../workers/growth';
import { emptyFog, reveal } from '../campaign/fog';
import type { Ability } from '../campaign/upgrades';
import { NavGrid, type Box, type Point } from '../navigation/NavGrid';
import { FlowField } from '../pathfinding/flowField';
import { updateSelection, updateThrowing } from '../throwing/throwSystem';
import { updateWhistle } from '../whistle/whistleSystem';
import { dismissSquad, rushSquad, type DeathCause } from '../workers/squad';
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
  spawnBerry,
} from '../world/spawn';
import type {
  Captain,
  Carryable,
  CarryKind,
  Enemy,
  Hazard,
  Kiln,
  Transform,
  Worker,
} from './components';
import type { EnemyKind } from '../enemies/enemyKinds';
import { SPROUT_KINDS, type SproutKind } from '../workers/sprouts';
import type { SimEvent, SimEventType } from './events';

/** The sprays and the second Warden: how long, how far, and when two Wardens merge. */
const ITEM = { brewSeconds: 20, stillSeconds: 8, stillRange: 12, mergeRange: 3 } as const;
/** Emberbrew's boost to walking and to striking. */
export const BREW = { speed: 4 / 3, attack: 1.5 } as const;
import { PhysicsWorld } from './physics';

/** The starting squad as a list of kinds: the lesson's make-up, or all Emberlings. */
export function startingKinds(level: LevelDefinition): SproutKind[] {
  if (!level.squad) return Array.from({ length: level.startingWorkers }, () => 'ember' as const);
  return SPROUT_KINDS.flatMap((kind) =>
    Array.from({ length: level.squad?.[kind] ?? 0 }, () => kind),
  );
}

/**
 * How a day ended. `allCollected`: the mode's goal is met (every Sunshard home, or everything
 * collected). `endedEarly`: the player called the day from the pause menu. `decided`: a battle
 * was won or lost before the clock ran out.
 */
export type DayEnd =
  'timeUp' | 'allCollected' | 'captainDown' | 'wipedOut' | 'endedEarly' | 'decided';

/**
 * When a day ends on its own, besides the clock and disasters: once every Sunshard is home
 * (the story), once everything is collected (every Sunshard home, every beast defeated and its
 * carcass home), or only when the clock runs out.
 */
export type EndsWhen = 'shards' | 'everything' | 'clock';

/** One haul delivered: what it was, for the modes that score or tick off particular things. */
export interface Delivery {
  kind: CarryKind;
  /** Treasure id, or the carcass's beast. */
  id: string;
  from: EnemyKind | null;
  weight: number;
  time: number;
}

export interface SimOptions {
  /** A cave entered from the surface; see `Simulation.visit`. */
  visit?: boolean;
  endsWhen?: EndsWhen;
  /** Whether the Kiln grows new Sproutlings. Off for a fixed-squad trial. */
  growth?: boolean;
  /**
   * The story: Sproutlings start as sprouts by the Kiln to be plucked, new ones come up the same
   * way, and beaten beasts drop Dewdrops that grow them. Off everywhere paces are measured.
   */
  story?: boolean;
  /** Story only: the Great Clock's gifts in force today (see campaign/upgrades.ts). */
  abilities?: ReadonlySet<Ability>;
  /** Story only: what the Warden had already seen of this section; marked further as they go. */
  explored?: Uint8Array;
  /** Story only: sprays brought along. */
  items?: { emberbrew: number; stillwater: number };
}

export interface SimStats {
  treasureValue: number;
  treasuresCollected: string[];
  treasuresTotal: number;
  workersLost: number;
  /** Story only: berries carried home today, by kind. */
  berries: { ember: number; still: number };
  enemiesDefeated: number;
  /** Kinds of beast beaten today. */
  beatenKinds: string[];
  bossesDefeated: string[];
  bloomsCollected: number;
  /** Seconds into the day at which each Sunshard arrived, in order: the day's splits. */
  deliveryTimes: number[];
  /** Longest run of deliveries each within CHAIN.window of the last. */
  bestChain: number;
  /** Optional treasure taken: Glowcaps home, twin pairs paid, Dewglass home whole, and points. */
  bonus: {
    glowcaps: number;
    glowcapPoints: number;
    twins: number;
    twinPoints: number;
    dewglass: number;
    dewglassPoints: number;
  };
  /** Sproutlings the Kiln was given to grow today. */
  grown: number;
  /** Sproutlings whistled out of fire or water in time. */
  rescued: number;
  /** Sproutlings lost to fire or water. */
  perilLosses: number;
  /** Every haul delivered, in order. */
  deliveries: Delivery[];
  /** Total weight of treasure, carcasses and Glowcaps delivered (not pods, Sap or logs). */
  weightDelivered: number;
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
/** How often the day's timeline is noted, in steps: every five seconds. */
export const TIMELINE_EVERY = 300;

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
  /**
   * Every kind of Sproutling that has been part of the day: those it started with, those its
   * seed pods grow, and any that came down from above. The Kiln never lets one of them die out.
   */
  readonly knownKinds = new Set<SproutKind>();

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
  readonly endsWhen: EndsWhen;
  /** Whether the Kiln grows new Sproutlings from pods and carcasses. */
  readonly growth: boolean;
  /** A day with no clock (see `LevelDefinition.untimed`): only its goal or the player ends it. */
  readonly untimed: boolean;
  /** The story's growing and plucking (see `SimOptions.story`). */
  readonly story: boolean;
  /** The Great Clock's gifts in force today; always empty outside the story. */
  readonly abilities: ReadonlySet<Ability>;
  /** Story only: the fog-of-war map of what the Warden has seen (see campaign/fog.ts). */
  readonly explored: Uint8Array | null;
  /**
   * Story only, once the Clock grants it: the second Warden. One is played (`activeWarden`);
   * the other stands at `otherWarden` with their own squad. Null for a day with one Warden,
   * which is every day outside the story: nothing below changes anything then.
   */
  otherWarden: { x: number; z: number } | null = null;
  activeWarden = 0;
  /** Story only: sprays in hand today, and seconds left of an Emberbrew. */
  readonly items = { emberbrew: 0, stillwater: 0 };
  brewTimer = 0;
  /** The Warden's path through the day, (x, z) every TRACK_EVERY steps: a best run's ghost. */
  readonly track: number[] = [];
  /** The day as it went, every TIMELINE_EVERY steps: Sproutlings on the field and hauls home. */
  readonly timeline: { field: number[]; home: number[] } = { field: [], home: [] };
  /** Treasure the telescope has yet to show, and whether it has been looked through today. */
  readonly hiddenTreasures: TreasureSpawn[] = [];
  telescopeAimed = false;
  /** Dewdrops lying on the field, waiting to be drunk. */
  readonly dewdrops: Point[];
  /** Recent losses, newest last, for drawing each one's last moment (never read by the rules). */
  readonly fallen: { x: number; z: number; kind: SproutKind; cause: DeathCause; tick: number }[] =
    [];

  constructor(
    readonly level: LevelDefinition,
    options: SimOptions = {},
  ) {
    this.visit = options.visit ?? false;
    this.endsWhen = options.endsWhen ?? 'shards';
    this.growth = options.growth ?? true;
    this.untimed = level.untimed ?? false;
    this.story = options.story ?? false;
    this.items.emberbrew = this.story ? (options.items?.emberbrew ?? 0) : 0;
    this.items.stillwater = this.story ? (options.items?.stillwater ?? 0) : 0;
    this.abilities = this.story ? (options.abilities ?? new Set()) : new Set();
    this.explored = this.story ? (options.explored ?? emptyFog(level)) : null;
    this.dewdrops = [];
    this.hard = level.difficulty === 'hard';
    this.captainMaxHp = this.hard ? HARD.captainHp : CAPTAIN.maxHp;
    this.captainState.hp = this.captainMaxHp;
    this.walls = [
      ...level.obstacles,
      ...(level.gates ?? []),
      ...(level.water ?? []),
      ...(level.bridges ?? []).filter((bridge) => !bridge.built),
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
    this.bridges = (level.bridges ?? []).map((bridge) => {
      const site = new BridgeSite(bridge, bridge.bank, bridge.needs, this.nav);
      if (bridge.built) {
        site.built = true;
        site.delivered = bridge.needs;
      } else {
        site.delivered = Math.min(bridge.needs - 1, bridge.laid ?? 0);
      }
      return site;
    });
    this.beacons = (level.beacons ?? []).map((spot) => {
      const beacon = new Beacon(spot.x, spot.z, this.nav);
      beacon.lit = spot.lit ?? false;
      return beacon;
    });
    this.hatchAt = { ...level.kiln };
    this.timeLeft = level.dayLength;
    this.stats = {
      treasureValue: 0,
      treasuresCollected: [],
      treasuresTotal: shardCount(level),
      workersLost: 0,
      enemiesDefeated: 0,
      berries: { ember: 0, still: 0 },
      beatenKinds: [],
      bossesDefeated: [],
      bloomsCollected: 0,
      deliveryTimes: [],
      bestChain: 0,
      bonus: {
        glowcaps: 0,
        glowcapPoints: 0,
        twins: 0,
        twinPoints: 0,
        dewglass: 0,
        dewglassPoints: 0,
      },
      grown: 0,
      rescued: 0,
      perilLosses: 0,
      deliveries: [],
      weightDelivered: 0,
    };

    this.captain = this.ecs.create();
    this.captainTransform = this.transforms.set(this.captain, {
      x: level.captain.x,
      y: 0,
      z: level.captain.z,
      facing: 0,
    });
    this.anchor = { ...level.captain };
    if (this.explored) reveal(this.explored, level, level.captain.x, level.captain.z);
    if (this.abilities.has('secondWarden')) {
      // The second Warden starts beside the Kiln, ready to be switched to.
      this.otherWarden = this.nav.nearestWalkable(level.kiln.x + 4, level.kiln.z + 4);
    }
    this.cursor = { ...level.captain };

    const kinds = startingKinds(level);
    const seen: Partial<Record<SproutKind, number>> = {};
    kinds.forEach((kind, i) => {
      const nth = seen[kind] ?? 0;
      seen[kind] = nth + 1;
      const growth = level.squadGrowth?.[kind]?.[nth] ?? 0;
      const angle = (i / kinds.length) * Math.PI * 2;
      if (this.story) {
        // The story's squad waits in the ground round the Kiln, in rings, to be plucked.
        const ring = KILN.spawnRing + 0.6 + Math.floor(i / 12) * 0.9;
        const turn = ((i % 12) / 12) * Math.PI * 2 + Math.floor(i / 12) * 0.26;
        const spot = this.nav.nearestWalkable(
          level.kiln.x + Math.sin(turn) * ring,
          level.kiln.z + Math.cos(turn) * ring,
        );
        spawnWorker(this, spot.x, spot.z, 'planted', kind, growth);
        return;
      }
      const spot = this.nav.nearestWalkable(
        level.captain.x + Math.sin(angle) * 1.5,
        level.captain.z + Math.cos(angle) * 1.5,
      );
      spawnWorker(this, spot.x, spot.z, 'follow', kind, growth);
    });
    this.selected = kinds[0] ?? 'ember';
    if (this.story) {
      (level.berries ?? []).forEach((berry, index) => spawnBerry(this, berry, index, berry.kind));
      for (const drop of level.dewdrops ?? [])
        this.dewdrops.push(this.nav.nearestWalkable(drop.x, drop.z));
    }
    // Treasure shown only by the telescope waits until it is looked through.
    const hidden = new Set(level.telescope?.reveals ?? []);
    for (const treasure of level.treasures) {
      if (hidden.has(treasure.id)) this.hiddenTreasures.push(treasure);
      else spawnTreasure(this, treasure);
    }
    level.pods.forEach((pod, index) => spawnPod(this, pod, index, pod.kind));
    for (const pod of level.pods) if (pod.kind) this.knownKinds.add(pod.kind);
    (level.logs ?? []).forEach((log, index) => spawnLog(this, log, index));
    (level.saps ?? []).forEach((sap, index) => spawnSap(this, sap, index));
    level.enemies.forEach((enemy, spawn) => {
      spawnEnemy(this, enemy.x, enemy.z, enemy.kind, {
        drop: enemy.drop ?? 0,
        reveals: enemy.reveals,
        spawn,
      });
    });
    (level.gates ?? []).forEach((gate, spawn) => {
      const enemy = spawnEnemy(this, gate.x, gate.z, 'gate', { hp: gate.hp, shape: gate, spawn });
      // A gate worn down on an earlier day of the story starts the day as damaged as it was.
      if (gate.left !== undefined) this.enemies.require(enemy).hp = Math.min(gate.hp, gate.left);
    });
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
    updateConveyors(this, dt);
    if (this.tick % TIMELINE_EVERY === 0) {
      this.timeline.field.push(this.workers.size);
      this.timeline.home.push(this.stats.treasuresCollected.length);
    }
    if (this.tick % TRACK_EVERY === 0) {
      this.track.push(
        Math.round(this.captainTransform.x * 10) / 10,
        Math.round(this.captainTransform.z * 10) / 10,
      );
    }
    updateKiln(this, dt);
    updateDewdrops(this);
    this.brewTimer = Math.max(0, this.brewTimer - dt);
    // Two Wardens close together merge their squads.
    if (this.otherWarden) {
      const { x, z } = this.otherWarden;
      if (Math.hypot(this.captainTransform.x - x, this.captainTransform.z - z) < ITEM.mergeRange) {
        for (const [, worker] of this.workers.entries()) worker.party = this.activeWarden;
      }
    }
    // The fog lifts round the Warden: a few times a second is plenty.
    if (this.explored && this.tick % 15 === 0) {
      reveal(this.explored, this.level, this.captainTransform.x, this.captainTransform.z);
    }

    if (!this.visit && !this.untimed) this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.ended) return;
    if (this.goalMet()) {
      this.ended = 'allCollected';
    } else if (this.workers.size === 0 && this.kiln.queue.length === 0) {
      this.ended = 'wipedOut';
    } else if (this.timeLeft === 0 && !this.untimed) {
      this.ended = 'timeUp';
    }
  }

  /** Whether every Sunshard is home. */
  get cleared(): boolean {
    return this.stats.treasuresCollected.length === this.stats.treasuresTotal;
  }

  /** Beasts still standing: not mounds, gates or root-knots (the Lanternroot itself counts). */
  beastsLeft(): number {
    let left = 0;
    for (const [, enemy] of this.enemies.entries()) {
      if (enemy.hp <= 0 || enemy.shape) continue;
      if (enemy.kind === 'mound' || enemy.kind === 'rootknot' || enemy.kind === 'gate') continue;
      left++;
    }
    return left;
  }

  /** Whether everything is collected: every Sunshard home, every beast down, every carcass home. */
  everythingCollected(): boolean {
    if (!this.cleared || this.beastsLeft() > 0) return false;
    for (const [, carryable] of this.carryables.entries()) {
      if (carryable.kind === 'carcass') return false;
    }
    return true;
  }

  /** Whether the day's own goal is met, by the mode's rule. */
  private goalMet(): boolean {
    if (this.endsWhen === 'clock') return false;
    return this.endsWhen === 'everything' ? this.everythingCollected() : this.cleared;
  }

  /** Ends the day now, from the pause menu: whatever is home counts, and the clock stops here. */
  endNow(): void {
    if (!this.ended) this.ended = 'endedEarly';
  }

  /** True on open water: a river, or a bridge site not yet built. */
  inWater(x: number, z: number): boolean {
    const inside = (box: Box): boolean =>
      Math.abs(x - box.x) <= box.w / 2 && Math.abs(z - box.z) <= box.d / 2;
    if ((this.level.water ?? []).some(inside)) return true;
    return this.bridges.some((site) => !site.built && inside(site.box));
  }

  emit(type: SimEventType, x: number, z: number, amount = 0, kind?: SproutKind): void {
    this.events.push(kind ? { type, x, z, amount, kind } : { type, x, z, amount });
  }

  /**
   * Switches to the other Warden: the camera and the controls go to them, and the Warden just
   * left stands where they are with their squad.
   */
  switchWarden(): boolean {
    const other = this.otherWarden;
    if (!other) return false;
    const here = { x: this.captainTransform.x, z: this.captainTransform.z };
    this.physics.placeCaptain(other);
    this.captainTransform.x = other.x;
    this.captainTransform.z = other.z;
    this.otherWarden = here;
    this.activeWarden = 1 - this.activeWarden;
    this.emit('select', other.x, other.z);
    return true;
  }

  /** Sends half of the squad (the back half of each kind) over to the other Warden. */
  splitSquad(): number {
    if (!this.otherWarden) return 0;
    const squad = [...this.workers.entries()].filter(
      ([, w]) => w.state === 'follow' && w.party === this.activeWarden,
    );
    let sent = 0;
    squad.forEach(([, worker], i) => {
      if (i % 2 === 1) {
        worker.party = 1 - this.activeWarden;
        sent++;
      }
    });
    return sent;
  }

  /** Emberbrew: for 20 seconds the squad walks a third faster and strikes half as hard again. */
  sprayEmberbrew(): boolean {
    if (this.items.emberbrew <= 0) return false;
    this.items.emberbrew--;
    this.brewTimer = ITEM.brewSeconds;
    this.emit('sap', this.captainTransform.x, this.captainTransform.z, ITEM.brewSeconds);
    return true;
  }

  /** Stillwater: every beast near the Warden stands frozen for 8 seconds. */
  sprayStillwater(): boolean {
    if (this.items.stillwater <= 0) return false;
    this.items.stillwater--;
    const { x, z } = this.captainTransform;
    for (const [entity, enemy] of this.enemies.entries()) {
      if (enemy.shape || enemy.hp <= 0) continue;
      const at = this.transforms.require(entity);
      if (Math.hypot(at.x - x, at.z - z) > ITEM.stillRange) continue;
      enemy.state = 'recover';
      enemy.timer = Math.max(enemy.timer, ITEM.stillSeconds);
    }
    this.emit('splash', x, z);
    return true;
  }

  /** Looks through the telescope: the treasure it shows appears where it lies. */
  aimTelescope(): boolean {
    if (this.telescopeAimed || !this.level.telescope) return false;
    this.telescopeAimed = true;
    for (const treasure of this.hiddenTreasures.splice(0)) spawnTreasure(this, treasure);
    this.entityVersion++;
    this.emit('beaconLit', this.level.telescope.x, this.level.telescope.z);
    return true;
  }

  countWorkers(): WorkerCounts {
    const counts: WorkerCounts = { total: this.workers.size, squad: 0, idle: 0, working: 0 };
    for (const [, worker] of this.workers.entries()) {
      if (worker.state === 'follow' && worker.party === this.activeWarden) counts.squad++;
      else if (worker.state === 'idle' || worker.state === 'planted') counts.idle++;
      else counts.working++;
    }
    return counts;
  }

  dispose(): void {
    this.physics.dispose();
  }
}
