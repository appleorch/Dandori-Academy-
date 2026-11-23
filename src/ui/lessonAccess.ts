import type { Difficulty } from '../game/core/difficulty';
import { hardUnlocked, storyCleared, type SaveData } from '../game/save/saveManager';
import { entranceTo, LEVELS, MAIN_LEVELS, type LevelDefinition } from '../game/world/level';

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

/** Lessons open to the challenges and battles: every one the story has opened. */
export function openLessons(save: SaveData): LevelDefinition[] {
  return LEVELS.filter((level) => lockReason(save, level, 'normal') === null);
}
