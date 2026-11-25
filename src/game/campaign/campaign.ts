import { WORKER } from '../core/config';
import type { Simulation } from '../simulation/Simulation';
import { SPROUT_KINDS, type Squad, type SproutKind } from '../workers/sprouts';
import { defineLevel, type LevelDefinition, type LevelSpec } from '../world/level';
import { CAMPAIGN_SECTIONS, sectionById, type CampaignSection } from './sections';

/**
 * The story: an open expedition played day after day on one section of the grounds at a time.
 * Nothing about a day is thrown away. Whatever was carried home, beaten, broken, built or lit
 * stays that way, and the next day's field is the section with all of that taken out. The
 * Sproutlings who make it home by sunset wait in the Kiln for tomorrow; the rest are lost.
 */

/** Sproutlings within this distance of the Kiln or a lit beacon are safe at sunset. */
export const SAFE_RADIUS = 10;

/** The Kiln's stock on the first day: ten Emberlings, as on the Warden's first day at school. */
export const STARTING_STOCK: Readonly<Record<SproutKind, number>> = {
  ember: 10,
  dew: 0,
  stone: 0,
  spark: 0,
};

export interface CampaignState {
  /** Days played so far. */
  day: number;
  /** The section being explored. */
  section: string;
  /** Sproutlings waiting in the Kiln, by kind. */
  stock: Record<SproutKind, number>;
  /**
   * How grown each of them is (see `stageOf`), most grown first, one entry per Sproutling in
   * `stock`. Saves from before 0.23 have none: everyone is a leaf.
   */
  growth: Record<SproutKind, number[]>;
  /**
   * What is done for good on the section: `treasure:<id>` brought home, and `enemy:<n>`,
   * `gate:<n>`, `bridge:<n>`, `beacon:<n>`, `pod:<n>`, `log:<n>` and `sap:<n>` beaten,
   * broken, built, lit or used up, by their place in the section's lists.
   */
  done: string[];
  /** Work left half done overnight: `gate:<n>` health left, `bridge:<n>` Span-logs laid. */
  wear: Record<string, number>;
  /** The day each Great Clock part came home, by treasure id. */
  parts: Record<string, number>;
  /** The day the section's last part came home, or null while any is still out. */
  finished: number | null;
  /** Running counts over the whole story. */
  totals: { grown: number; lost: number; leftBehind: number };
}

export function newCampaign(): CampaignState {
  return {
    day: 0,
    section: CAMPAIGN_SECTIONS[0].id,
    stock: { ...STARTING_STOCK },
    growth: fitGrowth({ ...STARTING_STOCK }, undefined),
    done: [],
    wear: {},
    parts: {},
    finished: null,
    totals: { grown: 0, lost: 0, leftBehind: 0 },
  };
}

/** One entry per Sproutling in stock, most grown first: missing ones are leaves, extras dropped. */
export function fitGrowth(
  stock: Record<SproutKind, number>,
  growth: Partial<Record<SproutKind, readonly number[]>> | undefined,
): Record<SproutKind, number[]> {
  return Object.fromEntries(
    SPROUT_KINDS.map((kind) => {
      const known = [...(growth?.[kind] ?? [])].sort((a, b) => b - a).slice(0, stock[kind]);
      while (known.length < stock[kind]) known.push(0);
      return [kind, known];
    }),
  ) as Record<SproutKind, number[]>;
}

/** The section a story is on. */
export function currentSection(state: CampaignState): CampaignSection {
  return sectionById(state.section) ?? CAMPAIGN_SECTIONS[0];
}

/** Sproutlings in the Kiln, all kinds together. */
export function stockTotal(stock: Record<SproutKind, number>): number {
  return SPROUT_KINDS.reduce((sum, kind) => sum + stock[kind], 0);
}

/**
 * Who goes out today: everyone in the Kiln, up to the field's limit, taking the kinds in turn
 * so that each is represented. An empty Kiln still coaxes out a single Emberling.
 */
export function dayParty(stock: Record<SproutKind, number>): Squad {
  const total = stockTotal(stock);
  if (total === 0) return { ember: 1 };
  if (total <= WORKER.maxOnField) {
    return Object.fromEntries(
      SPROUT_KINDS.filter((kind) => stock[kind] > 0).map((kind) => [kind, stock[kind]]),
    );
  }
  const party: Record<SproutKind, number> = { ember: 0, dew: 0, stone: 0, spark: 0 };
  let taken = 0;
  while (taken < WORKER.maxOnField) {
    for (const kind of SPROUT_KINDS) {
      if (taken >= WORKER.maxOnField) break;
      if (party[kind] < stock[kind]) {
        party[kind]++;
        taken++;
      }
    }
  }
  return party;
}

/** A day's field and where each of its things sits in the section's own lists. */
export interface DayField {
  level: LevelDefinition;
  section: CampaignSection;
  origin: { enemies: number[]; gates: number[]; pods: number[]; logs: number[]; saps: number[] };
}

/** The items of a list that are not done, each with its place in the full list. */
function remaining<T>(items: readonly T[] | undefined, key: string, done: ReadonlySet<string>) {
  const kept: T[] = [];
  const origin: number[] = [];
  (items ?? []).forEach((item, index) => {
    if (done.has(`${key}:${index}`)) return;
    kept.push(item);
    origin.push(index);
  });
  return { kept, origin };
}

/** The field for the story's next day: the section with everything already done taken out. */
export function dayField(state: CampaignState): DayField {
  const section = currentSection(state);
  const base = section.level;
  const done = new Set(state.done);
  const enemies = remaining(base.enemies, 'enemy', done);
  const gates = remaining(base.gates, 'gate', done);
  const pods = remaining(base.pods, 'pod', done);
  const logs = remaining(base.logs, 'log', done);
  const saps = remaining(base.saps, 'sap', done);
  const party = dayParty(state.stock);
  const spec: LevelSpec = {
    ...base,
    // A new day has its own weather: the beasts wander and the drips fall a little differently.
    seed: base.seed + state.day,
    startingWorkers: SPROUT_KINDS.reduce((sum, kind) => sum + (party[kind] ?? 0), 0),
    squad: party,
    // The most grown go out first.
    squadGrowth: Object.fromEntries(
      SPROUT_KINDS.map((kind) => [kind, state.growth[kind].slice(0, party[kind] ?? 0)]),
    ),
    treasures: base.treasures.filter((treasure) => !done.has(`treasure:${treasure.id}`)),
    enemies: enemies.kept,
    gates: gates.kept.map((gate, i) => {
      const left = state.wear[`gate:${gates.origin[i]}`];
      return left === undefined ? gate : { ...gate, left };
    }),
    pods: pods.kept,
    logs: logs.kept,
    saps: saps.kept,
    bridges: (base.bridges ?? []).map((bridge, index) =>
      done.has(`bridge:${index}`)
        ? { ...bridge, built: true }
        : { ...bridge, laid: state.wear[`bridge:${index}`] ?? 0 },
    ),
    beacons: (base.beacons ?? []).map((beacon, index) => ({
      ...beacon,
      lit: done.has(`beacon:${index}`),
    })),
  };
  return {
    level: defineLevel(spec),
    section,
    origin: {
      enemies: enemies.origin,
      gates: gates.origin,
      pods: pods.origin,
      logs: logs.origin,
      saps: saps.origin,
    },
  };
}

/** What one story day did, for the results and the base camp. */
export interface CampaignReport {
  /** The day just played, counting from 1. */
  day: number;
  /** Great Clock parts brought home today, by treasure id. */
  newParts: string[];
  partsHome: number;
  partsTotal: number;
  /** Other relics brought home today. */
  relics: number;
  /** Sproutlings who made it back by sunset, by kind, and the Kiln's stock for tomorrow. */
  survivors: Record<SproutKind, number>;
  stock: Record<SproutKind, number>;
  /** Sproutlings lost during the day, and those left out in the field at sunset. */
  lost: number;
  leftBehind: number;
  grown: number;
  /** Beasts beaten for good, gates broken, bridges finished and beacons lit today. */
  beasts: number;
  gates: number;
  bridges: number;
  beacons: number;
  /** True on the day the last part came home. */
  finishedToday: boolean;
}

/** Whether a Sproutling at (x, z) is safe for the night. */
function safe(sim: Simulation, x: number, z: number): boolean {
  const { kiln } = sim.level;
  if (Math.hypot(x - kiln.x, z - kiln.z) <= SAFE_RADIUS) return true;
  return sim.beacons.some(
    (beacon) => beacon.lit && Math.hypot(x - beacon.x, z - beacon.z) <= SAFE_RADIUS,
  );
}

/**
 * Settles a finished day into the story. Everything taken out of the world stays out, and the
 * Sproutlings in the squad or near the Kiln or a lit beacon are counted into the Kiln, with
 * any it had not yet grown. Everyone else is lost to the night. If the whole squad was lost,
 * nobody is left to bring home.
 */
export function settleDay(
  state: CampaignState,
  field: DayField,
  sim: Simulation,
): { state: CampaignState; report: CampaignReport } {
  const { section, origin } = field;
  const base = section.level;
  const day = state.day + 1;
  const done = new Set(state.done);
  const wear: Record<string, number> = { ...state.wear };
  // Work finished today needs no wear remembered.
  const finished = new Set<string>();
  const add = (key: string): boolean => {
    if (done.has(key)) return false;
    done.add(key);
    return true;
  };

  // Treasure brought home.
  const home = new Set(sim.stats.treasuresCollected);
  const parts = { ...state.parts };
  const newParts: string[] = [];
  let relics = 0;
  for (const treasure of base.treasures) {
    if (!home.has(treasure.id) || !add(`treasure:${treasure.id}`)) continue;
    if (section.parts.includes(treasure.id)) {
      parts[treasure.id] = day;
      newParts.push(treasure.id);
    } else {
      relics++;
    }
  }

  // Beasts and mounds still standing, and gates still up, by their place in today's lists.
  const standing = new Set<number>();
  const gatesUp = new Map<number, number>();
  for (const [, enemy] of sim.enemies.entries()) {
    if (enemy.spawn < 0 || enemy.hp <= 0) continue;
    if (enemy.kind === 'gate') gatesUp.set(enemy.spawn, enemy.hp);
    else standing.add(enemy.spawn);
  }
  // Each kind's dropped shard, as many times as one came home today.
  const dropsHome = new Map<string, number>();
  for (const id of sim.stats.treasuresCollected) dropsHome.set(id, (dropsHome.get(id) ?? 0) + 1);
  let beasts = 0;
  field.level.enemies.forEach((enemy, index) => {
    if (standing.has(index)) return;
    // A beast whose shard was left lying out is back tomorrow, shard and all.
    if ((enemy.drop ?? 0) > 0) {
      const key = `${enemy.kind}-shard`;
      const left = dropsHome.get(key) ?? 0;
      if (left <= 0) return;
      dropsHome.set(key, left - 1);
      relics++;
    }
    if (add(`enemy:${origin.enemies[index]}`) && enemy.kind !== 'mound') beasts++;
  });
  let gates = 0;
  (field.level.gates ?? []).forEach((gate, index) => {
    const key = `gate:${origin.gates[index]}`;
    const left = gatesUp.get(index);
    if (left === undefined) {
      if (add(key)) gates++;
      finished.add(key);
    } else if (left < gate.hp) {
      wear[key] = Math.ceil(left);
    }
  });

  // Bridges and beacons keep their places in the section's lists.
  let bridges = 0;
  sim.bridges.forEach((site, index) => {
    const key = `bridge:${index}`;
    if (site.built) {
      if (add(key)) bridges++;
      finished.add(key);
    } else if (site.delivered > 0) {
      wear[key] = site.delivered;
    }
  });
  let beacons = 0;
  sim.beacons.forEach((beacon, index) => {
    if (beacon.lit && add(`beacon:${index}`)) beacons++;
  });

  // Pods, Span-logs and Sapdrops that are gone from the field were used.
  const lying = new Set<string>();
  for (const [, carryable] of sim.carryables.entries()) lying.add(carryable.id);
  const used = (list: string, ids: readonly number[]) =>
    ids.forEach((place, index) => {
      if (!lying.has(`${list}-${index}`)) add(`${list}:${place}`);
    });
  used('pod', origin.pods);
  used('log', origin.logs);
  used('sap', origin.saps);

  // Sunset: who made it home.
  const survivors: Record<SproutKind, number> = { ember: 0, dew: 0, stone: 0, spark: 0 };
  const grownHome: Record<SproutKind, number[]> = { ember: [], dew: [], stone: [], spark: [] };
  let leftBehind = 0;
  if (sim.ended !== 'wipedOut') {
    for (const [entity, worker] of sim.workers.entries()) {
      const at = sim.transforms.require(entity);
      if (worker.state === 'follow' || safe(sim, at.x, at.z)) {
        survivors[worker.kind]++;
        grownHome[worker.kind].push(worker.growth);
      } else {
        leftBehind++;
      }
    }
    // The Kiln keeps whatever it had not yet grown.
    for (const kind of sim.kiln.queue) {
      survivors[kind]++;
      grownHome[kind].push(0);
    }
  }
  // Those who stayed in the Kiln today (past the field's limit) are still there.
  const party = field.level.squad ?? {};
  const stock = Object.fromEntries(
    SPROUT_KINDS.map((kind) => [
      kind,
      Math.max(0, state.stock[kind] - (party[kind] ?? 0)) + survivors[kind],
    ]),
  ) as Record<SproutKind, number>;
  // Everyone who lives through the day grows a day older, those who stayed in the Kiln too.
  const growth = fitGrowth(
    stock,
    Object.fromEntries(
      SPROUT_KINDS.map((kind) => [
        kind,
        [...grownHome[kind], ...state.growth[kind].slice(party[kind] ?? 0)].map((g) => g + 1),
      ]),
    ),
  );

  const partsHome = section.parts.filter((id) => parts[id] !== undefined).length;
  const finishedToday = state.finished === null && partsHome === section.parts.length;
  const next: CampaignState = {
    day,
    section: state.section,
    stock,
    growth,
    done: [...done],
    wear: Object.fromEntries(Object.entries(wear).filter(([key]) => !finished.has(key))),
    parts,
    finished: finishedToday ? day : state.finished,
    totals: {
      grown: state.totals.grown + sim.stats.grown,
      lost: state.totals.lost + sim.stats.workersLost + leftBehind,
      leftBehind: state.totals.leftBehind + leftBehind,
    },
  };
  return {
    state: next,
    report: {
      day,
      newParts,
      partsHome,
      partsTotal: section.parts.length,
      relics,
      survivors,
      stock,
      lost: sim.stats.workersLost,
      leftBehind,
      grown: sim.stats.grown,
      beasts,
      gates,
      bridges,
      beacons,
      finishedToday,
    },
  };
}

/** How much of a section is done: parts, every other relic, and beasts beaten. */
export function sectionProgress(state: CampaignState): {
  parts: number;
  partsTotal: number;
  relics: number;
  relicsTotal: number;
  beasts: number;
  beastsTotal: number;
} {
  const section = currentSection(state);
  const base = section.level;
  const done = new Set(state.done);
  const others = base.treasures.filter((t) => !section.parts.includes(t.id));
  const beasts = base.enemies
    .map((enemy, index) => ({ enemy, index }))
    .filter(({ enemy }) => enemy.kind !== 'mound');
  return {
    parts: section.parts.filter((id) => state.parts[id] !== undefined).length,
    partsTotal: section.parts.length,
    relics: others.filter((t) => done.has(`treasure:${t.id}`)).length,
    relicsTotal: others.length,
    beasts: beasts.filter(({ index }) => done.has(`enemy:${index}`)).length,
    beastsTotal: beasts.length,
  };
}

/** Reads a stored story, or null if it is missing or malformed. */
export function parseCampaign(value: unknown): CampaignState | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const count = (n: unknown): number =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  const record = (r: unknown): Record<string, number> => {
    if (typeof r !== 'object' || r === null || Array.isArray(r)) return {};
    return Object.fromEntries(
      Object.entries(r as Record<string, unknown>)
        .filter(([, n]) => typeof n === 'number' && Number.isFinite(n))
        .map(([key, n]) => [key, n as number]),
    );
  };
  if (typeof raw.section !== 'string' || !sectionById(raw.section)) return null;
  const stockRaw = record(raw.stock);
  const totals = record(raw.totals);
  const stock = Object.fromEntries(
    SPROUT_KINDS.map((kind) => [kind, count(stockRaw[kind])]),
  ) as Record<SproutKind, number>;
  const growthRaw =
    typeof raw.growth === 'object' && raw.growth !== null
      ? (raw.growth as Record<string, unknown>)
      : {};
  const growth = fitGrowth(
    stock,
    Object.fromEntries(
      SPROUT_KINDS.map((kind) => {
        const list = growthRaw[kind];
        return [kind, Array.isArray(list) ? list.map(count) : []];
      }),
    ),
  );
  return {
    day: count(raw.day),
    section: raw.section,
    stock,
    growth,
    done: Array.isArray(raw.done) ? raw.done.filter((k): k is string => typeof k === 'string') : [],
    wear: record(raw.wear),
    parts: record(raw.parts),
    finished: typeof raw.finished === 'number' ? raw.finished : null,
    totals: {
      grown: count(totals.grown),
      lost: count(totals.lost),
      leftBehind: count(totals.leftBehind),
    },
  };
}
