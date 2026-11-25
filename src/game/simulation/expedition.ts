import { WORKER } from '../core/config';
import { removeWorker } from '../workers/squad';
import type { SproutKind } from '../workers/sprouts';
import { defineLevel, LEVELS, type LevelDefinition } from '../world/level';
import { STORY_CAVES } from '../campaign/sections';
import { spawnWorker } from '../world/spawn';
import { Simulation } from './Simulation';

/** Counts below that belong to the whole day once the Warden comes back up. */
const CARRIED_STATS = [
  'workersLost',
  'enemiesDefeated',
  'grown',
  'rescued',
  'perilLosses',
] as const;
type CarriedStat = (typeof CARRIED_STATS)[number];

/** What the Warden brought back from below over a day: for the results and the Field Guide. */
export interface Haul {
  /** Relics brought home below, as `caveId:treasureId`, for the Field Guide. */
  relics: string[];
  /** Score their relics were worth: shown, not counted towards the day's rank. */
  value: number;
  /** Caves gone down into and come back up from, and those emptied of every relic. */
  caves: string[];
  emptied: string[];
}

/**
 * One day, with every cave the Warden goes down into on the way. The surface is a
 * simulation; each cave is another, created the first time it is entered and kept for the
 * rest of the day. Only one runs at a time: going down freezes the surface where it is,
 * clock and all, and coming back up resumes it exactly as it was left.
 *
 * The squad goes down with the Warden and everyone below comes back up with it, including
 * Sproutlings grown down there. Losses below are losses. If the Warden falls below, the day
 * is over.
 */
export class Expedition {
  readonly surface: Simulation;
  active: Simulation;
  private readonly caves = new Map<string, Simulation>();
  /** Per cave: relics already counted, so coming up twice never counts one twice. */
  private readonly counted = new Map<string, number>();
  /** Per cave: deliveries already pooled into the surface's day (an Expedition's caves). */
  private readonly pooledDeliveries = new Map<string, number>();
  /** Per cave: the running counts already carried up to the surface's day. */
  private readonly carried = new Map<string, Record<CarriedStat, number>>();
  readonly haul: Haul = { relics: [], value: 0, caves: [], emptied: [] };

  /**
   * Story only: shapes a cave before it is first entered today (its treasure already home, or
   * out of reach, taken out). Elsewhere a cave is entered as written.
   */
  caveFilter: ((spec: LevelDefinition) => LevelDefinition) | null = null;

  /**
   * The places the Warden has come down through to reach the active one, the surface first:
   * a cave can have a way down of its own to a deeper floor.
   */
  private readonly path: Simulation[] = [];

  constructor(surface: Simulation) {
    this.surface = surface;
    this.active = surface;
    this.path.push(surface);
  }

  /**
   * Whether the caves are the day's own (an Expedition): their treasure counts with the field's
   * when it comes up, rather than going to the Field Guide as relics.
   */
  get pooled(): boolean {
    return this.surface.level.floors !== undefined;
  }

  /**
   * Whether the floor `id` and every floor below it have been emptied. An Expedition's floor with
   * a way down never ends by itself, so it is judged by what is home.
   */
  emptied(id: string): boolean {
    const cave = this.caves.get(id);
    if (!cave || !cave.cleared) return false;
    const deeper = cave.level.descent?.to;
    return deeper === undefined || this.emptied(deeper);
  }

  get below(): boolean {
    return this.active !== this.surface;
  }

  /** How many floors down the Warden is: 0 on the surface. */
  get depth(): number {
    return this.path.length - 1;
  }

  /** The cave the Warden is in, or null on the surface. */
  get cave(): Simulation | null {
    return this.below ? this.active : null;
  }

  /** Why the way down cannot be taken right now, or null if it can. */
  blocked(): string | null {
    const descent = this.active.level.descent;
    if (!descent) return 'There is no way down here.';
    if (this.caves.get(descent.to)?.ended === 'allCollected') return 'Nothing left down there.';
    for (const [, worker] of this.active.workers.entries())
      if (worker.state === 'follow') return null;
    return 'Whistle up a squad to take down with you.';
  }

  /** Takes the squad down the way down where the Warden is. False if it cannot be taken. */
  descend(): boolean {
    const upper = this.active;
    const descent = upper.level.descent;
    if (!descent || this.blocked()) return false;
    const floor = this.surface.level.floors?.find((spec) => spec.id === descent.to);
    const written =
      (floor ? defineLevel(floor) : undefined) ??
      LEVELS.find((level) => level.id === descent.to) ??
      STORY_CAVES.find((level) => level.id === descent.to);
    const spec = written && this.caveFilter ? this.caveFilter(written) : written;
    if (!spec) return false;
    const squad: Traveller[] = [];
    for (const [entity, worker] of [...upper.workers.entries()]) {
      if (worker.state !== 'follow' || worker.party !== upper.activeWarden) continue;
      squad.push({ kind: worker.kind, growth: worker.growth });
      removeWorker(upper, entity, worker);
    }
    upper.entityVersion++;
    let cave = this.caves.get(spec.id);
    if (!cave) {
      // Created empty: whoever comes down is the squad. An Expedition's floor with a way down
      // stays open until left (its last floor ends, and sends everyone up, once emptied).
      cave = new Simulation(
        { ...spec, startingWorkers: 0, squad: {} },
        { visit: true, ...(floor && spec.descent ? { endsWhen: 'clock' as const } : {}) },
      );
      this.caves.set(spec.id, cave);
      this.counted.set(spec.id, 0);
      this.carried.set(spec.id, {
        workersLost: 0,
        enemiesDefeated: 0,
        grown: 0,
        rescued: 0,
        perilLosses: 0,
      });
    } else {
      cave.physics.placeCaptain(spec.captain);
      cave.captainTransform.x = spec.captain.x;
      cave.captainTransform.z = spec.captain.z;
    }
    // A cave everyone was lost in is open again to a new squad.
    if (cave.ended === 'wipedOut') cave.ended = null;
    cave.captainState.hp = upper.captainState.hp;
    cave.captainState.invuln = 0;
    arrive(cave, squad, spec.captain);
    if (squad.length > 0)
      cave.selected = squad.some(({ kind }) => kind === upper.selected)
        ? upper.selected
        : squad[0].kind;
    this.active = cave;
    this.path.push(cave);
    return true;
  }

  /**
   * Brings everyone back up one floor, the way they came, and settles what was found down
   * there into the day (on the surface's tally, wherever they arrive).
   */
  ascend(): void {
    const cave = this.cave;
    if (!cave) return;
    const id = cave.level.id;
    const party: Traveller[] = [];
    for (const [entity, worker] of [...cave.workers.entries()]) {
      party.push({ kind: worker.kind, growth: worker.growth });
      removeWorker(cave, entity, worker);
    }
    // Sproutlings still growing below come up with the rest.
    party.push(...cave.kiln.queue.splice(0).map((kind) => ({ kind, growth: 0 })));
    cave.entityVersion++;

    const found = cave.stats.treasuresCollected;
    const already = this.counted.get(id) ?? 0;
    if (this.pooled) {
      // An Expedition's floors are the day's: what came up is the field's treasure too.
      const surface = this.surface.stats;
      for (const shard of found.slice(already)) surface.treasuresCollected.push(`${id}:${shard}`);
      const deliveries = cave.stats.deliveries.slice(this.pooledDeliveries.get(id) ?? 0);
      for (const delivery of deliveries) {
        surface.deliveries.push(delivery);
        surface.weightDelivered += delivery.weight;
      }
      this.pooledDeliveries.set(id, cave.stats.deliveries.length);
      surface.treasureValue += cave.stats.treasureValue - this.pooledValue(id);
      this.poolValue.set(id, cave.stats.treasureValue);
    } else {
      for (const relic of found.slice(already)) this.haul.relics.push(`${id}:${relic}`);
    }
    this.counted.set(id, found.length);
    if (!this.pooled) {
      this.haul.value = [...this.caves.values()].reduce((sum, c) => sum + c.stats.treasureValue, 0);
    }
    // Losses, wins, growth and rescues below are the day's too.
    const carried = this.carried.get(id);
    if (carried) {
      for (const stat of CARRIED_STATS) {
        this.surface.stats[stat] += cave.stats[stat] - carried[stat];
        carried[stat] = cave.stats[stat];
      }
    }
    if (!this.haul.caves.includes(id)) this.haul.caves.push(id);
    const empty = cave.stats.treasuresCollected.length === cave.stats.treasuresTotal;
    if (empty && !this.haul.emptied.includes(id)) this.haul.emptied.push(id);
    for (const boss of cave.stats.bossesDefeated) {
      if (!this.surface.stats.bossesDefeated.includes(boss))
        this.surface.stats.bossesDefeated.push(boss);
    }

    this.path.pop();
    const upper = this.path[this.path.length - 1] ?? this.surface;
    upper.captainState.hp = cave.captainState.hp;
    const descent = upper.level.descent ?? upper.level.captain;
    arrive(upper, party, descent);
    upper.entityVersion++;
    this.active = upper;
  }

  /**
   * Called after each step below: a cave that is finished sends everyone back up. A Warden
   * who falls below ends the whole day.
   */
  settle(): void {
    const cave = this.cave;
    if (!cave?.ended) return;
    if (cave.ended === 'captainDown') {
      this.surface.captainState.hp = 0;
      this.surface.ended = 'captainDown';
      // Everyone comes back up from every floor: the day is over.
      while (this.below) this.ascend();
      return;
    }
    // Every relic found, or nobody left to carry them: back up.
    this.ascend();
  }

  /** Treasure value already pooled up from a cave. */
  private readonly poolValue = new Map<string, number>();
  private pooledValue(id: string): number {
    return this.poolValue.get(id) ?? 0;
  }

  dispose(): void {
    this.surface.dispose();
    for (const cave of this.caves.values()) cave.dispose();
  }
}

/** Places arriving Sproutlings round a point as the squad; any over the field's limit wait in the Kiln. */
/** A Sproutling going down or coming up: its kind and how grown it is. */
interface Traveller {
  kind: SproutKind;
  growth: number;
}

function arrive(sim: Simulation, kinds: readonly Traveller[], at: { x: number; z: number }): void {
  kinds.forEach(({ kind, growth }, i) => {
    if (sim.workers.size >= WORKER.maxOnField) {
      sim.kiln.queue.push(kind);
      return;
    }
    const angle = (i / Math.max(1, kinds.length)) * Math.PI * 2;
    const spot = sim.nav.nearestWalkable(
      at.x + Math.sin(angle) * 1.6,
      at.z + Math.cos(angle) * 1.6,
    );
    spawnWorker(sim, spot.x, spot.z, 'follow', kind, growth);
  });
}
