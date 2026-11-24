import type { Difficulty } from '../game/core/difficulty';
import { hardUnlocked, modeRank, storyCleared, type SaveData } from '../game/save/saveManager';
import type { ChallengeId } from '../game/modes/modes';
import { rankValue } from '../game/dandori/scoring';
import {
  CHALLENGE_LEVELS,
  entranceTo,
  LEVELS,
  MAIN_LEVELS,
  type LevelDefinition,
} from '../game/world/level';

/**
 * Why a lesson cannot be played yet, or null if it can. The story opens lessons one by one;
 * the challenges and battles offer every lesson the story has opened. Hard opens on a lesson
 * once its story day is cleared on Normal.
 */
export function lockReason(
  save: SaveData,
  level: LevelDefinition,
  difficulty: Difficulty,
): string | null {
  if (level.side) {
    if (!save.discovered.includes(level.id)) {
      const above = entranceTo(level.id);
      return `Not found yet. There is a way down somewhere in lesson ${above?.stage ?? '?'}.`;
    }
  } else if (level.stage > save.stage) {
    return `Locked. Clear lesson ${level.stage - 1} in the story to open it.`;
  }
  if (difficulty === 'hard' && !hardUnlocked(save, level.id)) {
    return 'Hard opens once this lesson is cleared on Normal in the story.';
  }
  return null;
}

/** The story lesson to carry on with: the first open one not yet cleared, or the last played. */
export function nextStoryLesson(save: SaveData, lastPlayed: string): LevelDefinition {
  return (
    MAIN_LEVELS.find((level) => level.stage <= save.stage && !storyCleared(save, level.id)) ??
    LEVELS.find((level) => level.id === lastPlayed) ??
    MAIN_LEVELS[0]
  );
}

/** Lessons open to the battles: every one Time Attack has opened. */
export function openLessons(save: SaveData): LevelDefinition[] {
  return LEVELS.filter((level) => lockReason(save, level, 'normal') === null);
}

/** Whether a challenge field has a medal on it: Bronze or better (Copper is no medal). */
export function hasMedal(save: SaveData, mode: ChallengeId, levelId: string): boolean {
  const rank = modeRank(save, mode, levelId);
  return rank !== null && rankValue(rank) >= rankValue('Bronze');
}

/** How many of a challenge's fields are open from the start. */
export const CHALLENGE_FIELDS_OPEN = 3;

/** A challenge's fields, in order. */
export function challengeFieldsOf(mode: ChallengeId): LevelDefinition[] {
  return CHALLENGE_LEVELS.filter((level) => level.challenge?.mode === mode);
}

/**
 * Why a challenge field cannot be played yet, or null if it can. The first few of each
 * challenge are open from the start; each one after opens with any medal on the one before.
 */
export function challengeLock(save: SaveData, level: LevelDefinition): string | null {
  const field = level.challenge;
  if (!field || field.order <= CHALLENGE_FIELDS_OPEN) return null;
  const before = challengeFieldsOf(field.mode).find(
    (other) => other.challenge?.order === field.order - 1,
  );
  if (!before || hasMedal(save, field.mode, before.id)) return null;
  return `Win any medal on ${before.challenge?.order}. ${before.name} to open this field.`;
}
