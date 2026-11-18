import { WORKER } from '../core/config';
import { removeWorker } from '../workers/squad';
import type { SproutKind } from '../workers/sprouts';
import { LEVELS } from '../world/level';
import { spawnWorker } from '../world/spawn';
import { Simulation } from './Simulation';

/** What the Warden brought back from below over a day: for the results and the Field Guide. */
export interface Haul {
  /** Relics brought home below, as `caveId:treasureId`, for the Field Guide. */
  relics: string[];
  /** Score their relics were worth: shown, not counted towards the day's rank. */
  value: number;
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
  private readonly lossesCounted = new Map<string, number>();
  private readonly enemiesCounted = new Map<string, number>();
  readonly haul: Haul = { relics: [], value: 0 };

  constructor(surface: Simulation) {
    this.surface = surface;
    this.active = surface;
  }

  get below(): boolean {
    return this.active !== this.surface;
  }

  /** The cave the Warden is in, or null on the surface. */
  get cave(): Simulation | null {
    return this.below ? this.active : null;
  }

  /** Why the way down cannot be taken right now, or null if it can. */
  blocked(): string | null {
    const descent = this.surface.level.descent;
    if (this.below || !descent) return 'There is no way down here.';
    if (this.caves.get(descent.to)?.ended === 'allCollected') return 'Nothing left down there.';
    for (const [, worker] of this.surface.workers.entries())
      if (worker.state === 'follow') return null;
    return 'Whistle up a squad to take down with you.';
  }

  /** Takes the squad down the surface's way down. False if it cannot be taken (see `blocked`). */
  descend(): boolean {
    const descent = this.surface.level.descent;
    if (!descent || this.blocked()) return false;
    const spec = LEVELS.find((level) => level.id === descent.to);
    if (!spec) return false;
    const squad: SproutKind[] = [];
    for (const [entity, worker] of [...this.surface.workers.entries()]) {
      if (worker.state !== 'follow') continue;
      squad.push(worker.kind);
      removeWorker(this.surface, entity, worker);
    }
    this.surface.entityVersion++;
    let cave = this.caves.get(spec.id);
    if (!cave) {
      // Created empty: whoever comes down is the squad.
      cave = new Simulation({ ...spec, startingWorkers: 0, squad: {} }, { visit: true });
      this.caves.set(spec.id, cave);
      this.counted.set(spec.id, 0);
      this.lossesCounted.set(spec.id, 0);
      this.enemiesCounted.set(spec.id, 0);
    } else {
      cave.physics.placeCaptain(spec.captain);
      cave.captainTransform.x = spec.captain.x;
      cave.captainTransform.z = spec.captain.z;
    }
    // A cave everyone was lost in is open again to a new squad.
    if (cave.ended === 'wipedOut') cave.ended = null;
    cave.captainState.hp = this.surface.captainState.hp;
    cave.captainState.invuln = 0;
    arrive(cave, squad, spec.captain);
    if (squad.length > 0)
      cave.selected = squad.includes(this.surface.selected) ? this.surface.selected : squad[0];
    this.active = cave;
    return true;
  }

  /** Brings everyone below back up the way they came, and settles what was found down there. */
  ascend(): void {
    const cave = this.cave;
    if (!cave) return;
    const id = cave.level.id;
    const party: SproutKind[] = [];
    for (const [entity, worker] of [...cave.workers.entries()]) {
      party.push(worker.kind);
      removeWorker(cave, entity, worker);
    }
    // Sproutlings still growing below come up with the rest.
    party.push(...cave.kiln.queue.splice(0));
    cave.entityVersion++;

    const found = cave.stats.treasuresCollected;
    const already = this.counted.get(id) ?? 0;
    for (const relic of found.slice(already)) this.haul.relics.push(`${id}:${relic}`);
    this.counted.set(id, found.length);
    this.haul.value = [...this.caves.values()].reduce((sum, c) => sum + c.stats.treasureValue, 0);
    // Losses and wins below are the day's too.
    this.surface.stats.workersLost += cave.stats.workersLost - (this.lossesCounted.get(id) ?? 0);
    this.lossesCounted.set(id, cave.stats.workersLost);
    this.surface.stats.enemiesDefeated +=
      cave.stats.enemiesDefeated - (this.enemiesCounted.get(id) ?? 0);
    this.enemiesCounted.set(id, cave.stats.enemiesDefeated);
    for (const boss of cave.stats.bossesDefeated) {
      if (!this.surface.stats.bossesDefeated.includes(boss))
        this.surface.stats.bossesDefeated.push(boss);
    }

    this.surface.captainState.hp = cave.captainState.hp;
    const descent = this.surface.level.descent ?? this.surface.level.captain;
    arrive(this.surface, party, descent);
    this.surface.entityVersion++;
    this.active = this.surface;
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
      this.ascend();
      return;
    }
    // Every relic found, or nobody left to carry them: back up.
    this.ascend();
  }

  dispose(): void {
    this.surface.dispose();
    for (const cave of this.caves.values()) cave.dispose();
  }
}

/** Places arriving Sproutlings round a point as the squad; any over the field's limit wait in the Kiln. */
function arrive(sim: Simulation, kinds: readonly SproutKind[], at: { x: number; z: number }): void {
  kinds.forEach((kind, i) => {
    if (sim.workers.size >= WORKER.maxOnField) {
      sim.kiln.queue.push(kind);
      return;
    }
    const angle = (i / Math.max(1, kinds.length)) * Math.PI * 2;
    const spot = sim.nav.nearestWalkable(
      at.x + Math.sin(angle) * 1.6,
      at.z + Math.cos(angle) * 1.6,
    );
    spawnWorker(sim, spot.x, spot.z, 'follow', kind);
  });
}
