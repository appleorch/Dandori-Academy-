import { rankValue, type Rank } from '../dandori/scoring';
import { bestRank, type DayRecord, type SaveData } from '../save/saveManager';
import { LEVELS } from '../world/level';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** Counter achievements report [current, target]; one-off feats have no progress. */
  progress?: (save: SaveData) => readonly [number, number];
  /**
   * Whether the achievement is earned. `day` is the day just finished, or null when
   * re-checking a save on its own (after loading one, for example).
   */
  earned: (save: SaveData, day: DayRecord | null) => boolean;
}

function cleared(day: DayRecord): boolean {
  return day.treasureIds.length === day.treasuresTotal;
}

function lessonsAtLeast(save: SaveData, rank: Rank): number {
  return LEVELS.filter((level) => {
    const earned = bestRank(save, level.id);
    return earned !== null && rankValue(earned) >= rankValue(rank);
  }).length;
}

function counter(
  id: string,
  name: string,
  description: string,
  target: number,
  count: (save: SaveData) => number,
): Achievement {
  return {
    id,
    name,
    description,
    progress: (save) => [Math.min(target, count(save)), target],
    earned: (save) => count(save) >= target,
  };
}

function feat(
  id: string,
  name: string,
  description: string,
  test: (day: DayRecord) => boolean,
): Achievement {
  return { id, name, description, earned: (_save, day) => day !== null && test(day) };
}

const FINAL = LEVELS[LEVELS.length - 1];

/** Every achievement, roughly in the order a player meets them. */
export const ACHIEVEMENTS: readonly Achievement[] = [
  counter(
    'first-shard',
    'First Delivery',
    'Bring a Sunshard home to the Kiln.',
    1,
    (s) => s.totals.treasures,
  ),
  feat('clean-sweep', 'Clean Sweep', 'Collect every Sunshard in a lesson.', cleared),
  feat(
    'early-finish',
    'Early Finish',
    'Collect every Sunshard with at least half the day left.',
    (day) => cleared(day) && day.timeLeft >= day.dayLength / 2,
  ),
  feat(
    'nobody-left-behind',
    'Nobody Left Behind',
    'Collect every Sunshard without losing an Emberling.',
    (day) => cleared(day) && day.workersLost === 0,
  ),
  counter('first-hunt', 'First Hunt', 'Defeat a Mossback.', 1, (s) => s.totals.enemies),
  feat(
    'pest-control',
    'Pest Control',
    'Defeat every Mossback in a lesson that has them.',
    (day) => day.enemiesTotal > 0 && day.enemiesDefeated === day.enemiesTotal,
  ),
  feat(
    'untouchable',
    'Untouchable',
    'Collect every Sunshard in a lesson with Mossbacks without the Warden being hit.',
    (day) => cleared(day) && day.enemiesTotal > 0 && day.captainHits === 0,
  ),
  feat(
    'big-family',
    'Big Family',
    'End a day with 40 or more Emberlings.',
    (day) => day.workersAlive >= 40,
  ),
  counter('platinum-student', 'Platinum Student', 'Earn Platinum in any lesson.', 1, (s) =>
    lessonsAtLeast(s, 'Platinum'),
  ),
  counter('honor-roll', 'Honor Roll', 'Earn Gold or better in five lessons.', 5, (s) =>
    lessonsAtLeast(s, 'Gold'),
  ),
  counter('hauler', 'Hauler', 'Bring 50 Sunshards home in total.', 50, (s) => s.totals.treasures),
  counter(
    'mossback-hunter',
    'Mossback Hunter',
    'Defeat 25 Mossbacks in total.',
    25,
    (s) => s.totals.enemies,
  ),
  counter('regular', 'Regular', 'Play 25 days.', 25, (s) => s.totals.days),
  {
    id: 'graduate',
    name: 'Graduate',
    description: `Earn Silver or better in ${FINAL.name}.`,
    earned: (save) => {
      const rank = bestRank(save, FINAL.id);
      return rank !== null && rankValue(rank) >= rankValue('Silver');
    },
  },
  counter(
    'dandori-master',
    'Dandori Master',
    'Earn Platinum in every lesson.',
    LEVELS.length,
    (s) => lessonsAtLeast(s, 'Platinum'),
  ),
];

export interface UnlockResult {
  save: SaveData;
  /** Achievements earned by this check, in list order. */
  unlocked: Achievement[];
}

/** Records every achievement the save (and the finished day, if any) has newly earned. */
export function unlockAchievements(save: SaveData, day: DayRecord | null, now: Date): UnlockResult {
  const unlocked = ACHIEVEMENTS.filter(
    (achievement) => !(achievement.id in save.achievements) && achievement.earned(save, day),
  );
  if (unlocked.length === 0) return { save, unlocked };
  const stamp = now.toISOString();
  const achievements = { ...save.achievements };
  for (const achievement of unlocked) achievements[achievement.id] = stamp;
  return { save: { ...save, achievements }, unlocked };
}

export function findAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}
