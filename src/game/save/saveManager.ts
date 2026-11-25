import type { Difficulty } from '../core/difficulty';
import { rankValue, RANKS, type Rank } from '../dandori/scoring';
import { compareRuns, type RunEntry } from '../leaderboard/runCode';
import type { ModeId } from '../modes/modes';
import { newCampaign, parseCampaign, type CampaignState } from '../campaign/campaign';

export const SAVE_VERSION = '1';
const STORAGE_KEY = 'dandori-academy-save';

/** Running totals across every day ever played. */
export interface SaveTotals {
  days: number;
  treasures: number;
  enemies: number;
  workersLost: number;
  /** Sproutlings the Kiln has grown, over every day. */
  grown: number;
  /** Sproutlings whistled out of fire or water in time. */
  rescued: number;
  /** Glowcaps brought home before they wilted. */
  glowcaps: number;
  /** Times the Warden has gone down a way down and come back up. */
  caveTrips: number;
}

/** What a day did that the achievements look for, beyond its score. Every field may be missing. */
export interface DayFeats {
  /** Optional treasure taken, and how much there was. */
  glowcaps: number;
  glowcapsTotal: number;
  twins: number;
  twinsTotal: number;
  dewglass: number;
  dewglassTotal: number;
  /** Sunshards brought home from water, from beside a flame vent and from under a spark coil. */
  sunkHome: number;
  ventHome: number;
  coilHome: number;
  /** Crystal gates broken. */
  crystalBroken: number;
  rescued: number;
  grown: number;
  /** How many of the four kinds were alive at the end. */
  kindsAlive: number;
  /** Caves gone down into and come back up from, and caves emptied of every relic. */
  caves: number;
  cavesEmptied: number;
  /** Beasts placed in the lesson (not counting mounds). */
  beasts: number;
  /** Longest chain of deliveries. */
  bestChain: number;
}

/**
 * Persistent progress. Field layout follows the project handoff document, with
 * `workerCounts` in place of its `pikminCounts`, plus `bestScores`, Hard-mode bests,
 * `achievements` and `totals`. Saves written before those fields existed still load.
 */
export interface SaveData {
  version: string;
  /** Highest lesson unlocked (1-based). */
  stage: number;
  /** Academy total: the sum of the best score on every lesson. */
  score: number;
  /** Most workers alive at the end of a day, per worker type. */
  workerCounts: Record<string, number>;
  /** Ids of every treasure ever delivered, prefixed with the level id. */
  treasuresCollected: string[];
  /** Best rank per level id. */
  bestRanks: Record<string, string>;
  /** Best score per level id. */
  bestScores: Record<string, number>;
  /** Best rank and score per level id on Hard. */
  bestRanksHard: Record<string, string>;
  bestScoresHard: Record<string, number>;
  /** Unlocked achievement ids, each with the ISO time it was earned. */
  achievements: Record<string, string>;
  totals: SaveTotals;
  /** Ids of side lessons whose way down has been found. */
  discovered: string[];
  /**
   * Splits of the fastest clear per lesson and difficulty (key `id` or `id:hard`): the time
   * each Sunshard arrived. The last entry is the clear time.
   */
  bestSplits: Record<string, number[]>;
  /** The best runs per lesson and difficulty (key as for splits), best first, for the leaderboard. */
  runs: Record<string, RunEntry[]>;
  /** New personal bests waiting to be posted to the Academy board. */
  outbox: RunEntry[];
  /** Runs already on their way to the board, by `runKey`, most recent last. */
  posted: string[];
  /**
   * The story: how many days have been spent on it, and the lessons passed (every Sunshard
   * home), by split key. The ranks and scores above are from before the story kept no score.
   */
  story: StoryProgress;
  /** Best medal and best score in each challenge, keyed by `modeKey`. */
  medals: Record<string, string>;
  bests: Record<string, number>;
  /** Battles won, lost and drawn, per battle. */
  battles: Record<string, BattleRecord>;
  /**
   * The story's open expedition, kept from one day to the next. (The lesson run that was the
   * story before 0.19.0, now Time Attack, keeps its progress in `story` and `stage`.)
   */
  campaign: CampaignState;
  /** Fields where a boss's intro has been shown: each plays once per field per save. */
  bossIntros: string[];
  /** Story scenes already played (see story/scenes.ts): each plays once per save. */
  scenesSeen: string[];
  /** Time Attack: the Warden's path through the fastest clear, by split key, for its ghost. */
  ghosts: Record<string, string>;
  /** Kinds of beast beaten at least once, which open their Field Guide entries. */
  beastsBeaten: string[];
}

export interface StoryProgress {
  day: number;
  cleared: string[];
}

export interface BattleRecord {
  won: number;
  lost: number;
  drawn: number;
}

/** Where a challenge's medal and best score on a lesson and difficulty are kept. */
export function modeKey(mode: string, levelId: string, difficulty: Difficulty): string {
  return `${mode}|${splitKey(levelId, difficulty)}`;
}

/** Where a player's own runs are kept: by challenge, or (for runs from before) by lesson alone. */
export function runsKey(run: Pick<RunEntry, 'mode' | 'level' | 'difficulty' | 'coop'>): string {
  const key = run.mode
    ? modeKey(run.mode, run.level, run.difficulty)
    : splitKey(run.level, run.difficulty);
  // Co-op runs are kept apart from the solo ones, as their boards are.
  return run.coop ? `${key}+coop` : key;
}

/** Most posted-run keys a save remembers. */
const POSTED_KEPT = 500;

/** A run's identity: its lesson, difficulty and the moment it ended. */
export function runKey(run: RunEntry): string {
  return `${run.level}:${run.difficulty}:${run.at}`;
}

/**
 * Puts a finished day's run in the outbox if it is the player's new best on that lesson and
 * difficulty. Only bests are posted: the board keeps one run per player anyway.
 */
export function queueForBoard(previous: SaveData, save: SaveData, run: RunEntry): SaveData {
  const key = runsKey(run);
  const before = previous.runs[key]?.[0];
  const best = save.runs[key]?.[0];
  if (!best || runKey(best) !== runKey(run)) return save;
  if (before && compareRuns(run, before) >= 0) return save;
  const outbox = save.outbox.filter((queued) => runsKey(queued) !== key);
  return { ...save, outbox: [...outbox, run] };
}

/** Takes a run out of the outbox once the relay has it. */
export function markPosted(save: SaveData, run: RunEntry): SaveData {
  const key = runKey(run);
  return {
    ...save,
    outbox: save.outbox.filter((queued) => runKey(queued) !== key),
    posted: [...save.posted.filter((done) => done !== key), key].slice(-POSTED_KEPT),
  };
}

/** How many of a player's own runs are kept per lesson and difficulty. */
export const RUNS_KEPT = 10;

export interface DayRecord {
  /** Time Attack: the Warden's path, packed (see modes/timeAttack.ts), kept if a best clear. */
  track?: string;
  /** Kinds of beast beaten today, for the Field Guide. */
  beastsBeaten?: readonly string[];
  levelId: string;
  difficulty: Difficulty;
  /** How the day was played; a day from before modes existed was the story. */
  mode?: ModeId;
  stage: number;
  /** The challenge's score, or 0 for the story and battles. */
  score: number;
  /** The challenge's medal, or null for the story and battles. */
  rank: Rank | null;
  /** A battle's outcome, and the rival it was against. */
  battle?: 'won' | 'lost' | 'drawn';
  rival?: 'easy' | 'normal' | 'hard';
  /** A Treasure Hunt with nobody lost. */
  perfectBloom?: boolean;
  workersAlive: number;
  workersLost: number;
  treasureIds: readonly string[];
  treasuresTotal: number;
  enemiesDefeated: number;
  enemiesTotal: number;
  /** Hits the Warden took during the day. */
  captainHits: number;
  timeLeft: number;
  dayLength: number;
  /** Kinds of boss beaten during the day. */
  bossesDefeated: readonly string[];
  bloomsCollected: number;
  /** Arrival time of each Sunshard, when every one came home; otherwise empty. */
  splits?: readonly number[];
  /** Relics found elsewhere on the day (in a cave gone down into), already keyed `levelId:id`. */
  extraTreasures?: readonly string[];
  /** The day written down for the leaderboard. */
  run?: RunEntry;
  /** What else the day did, for the achievements. */
  feats?: Partial<DayFeats>;
  /** A story day: the expedition as it stands after it. */
  campaign?: CampaignState;
}

/** The subset of the Web Storage API the save manager needs. */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function emptySave(): SaveData {
  return {
    version: SAVE_VERSION,
    stage: 1,
    score: 0,
    workerCounts: {},
    treasuresCollected: [],
    bestRanks: {},
    bestScores: {},
    bestRanksHard: {},
    bestScoresHard: {},
    achievements: {},
    totals: {
      days: 0,
      treasures: 0,
      enemies: 0,
      workersLost: 0,
      grown: 0,
      rescued: 0,
      glowcaps: 0,
      caveTrips: 0,
    },
    discovered: [],
    bestSplits: {},
    runs: {},
    outbox: [],
    posted: [],
    story: { day: 0, cleared: [] },
    medals: {},
    bests: {},
    battles: {},
    campaign: newCampaign(),
    bossIntros: [],
    scenesSeen: [],
    beastsBeaten: [],
    ghosts: {},
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'number');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function parseTotals(value: unknown): SaveTotals {
  const totals = emptySave().totals;
  if (!isRecord(value)) return totals;
  for (const key of Object.keys(totals) as (keyof SaveTotals)[]) {
    const entry = value[key];
    if (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0) totals[key] = entry;
  }
  return totals;
}

function parseSplits(value: unknown): Record<string, number[]> {
  if (!isRecord(value)) return {};
  const splits: Record<string, number[]> = {};
  for (const [key, times] of Object.entries(value)) {
    if (
      Array.isArray(times) &&
      times.length > 0 &&
      times.every((t) => typeof t === 'number' && Number.isFinite(t))
    ) {
      splits[key] = times as number[];
    }
  }
  return splits;
}

/** Where a lesson's best splits are kept for a difficulty. */
export function splitKey(levelId: string, difficulty: Difficulty): string {
  return difficulty === 'hard' ? `${levelId}:hard` : levelId;
}

/** The splits record with `splits` kept if they finish faster than the stored ones. */
function fasterSplits(
  record: Record<string, number[]>,
  key: string,
  splits: readonly number[] | undefined,
): Record<string, number[]> {
  if (!splits || splits.length === 0) return record;
  const best = record[key];
  if (best && best.length === splits.length && best[best.length - 1] <= splits[splits.length - 1]) {
    return record;
  }
  return { ...record, [key]: [...splits] };
}

function parseRuns(value: unknown): Record<string, RunEntry[]> {
  if (!isRecord(value)) return {};
  const runs: Record<string, RunEntry[]> = {};
  for (const [key, list] of Object.entries(value)) {
    if (!Array.isArray(list)) continue;
    const kept = list.filter(
      (run): run is RunEntry =>
        isRecord(run) &&
        run.v === 1 &&
        typeof run.level === 'string' &&
        typeof run.score === 'number' &&
        typeof run.time === 'number' &&
        typeof run.at === 'string',
    );
    if (kept.length > 0) runs[key] = kept.slice(0, RUNS_KEPT);
  }
  return runs;
}

/** A player's kept runs with one more added, best first, cut to `RUNS_KEPT`. */
function keepRun(
  runs: Record<string, RunEntry[]>,
  key: string,
  run: RunEntry | undefined,
): Record<string, RunEntry[]> {
  if (!run) return runs;
  const list = [...(runs[key] ?? []), run].sort(compareRuns).slice(0, RUNS_KEPT);
  return { ...runs, [key]: list };
}

/** Validates parsed JSON and fills in fields added after version 1 first shipped. */
export function parseSave(value: unknown): SaveData | null {
  if (
    !isRecord(value) ||
    value.version !== SAVE_VERSION ||
    typeof value.stage !== 'number' ||
    !Number.isInteger(value.stage) ||
    value.stage < 1 ||
    typeof value.score !== 'number' ||
    !isNumberRecord(value.workerCounts) ||
    !Array.isArray(value.treasuresCollected) ||
    !value.treasuresCollected.every((id) => typeof id === 'string') ||
    !isRecord(value.bestRanks) ||
    !Object.values(value.bestRanks).every((rank) => typeof rank === 'string')
  ) {
    return null;
  }
  return {
    version: SAVE_VERSION,
    stage: value.stage,
    score: value.score,
    workerCounts: value.workerCounts,
    treasuresCollected: value.treasuresCollected as string[],
    bestRanks: value.bestRanks as Record<string, string>,
    bestScores: isNumberRecord(value.bestScores) ? value.bestScores : {},
    bestRanksHard: isStringRecord(value.bestRanksHard) ? value.bestRanksHard : {},
    bestScoresHard: isNumberRecord(value.bestScoresHard) ? value.bestScoresHard : {},
    achievements: isStringRecord(value.achievements) ? value.achievements : {},
    totals: parseTotals(value.totals),
    discovered: Array.isArray(value.discovered)
      ? value.discovered.filter((id): id is string => typeof id === 'string')
      : [],
    bestSplits: parseSplits(value.bestSplits),
    runs: parseRuns(value.runs),
    outbox: Array.isArray(value.outbox)
      ? Object.values(parseRuns({ outbox: value.outbox })).flat()
      : [],
    posted: Array.isArray(value.posted)
      ? value.posted.filter((key): key is string => typeof key === 'string').slice(-POSTED_KEPT)
      : [],
    story: parseStory(value.story, value),
    medals: isStringRecord(value.medals) ? value.medals : {},
    bests: isNumberRecord(value.bests) ? value.bests : {},
    battles: parseBattles(value.battles),
    campaign: parseCampaign(value.campaign) ?? newCampaign(),
    bossIntros: Array.isArray(value.bossIntros)
      ? value.bossIntros.filter((id): id is string => typeof id === 'string')
      : [],
    ghosts: isStringRecord(value.ghosts) ? value.ghosts : {},
    scenesSeen: Array.isArray(value.scenesSeen)
      ? value.scenesSeen.filter((id): id is string => typeof id === 'string')
      : [],
    beastsBeaten: Array.isArray(value.beastsBeaten)
      ? value.beastsBeaten.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

/**
 * Story progress, or for a save from before the story kept its own: the days played so far,
 * and every lesson with a full clear on record (a full clear is what keeps best splits).
 */
function parseStory(value: unknown, save: Record<string, unknown>): StoryProgress {
  if (isRecord(value) && typeof value.day === 'number' && Array.isArray(value.cleared)) {
    return {
      day: Math.max(0, Math.floor(value.day)),
      cleared: value.cleared.filter((key): key is string => typeof key === 'string'),
    };
  }
  // A save from before the story stopped keeping score: a lesson counts as cleared if a full
  // clear is on record, or if it earned the rank that used to pass it.
  const cleared = new Set(Object.keys(parseSplits(save.bestSplits)));
  const passed = (ranks: unknown, difficulty: Difficulty): void => {
    if (!isRecord(ranks)) return;
    for (const [levelId, stored] of Object.entries(ranks)) {
      const rank = RANKS.find((candidate) => candidate === stored);
      if (rank && rankValue(rank) >= rankValue(LEGACY_PASS_RANK)) {
        cleared.add(splitKey(levelId, difficulty));
      }
    }
  };
  passed(save.bestRanks, 'normal');
  passed(save.bestRanksHard, 'hard');
  return { day: parseTotals(save.totals).days, cleared: [...cleared] };
}

/** The rank that passed a lesson when the story was scored. */
const LEGACY_PASS_RANK: Rank = 'Silver';

function parseBattles(value: unknown): Record<string, BattleRecord> {
  if (!isRecord(value)) return {};
  const battles: Record<string, BattleRecord> = {};
  for (const [mode, record] of Object.entries(value)) {
    if (!isRecord(record)) continue;
    const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0);
    battles[mode] = {
      won: count(record.won),
      lost: count(record.lost),
      drawn: count(record.drawn),
    };
  }
  return battles;
}

/**
 * Steps that bring a stored save up to date, keyed by the version they upgrade from. Each takes
 * the raw JSON of that version and returns the raw JSON of the next. `parseSave` then fills in
 * any field added within the current version. Add a step here whenever SAVE_VERSION changes.
 */
export const SAVE_MIGRATIONS: Readonly<
  Record<string, (raw: Record<string, unknown>) => Record<string, unknown>>
> = {};

/** Runs the migration steps on raw JSON until it reaches SAVE_VERSION; null if it cannot. */
export function migrateSave(
  value: unknown,
  migrations: typeof SAVE_MIGRATIONS = SAVE_MIGRATIONS,
): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  let raw = value;
  for (let guard = 0; raw.version !== SAVE_VERSION; guard++) {
    const step = typeof raw.version === 'string' ? migrations[raw.version] : undefined;
    if (!step || guard > 100) return null;
    raw = step(raw);
  }
  return raw;
}

/** What loading found: the save to play with, and a copy of stored data that could not be read. */
export interface LoadedSave {
  save: SaveData;
  /**
   * Set when progress was stored but could not be read: the storage key it was copied to,
   * so it is never overwritten and can be recovered or sent with a bug report.
   */
  backupKey: string | null;
}

/** Where unreadable save data is kept, by when it was found. */
export const BACKUP_PREFIX = 'dandori-academy-save-unreadable-';

/**
 * Reads the save. A missing save starts fresh. A save that is stored but cannot be read (corrupt,
 * or from a version this build cannot migrate) also starts fresh, but its data is first copied
 * to a backup key, so playing on never destroys it.
 */
export function loadSaveChecked(storage: SaveStorage, now: Date = new Date()): LoadedSave {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { save: emptySave(), backupKey: null };
  }
  if (raw === null) return { save: emptySave(), backupKey: null };
  try {
    const save = parseSave(migrateSave(JSON.parse(raw)));
    if (save) return { save, backupKey: null };
  } catch {
    // Not JSON: kept below like any other unreadable save.
  }
  const backupKey = `${BACKUP_PREFIX}${now.toISOString()}`;
  try {
    storage.setItem(backupKey, raw);
  } catch {
    return { save: emptySave(), backupKey: null };
  }
  return { save: emptySave(), backupKey };
}

/** Reads the save, falling back to a fresh one if it is missing or unreadable (see loadSaveChecked). */
export function loadSave(storage: SaveStorage): SaveData {
  return loadSaveChecked(storage).save;
}

/** Writes the save. Returns false when storage is unavailable or full. */
export function writeSave(storage: SaveStorage, data: SaveData): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Whether a lesson has been passed in the story (every Sunshard home) on a difficulty. */
export function storyCleared(
  save: SaveData,
  levelId: string,
  difficulty: Difficulty = 'normal',
): boolean {
  return save.story.cleared.includes(splitKey(levelId, difficulty));
}

/** Legacy ranks (from when the story was scored) open Hard from this rank up. */
const LEGACY_HARD_RANK: Rank = 'Gold';

/**
 * Best medal earned on a lesson and difficulty in any challenge, counting the ranks the story
 * gave before it stopped keeping score; null if there is none.
 */
export function bestRank(
  save: SaveData,
  levelId: string,
  difficulty: Difficulty = 'normal',
): Rank | null {
  const key = `|${splitKey(levelId, difficulty)}`;
  const found: string[] = Object.entries(save.medals)
    .filter(
      ([medalKey]) =>
        medalKey.endsWith(key) && medalKey.indexOf('|') === medalKey.length - key.length,
    )
    .map(([, rank]) => rank);
  const legacy = (difficulty === 'hard' ? save.bestRanksHard : save.bestRanks)[levelId];
  if (legacy) found.push(legacy);
  let best: Rank | null = null;
  for (const stored of found) {
    const rank = RANKS.find((candidate) => candidate === stored);
    if (rank && (best === null || rankValue(rank) > rankValue(best))) best = rank;
  }
  return best;
}

/** Best medal in one challenge on a lesson and difficulty, or null. */
export function modeRank(
  save: SaveData,
  mode: string,
  levelId: string,
  difficulty: Difficulty = 'normal',
): Rank | null {
  const stored = save.medals[modeKey(mode, levelId, difficulty)];
  return RANKS.find((rank) => rank === stored) ?? null;
}

/** Best score in one challenge on a lesson and difficulty, or 0. */
export function modeBest(
  save: SaveData,
  mode: string,
  levelId: string,
  difficulty: Difficulty = 'normal',
): number {
  return save.bests[modeKey(mode, levelId, difficulty)] ?? 0;
}

/** Whether a lesson's Hard mode is open: the lesson passed on Normal in the story. */
export function hardUnlocked(save: SaveData, levelId: string): boolean {
  if (storyCleared(save, levelId)) return true;
  const legacy = save.bestRanks[levelId];
  const rank = RANKS.find((candidate) => candidate === legacy);
  return rank !== undefined && rankValue(rank) >= rankValue(LEGACY_HARD_RANK);
}

/**
 * Returns a new save with a finished day merged in. A story day counts towards the story's
 * days, and passing a lesson (every Sunshard home) on Normal opens the next. A challenge keeps
 * its best medal and score per lesson; a battle adds to its record.
 */
export function recordDay(save: SaveData, day: DayRecord): SaveData {
  const mode = day.mode ?? 'lessons';
  const hard = day.difficulty === 'hard';
  const cleared = day.treasureIds.length === day.treasuresTotal;
  const story = mode === 'lessons';
  const key = splitKey(day.levelId, day.difficulty);
  const ids = [
    // A story practice shard is no relic for the Field Guide.
    ...day.treasureIds
      .filter((id) => !id.startsWith('practice-'))
      .map((id) => `${day.levelId}:${id}`),
    ...(day.extraTreasures ?? []),
  ];
  let medals = save.medals;
  let bests = save.bests;
  if (day.rank !== null && !story && day.battle === undefined) {
    const medalKey = modeKey(mode, day.levelId, day.difficulty);
    const held = RANKS.find((rank) => rank === medals[medalKey]);
    if (!held || rankValue(day.rank) > rankValue(held))
      medals = { ...medals, [medalKey]: day.rank };
    if (day.score > (bests[medalKey] ?? 0)) bests = { ...bests, [medalKey]: day.score };
  }
  const battles = { ...save.battles };
  if (day.battle) {
    const record = battles[mode] ?? { won: 0, lost: 0, drawn: 0 };
    battles[mode] = { ...record, [day.battle]: record[day.battle] + 1 };
  }
  const sum = (record: Record<string, number>): number =>
    Object.values(record).reduce((total, score) => total + score, 0);
  const unlocksNext = story && !hard && cleared && day.stage > 0;
  return {
    version: SAVE_VERSION,
    stage: Math.max(save.stage, unlocksNext ? day.stage + 1 : day.stage),
    score: sum(bests) + sum(save.bestScores) + sum(save.bestScoresHard),
    workerCounts: {
      ...save.workerCounts,
      ember: Math.max(save.workerCounts.ember ?? 0, day.workersAlive),
    },
    treasuresCollected: [...new Set([...save.treasuresCollected, ...ids])],
    bestRanks: save.bestRanks,
    bestScores: save.bestScores,
    bestRanksHard: save.bestRanksHard,
    bestScoresHard: save.bestScoresHard,
    achievements: save.achievements,
    discovered: save.discovered,
    bestSplits: story ? fasterSplits(save.bestSplits, key, day.splits) : save.bestSplits,
    runs: keepRun(save.runs, day.run ? runsKey(day.run) : key, day.run),
    outbox: save.outbox,
    posted: save.posted,
    story: story
      ? {
          day: save.story.day + 1,
          cleared:
            cleared && !save.story.cleared.includes(key)
              ? [...save.story.cleared, key]
              : save.story.cleared,
        }
      : save.story,
    medals,
    bests,
    battles,
    campaign: day.campaign ?? save.campaign,
    bossIntros: save.bossIntros,
    scenesSeen: save.scenesSeen,
    // A new fastest clear keeps its path for the ghost.
    ghosts:
      story && day.track && fasterSplits(save.bestSplits, key, day.splits) !== save.bestSplits
        ? { ...save.ghosts, [key]: day.track }
        : save.ghosts,
    beastsBeaten: [...new Set([...save.beastsBeaten, ...(day.beastsBeaten ?? [])])],
    totals: {
      days: save.totals.days + 1,
      treasures: save.totals.treasures + day.treasureIds.length,
      enemies: save.totals.enemies + day.enemiesDefeated,
      workersLost: save.totals.workersLost + day.workersLost,
      grown: save.totals.grown + (day.feats?.grown ?? 0),
      rescued: save.totals.rescued + (day.feats?.rescued ?? 0),
      glowcaps: save.totals.glowcaps + (day.feats?.glowcaps ?? 0),
      caveTrips: save.totals.caveTrips + (day.feats?.caves ?? 0),
    },
  };
}

/** Returns a save in which the side lesson's way down has been found; the same save if it already was. */
export function discover(save: SaveData, levelId: string): SaveData {
  if (save.discovered.includes(levelId)) return save;
  return { ...save, discovered: [...save.discovered, levelId] };
}

/** The fastest clear time on record for a lesson, or null. */
export function bestClearTime(
  save: SaveData,
  levelId: string,
  difficulty: Difficulty,
): number | null {
  const splits = save.bestSplits[splitKey(levelId, difficulty)];
  return splits ? splits[splits.length - 1] : null;
}
