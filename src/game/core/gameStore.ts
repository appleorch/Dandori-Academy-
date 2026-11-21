import { create } from 'zustand';
import { evaluateDay, type ScoreBreakdown } from '../dandori/scoring';
import { grantAchievement, unlockAchievements } from '../progression/achievements';
import {
  bestClearTime,
  bestScore,
  discover,
  emptySave,
  loadSave,
  markPosted,
  queueForBoard,
  runKey,
  recordDay,
  writeSave,
  type DayRecord,
  type SaveData,
} from '../save/saveManager';
import { damageTaken } from '../enemies/combat';
import { ENEMY_SPECS } from '../enemies/enemyKinds';
import type { DayEnd, Simulation } from '../simulation/Simulation';
import { bonusParts, LEVELS } from '../world/level';
import type { Line } from '../story/headmaster';
import type { Haul } from '../simulation/expedition';
import { makeRun, type RunEntry } from '../leaderboard/runCode';
import { adviseDay, tallyDay, type Advice, type DayTally } from '../dandori/tally';
import { dayFeats } from '../progression/feats';
import { GAME_VERSION } from './changelog';
import type { SproutKind } from '../workers/sprouts';
import { CHAIN } from './config';
import { penaltyPerLoss, type Difficulty } from './difficulty';
import {
  loadSettings,
  newPlayerId,
  writeSettings,
  DEFAULT_SETTINGS,
  type Settings,
} from './settings';

/** Phones and tablets start at medium graphics; they can raise it in Settings. */
function deviceDefaults(): Settings {
  try {
    if (window.matchMedia('(pointer: coarse)').matches)
      return { ...DEFAULT_SETTINGS, graphics: 'medium' };
  } catch {
    // No window (tests): use the plain defaults.
  }
  return DEFAULT_SETTINGS;
}

/** Screens reachable from the main menu. */
export type MenuScreen = 'menu' | 'achievements' | 'settings' | 'journal' | 'guide' | 'leaderboard';
export type GamePhase = MenuScreen | 'story' | 'playing' | 'results';

/** Low-frequency copy of simulation state for the HUD. */
export interface HudSnapshot {
  timeLeft: number;
  squad: number;
  idle: number;
  working: number;
  total: number;
  treasureValue: number;
  treasuresCollected: number;
  treasuresTotal: number;
  /** Ranked bonus taken so far, and how much the lesson has: twin pairs on time, Dewglass whole. */
  bonusGot: number;
  bonusOf: number;
  /** Glowcaps brought home so far, and how many the lesson grows: extra, never ranked. */
  glowcapsGot: number;
  glowcapsOf: number;
  captainHp: number;
  boss: BossSnapshot | null;
  /** Seconds ahead (negative) or behind (positive) the best clear at the last delivery, or null. */
  split: number | null;
  chain: number;
  /** Sproutlings in the squad by kind, and the kind the Warden throws next. */
  squadKinds: Record<SproutKind, number>;
  selected: SproutKind;
  /** The cave the Warden is in, by name, or null on the surface (whose clock is then stopped). */
  below: string | null;
}

export interface BossSnapshot {
  name: string;
  /** Remaining health, 0 to 1. */
  health: number;
  /** 'open' while it takes full damage, 'armoured' while it takes reduced damage, 'shielded' while it takes none. */
  guard: 'open' | 'armoured' | 'shielded' | 'dark';
}

export interface DayResult {
  reason: DayEnd;
  score: ScoreBreakdown;
  treasuresCollected: number;
  treasuresTotal: number;
  isBestScore: boolean;
  /** True when this day opened the next lesson for the first time. */
  unlockedNext: boolean;
  /** True the first time the lesson is finished at all: its journal entry is new. */
  firstClear: boolean;
  /** Seconds of the day used. */
  elapsed: number;
  /** Clear time of this day when every shard came home, and the record it was measured against. */
  clearTime: number | null;
  previousBest: number | null;
  bestChain: number;
  /** Relics brought up from caves on the way: for the Field Guide, not the rank. */
  caveRelics: number;
  /** The day as a leaderboard run, or null when it cannot be posted. */
  run: RunEntry | null;
  /** The day taken apart: required and optional treasure, and the squad. */
  tally: DayTally;
  /** What the next rank would take, and where points were left behind. */
  advice: Advice;
  enemiesDefeated: number;
  workersAlive: number;
  /** Ids of achievements earned by this day. */
  achievements: string[];
  difficulty: Difficulty;
}

interface GameStore {
  phase: GamePhase;
  /** Id of the lesson being played or last played. */
  levelId: string;
  /** Difficulty of the day being played, fixed when it starts. */
  playDifficulty: Difficulty;
  /** Incremented for every new day so the scene builds a fresh simulation. */
  runId: number;
  /** While true the simulation does not advance and the pause menu shows. */
  paused: boolean;
  /** While true the day has not begun: the briefing is showing over the field. */
  briefing: boolean;
  /** Proctor Ashwick's current line of advice, or null. */
  hint: string | null;
  /** The Headmaster's latest remark; `id` changes with every new one. */
  sprocket: (Line & { id: number }) | null;
  /** True while the Warden stands at the little door. */
  nearSecret: boolean;
  /** Id of the side lesson whose way down the Warden is standing at, or null. */
  nearDescent: string | null;
  /** True while the Warden stands at the way back up out of a cave. */
  nearAscent: boolean;
  /** True while the back room is open, over whatever screen was showing. */
  pokerOpen: boolean;
  /** Which pages the story screen is showing. */
  storyKind: 'prologue' | 'epilogue';
  hud: HudSnapshot | null;
  /** Mirrors Simulation.entityVersion so entity lists re-render when it changes. */
  entityVersion: number;
  result: DayResult | null;
  save: SaveData;
  settings: Settings;
  startDay: (levelId: string) => void;
  showScreen: (screen: MenuScreen) => void;
  pause: () => void;
  resume: () => void;
  showStory: (kind: 'prologue' | 'epilogue') => void;
  /** Dismisses the briefing and starts the clock. */
  beginDay: () => void;
  setHint: (hint: string | null) => void;
  say: (line: Line) => void;
  setNearSecret: (near: boolean) => void;
  /** The Warden is at a way down (or has left it): the side lesson is found for good. */
  setNearDescent: (levelId: string | null) => void;
  setNearAscent: (near: boolean) => void;
  openPoker: () => void;
  closePoker: () => void;
  /** Grants an achievement earned outside a day. Returns true if it is new. */
  grant: (id: string) => boolean;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Replaces all progress, for loading a save file or erasing progress. */
  replaceSave: (save: SaveData) => void;
  /**
   * Publishes the HUD. `below` is set while the Warden is down a cave: the cave's name and the
   * surface clock, which stands still until they come back up.
   */
  publish: (sim: Simulation, below?: { name: string; timeLeft: number } | null) => void;
  setSplit: (split: number) => void;
  finishDay: (sim: Simulation, reason: DayEnd, haul?: Haul) => void;
  /** The relay has taken a run from the outbox. */
  runPosted: (run: RunEntry) => void;
  /** Puts one of the player's own runs in the outbox by hand (a best from before posting was on). */
  queueRun: (run: RunEntry) => void;
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function squadKinds(sim: Simulation): Record<SproutKind, number> {
  const counts: Record<SproutKind, number> = { ember: 0, dew: 0, stone: 0, spark: 0 };
  for (const [, worker] of sim.workers.entries())
    if (worker.state === 'follow') counts[worker.kind]++;
  return counts;
}

function snapshot(sim: Simulation): HudSnapshot {
  const counts = sim.countWorkers();
  return {
    timeLeft: sim.timeLeft,
    squad: counts.squad,
    idle: counts.idle,
    working: counts.working,
    total: counts.total,
    treasureValue: sim.stats.treasureValue,
    treasuresCollected: sim.stats.treasuresCollected.length,
    treasuresTotal: sim.stats.treasuresTotal,
    bonusGot: sim.stats.bonus.twins + sim.stats.bonus.dewglass,
    bonusOf: bonusParts(sim.level).twins + bonusParts(sim.level).dewglass,
    glowcapsGot: sim.stats.bonus.glowcaps,
    glowcapsOf: bonusParts(sim.level).glowcaps,
    captainHp: sim.captainState.hp,
    boss: bossSnapshot(sim),
    split: null,
    squadKinds: squadKinds(sim),
    below: null,
    selected: sim.selected,
    chain: sim.chain >= 2 && sim.elapsed - sim.lastDelivery <= CHAIN.window ? sim.chain : 0,
  };
}

/** Distance within which a boss's health bar appears before it has been touched. */
const BOSS_BAR_RANGE = 32;

function bossSnapshot(sim: Simulation): BossSnapshot | null {
  for (const [entity, enemy] of sim.enemies.entries()) {
    const spec = ENEMY_SPECS[enemy.kind];
    if (!spec.boss) continue;
    // A boss far across a big map keeps its bar to itself until it is met or hurt.
    const at = sim.transforms.require(entity);
    const captain = sim.captainTransform;
    const far = Math.hypot(at.x - captain.x, at.z - captain.z) > BOSS_BAR_RANGE;
    if (far && enemy.hp >= enemy.maxHp && !enemy.alert) continue;
    const taken = damageTaken(sim, entity, enemy);
    return {
      name: spec.name,
      health: Math.max(0, enemy.hp / enemy.maxHp),
      guard:
        taken === 0
          ? enemy.kind === 'snuffer'
            ? 'dark'
            : 'shielded'
          : taken < 1
            ? 'armoured'
            : 'open',
    };
  }
  return null;
}

export const useGameStore = create<GameStore>((set, get) => {
  const storage = browserStorage();
  const persist = (save: SaveData): void => {
    if (storage) writeSave(storage, save);
  };
  // Grant anything an older save already qualifies for, such as rank milestones.
  const initial = unlockAchievements(storage ? loadSave(storage) : emptySave(), null, new Date());
  if (initial.unlocked.length > 0) persist(initial.save);
  const loaded = storage ? loadSettings(storage, deviceDefaults()) : deviceDefaults();
  // Every browser gets its own player id for the board, made once and kept with the settings.
  const settings = loaded.playerId ? loaded : { ...loaded, playerId: newPlayerId() };
  if (storage && settings !== loaded) writeSettings(storage, settings);

  return {
    // A brand new player is told how things stand before seeing the lesson list.
    phase: settings.seenIntro || initial.save.totals.days > 0 ? 'menu' : 'story',
    storyKind: 'prologue',
    levelId: LEVELS[0].id,
    playDifficulty: 'normal',
    runId: 0,
    paused: false,
    briefing: false,
    hint: null,
    sprocket: null,
    nearSecret: false,
    nearDescent: null,
    nearAscent: false,
    pokerOpen: false,
    hud: null,
    entityVersion: 0,
    result: null,
    save: initial.save,
    settings,

    startDay: (levelId) =>
      set((state) => ({
        phase: 'playing',
        levelId,
        playDifficulty: state.settings.difficulty,
        runId: state.runId + 1,
        paused: false,
        briefing: state.settings.briefings,
        hint: null,
        sprocket: null,
        nearSecret: false,
        nearDescent: null,
        hud: null,
        result: null,
      })),

    showScreen: (screen) =>
      set({ phase: screen, paused: false, briefing: false, hint: null, hud: null, result: null }),

    showStory: (kind) =>
      set({
        phase: 'story',
        storyKind: kind,
        paused: false,
        briefing: false,
        hud: null,
        result: null,
      }),

    beginDay: () => set({ briefing: false }),

    say: (line) => set((state) => ({ sprocket: { ...line, id: (state.sprocket?.id ?? 0) + 1 } })),

    setHint: (hint) => {
      if (hint !== get().hint) set({ hint });
    },

    setNearSecret: (near) => {
      if (near !== get().nearSecret) set({ nearSecret: near });
    },

    setNearDescent: (levelId) => {
      if (levelId === get().nearDescent) return;
      const before = get().save;
      const save = levelId ? discover(before, levelId) : before;
      if (save !== before) persist(save);
      set({ nearDescent: levelId, save });
    },

    queueRun: (run) => {
      const current = get().save;
      const key = runKey(run);
      if (current.outbox.some((queued) => runKey(queued) === key)) return;
      const save = {
        ...current,
        outbox: [
          ...current.outbox.filter(
            (queued) => !(queued.level === run.level && queued.difficulty === run.difficulty),
          ),
          run,
        ],
      };
      persist(save);
      set({ save });
    },

    runPosted: (run) => {
      const { save } = unlockAchievements(markPosted(get().save, run), null, new Date());
      persist(save);
      set({ save });
    },

    setNearAscent: (near) => {
      if (near !== get().nearAscent) set({ nearAscent: near });
    },

    openPoker: () => set((state) => ({ pokerOpen: true, paused: state.phase === 'playing' })),

    closePoker: () => set({ pokerOpen: false }),

    grant: (id) => {
      const before = get().save;
      const save = grantAchievement(before, id, new Date());
      if (save === before) return false;
      persist(save);
      set({ save });
      return true;
    },

    pause: () => {
      if (get().phase === 'playing') set({ paused: true });
    },

    resume: () => set({ paused: false }),

    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      if (storage) writeSettings(storage, settings);
      set({ settings });
    },

    replaceSave: (save) => {
      const checked = unlockAchievements(save, null, new Date()).save;
      persist(checked);
      set({ save: checked });
    },

    publish: (sim, below = null) =>
      set((state) => ({
        hud: {
          ...snapshot(sim),
          ...(below ? { below: below.name, timeLeft: below.timeLeft } : {}),
          split: state.hud?.split ?? null,
        },
        entityVersion: sim.entityVersion,
      })),

    setSplit: (split) => set((state) => (state.hud ? { hud: { ...state.hud, split } } : {})),

    finishDay: (sim, reason, haul) => {
      const { level, stats } = sim;
      const workersAlive = sim.workers.size;
      const cleared = stats.treasuresCollected.length === stats.treasuresTotal;
      const score = evaluateDay(
        {
          treasureValue: stats.treasureValue,
          treasuresCollected: stats.treasuresCollected.length,
          treasuresTotal: stats.treasuresTotal,
          timeLeft: sim.timeLeft,
          workersAlive,
          workersLost: stats.workersLost,
          glowcapPoints: stats.bonus.glowcapPoints,
        },
        level,
        penaltyPerLoss(level.difficulty),
      );
      const tally = tallyDay(level, {
        shardsHome: stats.treasuresCollected.length,
        treasureValue: stats.treasureValue,
        bonus: stats.bonus,
        alive: workersAlive,
        lost: stats.workersLost,
        grown: stats.grown,
        timeLeft: sim.timeLeft,
      });
      const day: DayRecord = {
        levelId: level.id,
        difficulty: level.difficulty,
        // A side lesson never moves the numbered run along.
        stage: level.side ? 0 : level.stage,
        score: score.total,
        rank: score.rank,
        workersAlive,
        workersLost: stats.workersLost,
        treasureIds: stats.treasuresCollected,
        treasuresTotal: stats.treasuresTotal,
        enemiesDefeated: stats.enemiesDefeated,
        enemiesTotal: level.enemies.length,
        captainHits: sim.captainMaxHp - Math.max(0, sim.captainState.hp),
        timeLeft: sim.timeLeft,
        dayLength: level.dayLength,
        bossesDefeated: stats.bossesDefeated,
        bloomsCollected: stats.bloomsCollected,
        splits: cleared ? stats.deliveryTimes : undefined,
        extraTreasures: haul?.relics ?? [],
        feats: dayFeats(sim, tally, haul),
        run:
          makeRun(
            {
              levelId: level.id,
              difficulty: level.difficulty,
              score,
              shards: stats.treasuresCollected.length,
              shardsTotal: stats.treasuresTotal,
              elapsed: sim.elapsed,
              timeLeft: sim.timeLeft,
              alive: workersAlive,
              lost: stats.workersLost,
            },
            GAME_VERSION,
            new Date(),
          ) ?? undefined,
      };
      const previous = get().save;
      const recorded = recordDay(previous, day);
      // A new personal best goes in the outbox for the Academy board; it is sent while posting
      // is on, and waits there while it is off.
      const queued = day.run ? queueForBoard(previous, recorded, day.run) : recorded;
      const { save, unlocked } = unlockAchievements(queued, day, new Date());
      persist(save);
      set({
        phase: 'results',
        paused: false,
        hint: null,
        nearSecret: false,
        nearDescent: null,
        hud: get().hud ?? snapshot(sim),
        save,
        result: {
          reason,
          score,
          treasuresCollected: stats.treasuresCollected.length,
          treasuresTotal: stats.treasuresTotal,
          isBestScore: score.total > bestScore(previous, level.id, level.difficulty),
          unlockedNext: save.stage > previous.stage && level.stage < LEVELS.length,
          firstClear:
            stats.treasuresCollected.length === stats.treasuresTotal &&
            bestScore(previous, level.id, 'normal') === 0 &&
            bestScore(previous, level.id, 'hard') === 0,
          elapsed: sim.elapsed,
          clearTime: cleared ? sim.elapsed : null,
          previousBest: bestClearTime(previous, level.id, level.difficulty),
          bestChain: stats.bestChain,
          caveRelics: haul?.relics.length ?? 0,
          run: day.run ?? null,
          tally,
          advice: adviseDay(level, score, tally, penaltyPerLoss(level.difficulty)),
          enemiesDefeated: stats.enemiesDefeated,
          workersAlive,
          difficulty: level.difficulty,
          achievements: unlocked.map((achievement) => achievement.id),
        },
      });
    },
  };
});
