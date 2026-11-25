import type { Difficulty } from '../core/difficulty';
import { rankValue, type Rank } from '../dandori/scoring';
import { BATTLE_IDS, CHALLENGE_IDS } from '../modes/modes';
import {
  bestRank,
  modeRank,
  storyCleared,
  type DayFeats,
  type DayRecord,
  type SaveData,
} from '../save/saveManager';
import { recoveredRelics, RELICS } from '../story/relics';
import { RELIC_SETS, setProgress } from '../story/relicSets';
import { CHALLENGE_LEVELS, LEVELS, MAIN_LEVELS } from '../world/level';

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

/** Every field a medal can be won on: the challenge fields, and the lessons they were once played on. */
const MEDAL_FIELDS = [...LEVELS, ...CHALLENGE_LEVELS];

/**
 * Fields with a medal of at least `rank` in any challenge: the challenge fields, and the lessons
 * (with the medals won on them before 0.19.0, or the rank the story once gave).
 */
function lessonsAtLeast(save: SaveData, rank: Rank, difficulty: Difficulty = 'normal'): number {
  return MEDAL_FIELDS.filter((level) => {
    const earned = bestRank(save, level.id, difficulty);
    return earned !== null && rankValue(earned) >= rankValue(rank);
  }).length;
}

/** Lessons cleared in the story on Hard. */
function hardClears(save: SaveData): number {
  return LEVELS.filter((level) => storyCleared(save, level.id, 'hard')).length;
}

/** Whether a lesson has been cleared in the story, on either difficulty. */
function storyDone(save: SaveData, levelId: string): boolean {
  return storyCleared(save, levelId, 'normal') || storyCleared(save, levelId, 'hard');
}

/** Fields with a medal of at least `rank` in one challenge. */
function medalsIn(save: SaveData, mode: string, rank: Rank): number {
  return MEDAL_FIELDS.filter((level) => {
    const earned = modeRank(save, mode, level.id);
    return earned !== null && rankValue(earned) >= rankValue(rank);
  }).length;
}

function battlesWon(save: SaveData, mode?: string): number {
  return Object.entries(save.battles)
    .filter(([id]) => mode === undefined || id === mode)
    .reduce((sum, [, record]) => sum + record.won, 0);
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

/** Days of the daily challenge played, told by the treasure brought home on them. */
function dailies(save: SaveData): number {
  const days = new Set<string>();
  for (const key of save.treasuresCollected) {
    const match = /^hunt-daily-(\d{4}-\d{2}-\d{2}):/.exec(key);
    if (match) days.add(match[1]);
  }
  return days.size;
}

const isDailyDay = (day: DayRecord) => day.levelId.startsWith('hunt-daily-');
const storyDay = (day: DayRecord) => day.mode === 'campaign';
const partsHome = (save: SaveData) => Object.keys(save.campaign.parts).length;

/** The achievements added in 0.40.0 (built late, as they use the helpers above). */
function MORE_ACHIEVEMENTS(): Achievement[] {
  const found = (save: SaveData) => recoveredRelics(save.treasuresCollected);
  const setDone = (id: string) => (save: SaveData) => {
    const relicSet = RELIC_SETS.find((candidate) => candidate.id === id);
    return relicSet ? setProgress(relicSet, found(save)) : 0;
  };
  return [
    // The daily challenge.
    counter('daily-1', 'Morning Round', 'Play the daily challenge.', 1, dailies),
    counter('daily-7', 'A Week of Mornings', 'Play the daily challenge on seven days.', 7, dailies),
    counter('daily-30', 'Groundskeeper', 'Play the daily challenge on thirty days.', 30, dailies),
    feat(
      'daily-gold',
      'Golden Morning',
      'Earn Gold or better on a daily challenge.',
      (d) => isDailyDay(d) && d.rank !== null && rankValue(d.rank) >= rankValue('Gold'),
    ),
    feat(
      'daily-platinum',
      'Before Breakfast',
      'Earn Platinum or better on a daily challenge.',
      (d) => isDailyDay(d) && d.rank !== null && rankValue(d.rank) >= rankValue('Platinum'),
    ),
    feat(
      'daily-perfect',
      'Spotless',
      'Finish a daily challenge without losing anyone.',
      (d) => isDailyDay(d) && cleared(d) && d.workersLost === 0,
    ),
    // Escort.
    counter('escort-1', 'Heavy Lifting', 'Earn a medal on an Escort field.', 1, (save) =>
      medalsIn(save, 'escort', 'Bronze'),
    ),
    counter('escort-6', 'Porter’s Guild', 'Earn a medal on six Escort fields.', 6, (save) =>
      medalsIn(save, 'escort', 'Bronze'),
    ),
    counter(
      'escort-12',
      'Every Stone Home',
      'Earn a medal on all twelve Escort fields.',
      12,
      (save) => medalsIn(save, 'escort', 'Bronze'),
    ),
    counter(
      'escort-gold',
      'Lodestone Bearer',
      'Earn Gold or better on six Escort fields.',
      6,
      (save) => medalsIn(save, 'escort', 'Gold'),
    ),
    counter('escort-diamond', 'Unshakeable', 'Earn Diamond on an Escort field.', 1, (save) =>
      medalsIn(save, 'escort', 'Diamond'),
    ),
    feat(
      'escort-clean',
      'Not a Scratch',
      'Bring an Escort relic home without losing anyone.',
      (d) => d.mode === 'escort' && cleared(d) && d.workersLost === 0,
    ),
    // Relics and their sets.
    counter(
      'relics-50',
      'Cabinet of Curiosities',
      'Recover fifty relics.',
      50,
      (s) => found(s).size,
    ),
    counter('relics-100', 'Museum Piece', 'Recover a hundred relics.', 100, (s) => found(s).size),
    counter(
      'relics-150',
      'The Whole Collection',
      'Recover all 150 relics.',
      150,
      (s) => found(s).size,
    ),
    ...RELIC_SETS.map((relicSet) =>
      counter(
        `set-${relicSet.id}`,
        relicSet.name,
        `Complete the ${relicSet.name} relic set.`,
        8,
        setDone(relicSet.id),
      ),
    ),
    // The story's newer ways.
    counter('parts-10', 'Ten Cogs', 'Bring ten Great Clock parts home.', 10, partsHome),
    counter('parts-25', 'Half a Clock', 'Bring twenty-five Great Clock parts home.', 25, partsHome),
    feat(
      'story-hard',
      'Iron Will',
      'Bring a Clock part home in a story on Hard.',
      (d) =>
        storyDay(d) &&
        d.campaign?.difficulty === 'hard' &&
        Object.keys(d.campaign.parts).length > 0,
    ),
    feat(
      'story-relaxed',
      'Taking It Easy',
      'Play a day of a Relaxed story.',
      (d) => storyDay(d) && d.campaign?.difficulty === 'relaxed',
    ),
    feat(
      'lawn-open',
      'Out of the Lawn',
      'Finish the guided morning.',
      (d) => storyDay(d) && d.campaign?.tutorial === 'done',
    ),
    counter(
      'secrets',
      'Behind the Cracks',
      'Find every section’s secret glade relic.',
      4,
      (save) =>
        ['quad', 'orchard', 'foundry', 'observatory'].filter((id) =>
          found(save).has(`secret-${id}`),
        ).length,
    ),
    feat(
      'no-night-losses',
      'Safe and Sound',
      'End a story day after the first with nobody left out at sunset.',
      (d) =>
        storyDay(d) &&
        (d.campaign?.day ?? 0) > 1 &&
        d.campaign?.totals.leftBehind === 0 &&
        d.workersAlive > 0,
    ),
    // Battles.
    counter('battles-25', 'Seasoned Rival', 'Win twenty-five battles.', 25, (save) =>
      battlesWon(save),
    ),
    feat(
      'battle-flawless',
      'Flawless Victory',
      'Win a battle without losing a Sproutling.',
      (d) => d.battle === 'won' && d.workersLost === 0,
    ),
    // Challenges, all of them.
    counter(
      'every-challenge',
      'Jack of All Trades',
      'Earn a medal in every challenge.',
      CHALLENGE_IDS.length,
      (save) => CHALLENGE_IDS.filter((mode) => medalsIn(save, mode, 'Bronze') > 0).length,
    ),
    counter(
      'gold-50',
      'Fifty Golds',
      'Earn Gold or better on fifty challenge fields.',
      50,
      (save) => lessonsAtLeast(save, 'Gold'),
    ),
    feat(
      'long-chain',
      'Conveyor Belt',
      'Bring twenty treasures home in one day.',
      (d) => d.treasureIds.length >= 20,
    ),
    feat(
      'no-hits',
      'Untouchable Escort',
      'Bring an Escort relic home with the Warden never hit.',
      (d) => d.mode === 'escort' && cleared(d) && d.captainHits === 0,
    ),
    feat(
      'buzzer-beater',
      'Buzzer Beater',
      'Finish a challenge with less than three seconds left.',
      (d) => d.rank !== null && cleared(d) && d.timeLeft > 0 && d.timeLeft < 3,
    ),
    // A few kept quiet until earned.
    {
      ...feat(
        'lonely',
        'Party of One',
        'Finish a challenge with exactly one Sproutling left.',
        (d) => d.rank !== null && d.workersAlive === 1,
      ),
      secret: true,
    },
    {
      ...feat(
        'hoarder',
        'Hoarder',
        'Bring home thirty treasures in a single day.',
        (d) => d.treasureIds.length >= 30,
      ),
      secret: true,
    },
    secret('photographer', 'Say Cheese', 'Save a photo in photo mode.'),
    secret('replay-fan', 'Instant Replay', 'Watch a replay to the end.'),
  ];
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
  counter('platinum-student', 'Platinum Student', 'Earn Platinum in any challenge.', 1, (s) =>
    lessonsAtLeast(s, 'Platinum'),
  ),
  counter(
    'diamond-cut',
    'Diamond Cut',
    'Earn Diamond in any challenge: beat the Platinum pace by a sixth.',
    1,
    (s) => lessonsAtLeast(s, 'Diamond'),
  ),
  counter('honor-roll', 'Honor Roll', 'Earn Gold or better on five challenge fields.', 5, (s) =>
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
    description: `Clear ${FINAL.name} in Time Attack.`,
    earned: (save) => storyDone(save, FINAL.id),
  },
  feat('lights-on', 'Lights On', 'Defeat the Snuffer.', (day) =>
    day.bossesDefeated.includes('snuffer'),
  ),
  {
    id: 'first-ember',
    name: 'The First Ember',
    description: 'Clear The Undercroft in Time Attack.',
    earned: (save) => storyDone(save, 'the-undercroft'),
  },
  {
    id: 'restorer',
    name: 'Restorer',
    description: 'Clear Restoration Day, the last of the Grand Curriculum, in Time Attack.',
    earned: (save) => storyDone(save, 'restoration-day'),
  },
  counter(
    'curator',
    'Curator',
    'Recover every Relic of Harmony for the Field Guide.',
    RELICS.length,
    (s) => recoveredRelics(s.treasuresCollected).size,
  ),
  counter('hardened', 'Hardened', 'Clear any lesson on Hard in Time Attack.', 1, (s) =>
    hardClears(s),
  ),
  {
    id: 'hard-as-stone',
    name: 'Hard as Stone',
    description: 'Clear The Bellwether on Hard without losing a Sproutling.',
    earned: (save, day) =>
      // Earned by a Platinum here back when the story was scored, too.
      rankValue(bestRank(save, 'the-bellwether', 'hard') ?? 'Copper') >= rankValue('Platinum') ||
      (day !== null &&
        (day.mode ?? 'lessons') === 'lessons' &&
        day.levelId === 'the-bellwether' &&
        day.difficulty === 'hard' &&
        cleared(day) &&
        day.workersLost === 0),
  },
  counter(
    'dandori-master',
    'Dandori Master',
    'Earn Platinum or better on thirty challenge fields.',
    30,
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
    'Earn Gold or better on thirty challenge fields.',
    30,
    (s) => lessonsAtLeast(s, 'Gold'),
  ),
  counter(
    'platinum-ten',
    'Platinum Record',
    'Earn Platinum or better on ten challenge fields.',
    10,
    (s) => lessonsAtLeast(s, 'Platinum'),
  ),
  counter(
    'diamond-five',
    'Diamonds Are Forever',
    'Earn Diamond on five challenge fields.',
    5,
    (s) => lessonsAtLeast(s, 'Diamond'),
  ),
  counter('diamond-twenty', 'Diamond Mine', 'Earn Diamond on twenty challenge fields.', 20, (s) =>
    lessonsAtLeast(s, 'Diamond'),
  ),
  counter('hard-ten', 'Hardy Perennial', 'Clear ten lessons on Hard in Time Attack.', 10, (s) =>
    hardClears(s),
  ),
  {
    id: 'hard-diamond',
    name: 'Unbreakable',
    description: 'Clear a lesson on Hard without losing a Sproutling or the Warden being hit.',
    earned: (save, day) =>
      lessonsAtLeast(save, 'Diamond', 'hard') > 0 ||
      (day !== null &&
        day.difficulty === 'hard' &&
        cleared(day) &&
        day.workersLost === 0 &&
        day.captainHits === 0),
  },
  counter(
    'well-travelled',
    'Well Travelled',
    'Clear every numbered lesson in Time Attack.',
    MAIN_LEVELS.length,
    (s) => MAIN_LEVELS.filter((level) => storyDone(s, level.id)).length,
  ),
  // The challenges and battles.
  feat(
    'perfect-bloom',
    'Perfect Bloom',
    'Bring every Sunshard home in a Treasure Hunt without losing a single Sproutling.',
    (day) => day.perfectBloom === true,
  ),
  counter('bumper-crop', 'Bumper Crop', 'Earn Gold or better in a Growing Season.', 1, (s) =>
    medalsIn(s, 'growing', 'Gold'),
  ),
  counter(
    'mission-complete',
    'Mission Complete',
    'Earn Platinum in a Mission: a 100% clear at pace.',
    1,
    (s) => medalsIn(s, 'mission', 'Platinum'),
  ),
  counter(
    'weight-of-the-world',
    'Weight of the World',
    'Earn Diamond in a Dandori Challenge.',
    1,
    (s) => medalsIn(s, 'dandori', 'Diamond'),
  ),
  counter(
    'lean-and-green',
    'Lean and Green',
    'Earn Gold or better in a Lean Squad Trial.',
    1,
    (s) => medalsIn(s, 'trial', 'Gold'),
  ),
  counter(
    'all-rounder',
    'All-Rounder',
    'Earn a Bronze or better in every kind of challenge.',
    CHALLENGE_IDS.length,
    (s) => CHALLENGE_IDS.filter((mode) => medalsIn(s, mode, 'Bronze') > 0).length,
  ),
  counter(
    'first-part',
    'Tick',
    'Bring a part of the Great Clock home in the story.',
    1,
    (s) => Object.keys(s.campaign.parts).length,
  ),
  counter(
    'clockmaker',
    'Clockmaker',
    'Bring all twelve parts of the Great Clock home from the Wild Quad.',
    12,
    (s) => Object.keys(s.campaign.parts).length,
  ),
  {
    id: 'like-clockwork',
    name: 'Like Clockwork',
    description: 'Bring all twelve parts of the Great Clock home within five days.',
    earned: (save) => save.campaign.finished !== null && save.campaign.finished <= 5,
  },
  counter('first-blood', 'Friendly Rivalry', 'Win a battle.', 1, (s) => battlesWon(s)),
  counter(
    'every-race',
    'Triple Crown',
    'Win a Marble Race, a Bingo Race and a Dandori Duel.',
    BATTLE_IDS.length,
    (s) => BATTLE_IDS.filter((mode) => battlesWon(s, mode) > 0).length,
  ),
  counter('champion', 'Champion', 'Win 25 battles.', 25, (s) => battlesWon(s)),
  feat(
    'proctor-beaten',
    'Top of the Class',
    'Win a battle against Proctor Ashwick, the hardest rival.',
    (day) => day.battle === 'won' && day.rival === 'hard',
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
  secret(
    'dark-door',
    'All the Way In',
    'Go all in three times running in the back room, then keep going.',
  ),
  // 0.40.0: forty more, over the daily challenge, Escort, relic sets, the story's new ways and
  // playing together.
  ...MORE_ACHIEVEMENTS(),
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
