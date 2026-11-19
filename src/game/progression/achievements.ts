import type { Difficulty } from '../core/difficulty';
import { rankValue, type Rank } from '../dandori/scoring';
import { bestRank, type DayFeats, type DayRecord, type SaveData } from '../save/saveManager';
import { recoveredRelics, RELICS } from '../story/relics';
import { LEVELS, MAIN_LEVELS } from '../world/level';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** Kept off the list, name and all, until it is earned. */
  secret?: boolean;
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

function lessonsAtLeast(save: SaveData, rank: Rank, difficulty: Difficulty = 'normal'): number {
  return LEVELS.filter((level) => {
    const earned = bestRank(save, level.id, difficulty);
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

/** Earned by something other than a finished day; see `grantAchievement`. */
function secret(id: string, name: string, description: string): Achievement {
  return { id, name, description, secret: true, earned: () => false };
}

/** A feat the finished day recorded, or 0 if it predates that feat. */
function at(day: DayRecord, key: keyof DayFeats): number {
  return day.feats?.[key] ?? 0;
}

/** Ids of the side lessons, the caves: their relics are keyed by cave in the save. */
const CAVES = new Set(LEVELS.filter((level) => level.side).map((level) => level.id));

const FINAL = LEVELS.find((level) => level.id === 'final-exam') ?? LEVELS[LEVELS.length - 1];

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
    'Collect every Sunshard without losing a Sproutling.',
    (day) => cleared(day) && day.workersLost === 0,
  ),
  counter('first-hunt', 'First Hunt', 'Defeat an enemy.', 1, (s) => s.totals.enemies),
  feat(
    'pest-control',
    'Pest Control',
    'Defeat every enemy in a lesson that has them.',
    (day) => day.enemiesTotal > 0 && day.enemiesDefeated === day.enemiesTotal,
  ),
  feat(
    'untouchable',
    'Untouchable',
    'Collect every Sunshard in a lesson with enemies without the Warden being hit.',
    (day) => cleared(day) && day.enemiesTotal > 0 && day.captainHits === 0,
  ),
  feat(
    'big-family',
    'Big Family',
    'End a day with 40 or more Sproutlings.',
    (day) => day.workersAlive >= 40,
  ),
  counter('platinum-student', 'Platinum Student', 'Earn Platinum in any lesson.', 1, (s) =>
    lessonsAtLeast(s, 'Platinum'),
  ),
  counter(
    'diamond-cut',
    'Diamond Cut',
    'Earn Diamond in any lesson: beat the Platinum time by a sixth.',
    1,
    (s) => lessonsAtLeast(s, 'Diamond'),
  ),
  counter('honor-roll', 'Honor Roll', 'Earn Gold or better in five lessons.', 5, (s) =>
    lessonsAtLeast(s, 'Gold'),
  ),
  counter('hauler', 'Hauler', 'Bring 50 Sunshards home in total.', 50, (s) => s.totals.treasures),
  counter(
    'mossback-hunter',
    'Monster Hunter',
    'Defeat 25 enemies in total.',
    25,
    (s) => s.totals.enemies,
  ),
  counter('regular', 'Regular', 'Play 25 days.', 25, (s) => s.totals.days),
  feat(
    'glowcap',
    'Glowcap Gatherer',
    'Bring a Glowcap home before it wilts.',
    (day) => day.bloomsCollected > 0,
  ),
  feat('gatecrasher', 'Pit Fighter', 'Defeat the Gravelmaw.', (day) =>
    day.bossesDefeated.includes('gravelmaw'),
  ),
  feat('uprooted', 'Uprooted', 'Defeat the Lanternroot.', (day) =>
    day.bossesDefeated.includes('lanternroot'),
  ),
  feat('bell-ringer', 'Bell Ringer', 'Defeat the Bellwether.', (day) =>
    day.bossesDefeated.includes('bellwether'),
  ),
  {
    id: 'graduate',
    name: 'Graduate',
    description: `Earn Silver or better in ${FINAL.name}.`,
    earned: (save) => {
      const rank = bestRank(save, FINAL.id);
      return rank !== null && rankValue(rank) >= rankValue('Silver');
    },
  },
  feat('lights-on', 'Lights On', 'Defeat the Snuffer.', (day) =>
    day.bossesDefeated.includes('snuffer'),
  ),
  {
    id: 'first-ember',
    name: 'The First Ember',
    description: 'Earn Silver or better in The Undercroft.',
    earned: (save) => {
      const rank = bestRank(save, 'the-undercroft');
      return rank !== null && rankValue(rank) >= rankValue('Silver');
    },
  },
  {
    id: 'restorer',
    name: 'Restorer',
    description: 'Earn Silver or better on Restoration Day, the last of the Grand Curriculum.',
    earned: (save) => {
      const rank = bestRank(save, 'restoration-day');
      return rank !== null && rankValue(rank) >= rankValue('Silver');
    },
  },
  counter(
    'curator',
    'Curator',
    'Recover every Relic of Harmony for the Field Guide.',
    RELICS.length,
    (s) => recoveredRelics(s.treasuresCollected).size,
  ),
  counter('hardened', 'Hardened', 'Earn Silver or better on Hard in any lesson.', 1, (s) =>
    lessonsAtLeast(s, 'Silver', 'hard'),
  ),
  {
    id: 'hard-as-stone',
    name: 'Hard as Stone',
    description: 'Earn Platinum on Hard against the Bellwether.',
    earned: (save) => {
      const rank = bestRank(save, 'the-bellwether', 'hard');
      return rank !== null && rankValue(rank) >= rankValue('Platinum');
    },
  },
  counter(
    'dandori-master',
    'Dandori Master',
    'Earn Platinum in every lesson.',
    LEVELS.length,
    (s) => lessonsAtLeast(s, 'Platinum'),
  ),
  counter(
    'spelunker',
    'Spelunker',
    'Find every old way down into the Depths.',
    LEVELS.filter((level) => level.side).length,
    (s) => s.discovered.length,
  ),
  // Ranks across the whole Academy.
  counter(
    'gold-standard',
    'Gold Standard',
    'Earn Gold or better in every lesson.',
    LEVELS.length,
    (s) => lessonsAtLeast(s, 'Gold'),
  ),
  counter('platinum-ten', 'Platinum Record', 'Earn Platinum or better in ten lessons.', 10, (s) =>
    lessonsAtLeast(s, 'Platinum'),
  ),
  counter('diamond-five', 'Diamonds Are Forever', 'Earn Diamond in five lessons.', 5, (s) =>
    lessonsAtLeast(s, 'Diamond'),
  ),
  counter('diamond-twenty', 'Diamond Mine', 'Earn Diamond in twenty lessons.', 20, (s) =>
    lessonsAtLeast(s, 'Diamond'),
  ),
  counter('hard-ten', 'Hardy Perennial', 'Earn Gold or better on Hard in ten lessons.', 10, (s) =>
    lessonsAtLeast(s, 'Gold', 'hard'),
  ),
  counter('hard-diamond', 'Unbreakable', 'Earn Diamond on Hard in any lesson.', 1, (s) =>
    lessonsAtLeast(s, 'Diamond', 'hard'),
  ),
  counter(
    'well-travelled',
    'Well Travelled',
    'Finish every numbered lesson at least once.',
    MAIN_LEVELS.length,
    (s) => MAIN_LEVELS.filter((level) => bestRank(s, level.id) !== null).length,
  ),
  // Optional treasure.
  feat(
    'full-basket',
    'Full Basket',
    'Take every bonus a lesson offers in one day: every Glowcap, every twin pair, every Dewglass whole.',
    (day) => {
      const f = day.feats;
      if (!f) return false;
      const total = (f.glowcapsTotal ?? 0) + (f.twinsTotal ?? 0) + (f.dewglassTotal ?? 0);
      const got = (f.glowcaps ?? 0) + (f.twins ?? 0) + (f.dewglass ?? 0);
      return total > 0 && got === total;
    },
  ),
  feat(
    'twin-flame',
    'Twin Flame',
    'Bring a pair of twin shards home within ten seconds.',
    (day) => at(day, 'twins') > 0,
  ),
  feat(
    'steady-hands',
    'Steady Hands',
    'Bring a Dewglass home without cracking it.',
    (day) => at(day, 'dewglass') > 0,
  ),
  counter(
    'mushroom-season',
    'Mushroom Season',
    'Bring 25 Glowcaps home in total.',
    25,
    (s) => s.totals.glowcaps,
  ),
  // The four kinds and their jobs.
  feat(
    'deep-water',
    'Deep Water',
    'Bring home a Sunshard that lay in the water.',
    (day) => at(day, 'sunkHome') > 0,
  ),
  feat(
    'trial-by-fire',
    'Trial by Fire',
    'Bring home a Sunshard from beside a flame vent.',
    (day) => at(day, 'ventHome') > 0,
  ),
  feat(
    'live-wire',
    'Live Wire',
    'Bring home a Sunshard from under a spark coil.',
    (day) => at(day, 'coilHome') > 0,
  ),
  feat(
    'crystal-breaker',
    'Crystal Breaker',
    'Break a crystal gate.',
    (day) => at(day, 'crystalBroken') > 0,
  ),
  feat(
    'glasscutter',
    'Glasscutter',
    'Break three crystal gates in one day.',
    (day) => at(day, 'crystalBroken') >= 3,
  ),
  feat(
    'lifeguard',
    'Lifeguard',
    'Whistle three Sproutlings out of fire or water in one day.',
    (day) => at(day, 'rescued') >= 3,
  ),
  counter(
    'firefighter',
    'Fire Brigade',
    'Whistle 25 Sproutlings out of fire or water in total.',
    25,
    (s) => s.totals.rescued,
  ),
  feat(
    'full-spectrum',
    'Full Spectrum',
    'End a day with all four kinds of Sproutling alive.',
    (day) => at(day, 'kindsAlive') >= 4,
  ),
  counter(
    'green-thumb',
    'Green Thumb',
    'Grow 100 Sproutlings in total.',
    100,
    (s) => s.totals.grown,
  ),
  counter(
    'greenhouse',
    'Greenhouse',
    'Grow 1,000 Sproutlings in total.',
    1000,
    (s) => s.totals.grown,
  ),
  feat(
    'grand-army',
    'Grand Army',
    'End a day with 80 or more Sproutlings.',
    (day) => day.workersAlive >= 80,
  ),
  // Below the fields.
  feat(
    'round-trip',
    'Round Trip',
    'Go down a way down and come back up on the same day.',
    (day) => at(day, 'caves') > 0,
  ),
  feat(
    'cleared-out',
    'Cleared Out',
    'Empty a cave of every relic on a day above.',
    (day) => at(day, 'cavesEmptied') > 0,
  ),
  counter(
    'below-stairs',
    'Below Stairs',
    'Bring 10 relics up from the caves in total.',
    10,
    (s) => s.treasuresCollected.filter((key) => CAVES.has(key.split(':')[0])).length,
  ),
  counter(
    'regular-diver',
    'Regular Diver',
    'Go down into a cave and back up 10 times.',
    10,
    (s) => s.totals.caveTrips,
  ),
  // Skill.
  feat(
    'flawless',
    'Flawless',
    'Defeat a boss without losing a single Sproutling all day.',
    (day) => day.bossesDefeated.length > 0 && day.workersLost === 0,
  ),
  feat(
    'photo-finish',
    'Photo Finish',
    'Bring the last Sunshard home with under five seconds left.',
    (day) => cleared(day) && day.timeLeft < 5,
  ),
  feat(
    'blitz',
    'Blitz',
    'Collect every Sunshard with three quarters of the day left.',
    (day) => cleared(day) && day.timeLeft >= (day.dayLength * 3) / 4,
  ),
  feat(
    'chain-gang',
    'Chain Gang',
    'Build a chain of five deliveries.',
    (day) => at(day, 'bestChain') >= 5,
  ),
  feat(
    'chain-reaction',
    'Chain Reaction',
    'Build a chain of ten deliveries.',
    (day) => at(day, 'bestChain') >= 10,
  ),
  feat(
    'pacifist',
    'Pacifist',
    'Collect every Sunshard in a lesson with beasts in it without defeating any.',
    (day) => cleared(day) && at(day, 'beasts') > 0 && day.enemiesDefeated === 0,
  ),
  feat(
    'iron-warden',
    'Iron Warden',
    'Collect every Sunshard on Hard without the Warden being hit.',
    (day) => cleared(day) && day.difficulty === 'hard' && day.captainHits === 0,
  ),
  feat(
    'hard-and-whole',
    'Nobody Left Behind, Hard',
    'Collect every Sunshard on Hard without losing a Sproutling.',
    (day) => cleared(day) && day.difficulty === 'hard' && day.workersLost === 0,
  ),
  // The long haul.
  counter('veteran', 'Veteran', 'Play 100 days.', 100, (s) => s.totals.days),
  counter(
    'mover',
    'Mover and Shaker',
    'Bring 500 Sunshards home in total.',
    500,
    (s) => s.totals.treasures,
  ),
  counter(
    'exterminator',
    'Exterminator',
    'Defeat 200 enemies in total.',
    200,
    (s) => s.totals.enemies,
  ),
  counter(
    'on-the-board',
    'On the Board',
    'Post a run to the Academy leaderboard.',
    1,
    (s) => s.posted.length,
  ),
  counter(
    'board-regular',
    'Board Regular',
    'Post 20 runs to the Academy leaderboard.',
    20,
    (s) => s.posted.length,
  ),
  secret('back-room', 'Five Knocks', 'Find where the Sproutlings go on Thursdays.'),
  secret('card-shark', 'Card Shark', 'Win every chip at the table in the back room.'),
  secret('royal-flush', 'Lucky Ember', 'Win a hand with a straight flush.'),
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

/** Grants an achievement by id, for those earned outside a day. Returns the save unchanged if it is already held. */
export function grantAchievement(save: SaveData, id: string, now: Date): SaveData {
  if (id in save.achievements || !ACHIEVEMENTS.some((achievement) => achievement.id === id)) {
    return save;
  }
  return { ...save, achievements: { ...save.achievements, [id]: now.toISOString() } };
}

export function findAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}
