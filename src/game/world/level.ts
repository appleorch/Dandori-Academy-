import type { Box, Point } from '../navigation/NavGrid';

export interface TreasureSpawn extends Point {
  id: string;
  weight: number;
}

export interface LevelDefinition {
  id: string;
  /** 1-based stage number stored in the save file. */
  stage: number;
  name: string;
  width: number;
  depth: number;
  dayLength: number;
  /** Score that earns the top rank. */
  parScore: number;
  seed: number;
  startingWorkers: number;
  captain: Point;
  kiln: Point;
  obstacles: Box[];
  treasures: TreasureSpawn[];
  enemies: Point[];
}

/**
 * Lesson 1. Two walls split the field into three lanes. Throwing over a wall is
 * faster than walking around it, but every haul still has to walk home.
 */
export const LESSON_1: LevelDefinition = {
  id: 'lesson-1',
  stage: 1,
  name: 'Lesson 1: First Light',
  width: 60,
  depth: 40,
  dayLength: 180,
  parScore: 3300,
  seed: 1,
  startingWorkers: 10,
  captain: { x: -15, z: 2 },
  kiln: { x: -19, z: 0 },
  obstacles: [
    { x: -6, z: -9, w: 2, d: 22 },
    { x: 8, z: 9, w: 2, d: 22 },
    { x: 0, z: 11, w: 4, d: 4 },
    { x: 18, z: -11, w: 6, d: 3 },
  ],
  treasures: [
    { id: 'shard-1', x: -13, z: -9, weight: 1 },
    { id: 'shard-2', x: -11, z: 13, weight: 2 },
    { id: 'shard-3', x: 0, z: -13, weight: 3 },
    { id: 'shard-4', x: 3, z: 3, weight: 4 },
    { id: 'shard-5', x: 17, z: 13, weight: 5 },
    { id: 'shard-6', x: 24, z: -4, weight: 8 },
  ],
  enemies: [
    { x: -1, z: 5 },
    { x: 14, z: -6 },
    { x: 23, z: 8 },
  ],
};

export const LEVELS: readonly LevelDefinition[] = [LESSON_1];
