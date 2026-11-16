import { create } from 'zustand';
import { evaluateDay, type ScoreBreakdown } from '../dandori/scoring';
import { unlockAchievements } from '../progression/achievements';
import {
  bestScore,
  emptySave,
  loadSave,
  recordDay,
  writeSave,
  type DayRecord,
  type SaveData,
} from '../save/saveManager';
import { damageTaken } from '../enemies/combat';
import { ENEMY_SPECS } from '../enemies/enemyKinds';
import type { DayEnd, Simulation } from '../simulation/Simulation';
import { LEVELS } from '../world/level';
import { penaltyPerLoss, type Difficulty } from './difficulty';
import { loadSettings, writeSettings, DEFAULT_SETTINGS, type Settings } from './settings';

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
export type MenuScreen = 'menu' | 'achievements' | 'settings';
export type GamePhase = MenuScreen | 'playing' | 'results';

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
  captainHp: number;
  boss: BossSnapshot | null;
}

export interface BossSnapshot {
  name: string;
  /** Remaining health, 0 to 1. */
  health: number;
  /** 'open' while it takes full damage, 'armoured' while it takes reduced damage, 'shielded' while it takes none. */
  guard: 'open' | 'armoured' | 'shielded';
}

export interface DayResult {
  reason: DayEnd;
  score: ScoreBreakdown;
  treasuresCollected: number;
  treasuresTotal: number;
  isBestScore: boolean;
  /** True when this day opened the next lesson for the first time. */
  unlockedNext: boolean;
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
  updateSettings: (patch: Partial<Settings>) => void;
  /** Replaces all progress, for loading a save file or erasing progress. */
  replaceSave: (save: SaveData) => void;
  publish: (sim: Simulation) => void;
  finishDay: (sim: Simulation, reason: DayEnd) => void;
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
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
    captainHp: sim.captainState.hp,
    boss: bossSnapshot(sim),
  };
}

function bossSnapshot(sim: Simulation): BossSnapshot | null {
  for (const [entity, enemy] of sim.enemies.entries()) {
    const spec = ENEMY_SPECS[enemy.kind];
    if (!spec.boss) continue;
    const taken = damageTaken(sim, entity, enemy);
    return {
      name: spec.name,
      health: Math.max(0, enemy.hp / enemy.maxHp),
      guard: taken === 0 ? 'shielded' : taken < 1 ? 'armoured' : 'open',
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

  return {
    phase: 'menu',
    levelId: LEVELS[0].id,
    playDifficulty: 'normal',
    runId: 0,
    paused: false,
    hud: null,
    entityVersion: 0,
    result: null,
    save: initial.save,
    settings: storage ? loadSettings(storage, deviceDefaults()) : deviceDefaults(),

    startDay: (levelId) =>
      set((state) => ({
        phase: 'playing',
        levelId,
        playDifficulty: state.settings.difficulty,
        runId: state.runId + 1,
        paused: false,
        hud: null,
        result: null,
      })),

    showScreen: (screen) => set({ phase: screen, paused: false, hud: null, result: null }),

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

    publish: (sim) => set({ hud: snapshot(sim), entityVersion: sim.entityVersion }),

    finishDay: (sim, reason) => {
      const { level, stats } = sim;
      const workersAlive = sim.workers.size;
      const score = evaluateDay(
        {
          treasureValue: stats.treasureValue,
          treasuresCollected: stats.treasuresCollected.length,
          treasuresTotal: stats.treasuresTotal,
          timeLeft: sim.timeLeft,
          workersAlive,
          workersLost: stats.workersLost,
        },
        level.parScore,
        penaltyPerLoss(level.difficulty),
      );
      const day: DayRecord = {
        levelId: level.id,
        difficulty: level.difficulty,
        stage: level.stage,
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
      };
      const previous = get().save;
      const { save, unlocked } = unlockAchievements(recordDay(previous, day), day, new Date());
      persist(save);
      set({
        phase: 'results',
        paused: false,
        hud: snapshot(sim),
        save,
        result: {
          reason,
          score,
          treasuresCollected: stats.treasuresCollected.length,
          treasuresTotal: stats.treasuresTotal,
          isBestScore: score.total > bestScore(previous, level.id, level.difficulty),
          unlockedNext: save.stage > previous.stage && level.stage < LEVELS.length,
          difficulty: level.difficulty,
          achievements: unlocked.map((achievement) => achievement.id),
        },
      });
    },
  };
});
