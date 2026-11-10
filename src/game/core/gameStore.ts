import { create } from 'zustand';
import { evaluateDay, type ScoreBreakdown } from '../dandori/scoring';
import { emptySave, loadSave, recordDay, writeSave, type SaveData } from '../save/saveManager';
import type { DayEnd, Simulation } from '../simulation/Simulation';
import { LEVELS } from '../world/level';

export type GamePhase = 'menu' | 'playing' | 'results';

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
}

export interface DayResult {
  reason: DayEnd;
  score: ScoreBreakdown;
  treasuresCollected: number;
  treasuresTotal: number;
  isBestScore: boolean;
  /** True when this day opened the next lesson for the first time. */
  unlockedNext: boolean;
}

interface GameStore {
  phase: GamePhase;
  /** Id of the lesson being played or last played. */
  levelId: string;
  /** Incremented for every new day so the scene builds a fresh simulation. */
  runId: number;
  hud: HudSnapshot | null;
  /** Mirrors Simulation.entityVersion so entity lists re-render when it changes. */
  entityVersion: number;
  result: DayResult | null;
  save: SaveData;
  startDay: (levelId: string) => void;
  toMenu: () => void;
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
  };
}

export const useGameStore = create<GameStore>((set, get) => {
  const storage = browserStorage();
  return {
    phase: 'menu',
    levelId: LEVELS[0].id,
    runId: 0,
    hud: null,
    entityVersion: 0,
    result: null,
    save: storage ? loadSave(storage) : emptySave(),

    startDay: (levelId) =>
      set((state) => ({
        phase: 'playing',
        levelId,
        runId: state.runId + 1,
        hud: null,
        result: null,
      })),

    toMenu: () => set({ phase: 'menu', hud: null, result: null }),

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
      );
      const previous = get().save;
      const save = recordDay(previous, {
        levelId: level.id,
        stage: level.stage,
        score: score.total,
        rank: score.rank,
        workersAlive,
        treasureIds: stats.treasuresCollected,
      });
      if (storage) writeSave(storage, save);
      set({
        phase: 'results',
        hud: snapshot(sim),
        save,
        result: {
          reason,
          score,
          treasuresCollected: stats.treasuresCollected.length,
          treasuresTotal: stats.treasuresTotal,
          isBestScore: score.total > (previous.bestScores[level.id] ?? 0),
          unlockedNext: save.stage > previous.stage && level.stage < LEVELS.length,
        },
      });
    },
  };
});
