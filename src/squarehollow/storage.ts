import { BLOCKS, STARTING_HOTBAR } from './blocks';

const STORAGE_KEY = 'dandori-academy-squarehollow';

/** What is kept of the island between visits: which island it is, and what was built on it. */
export interface IslandSave {
  seed: number;
  /** Every changed cell as [cell index, block id]. */
  edits: [number, number][];
  hotbar: number[];
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** A fresh island: a new seed, nothing built yet. */
export function newIsland(): IslandSave {
  return {
    seed: Math.floor(Math.random() * 2 ** 31),
    edits: [],
    hotbar: [...STARTING_HOTBAR],
  };
}

/** Reads the island back, or a fresh one if there is none (or it is unreadable). */
export function loadIsland(): IslandSave {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return newIsland();
    const data = JSON.parse(raw) as Partial<IslandSave>;
    if (typeof data.seed !== 'number' || !Number.isInteger(data.seed)) return newIsland();
    const edits = Array.isArray(data.edits)
      ? data.edits.filter(
          (entry): entry is [number, number] =>
            Array.isArray(entry) && entry.length === 2 && entry.every(Number.isInteger),
        )
      : [];
    const hotbar =
      Array.isArray(data.hotbar) &&
      data.hotbar.length === STARTING_HOTBAR.length &&
      data.hotbar.every((id) => Number.isInteger(id) && BLOCKS[id]?.placeable)
        ? data.hotbar
        : [...STARTING_HOTBAR];
    return { seed: data.seed, edits, hotbar };
  } catch {
    return newIsland();
  }
}

export function saveIsland(save: IslandSave): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Full or blocked storage: the island simply is not kept this time.
  }
}
