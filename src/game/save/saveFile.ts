import { LEVELS } from '../world/level';
import { isRecord, parseSave, SAVE_VERSION, type SaveData } from './saveManager';

const FORMAT = 'dandori-academy-save';

/** Anything bigger than this is not a save file. */
export const MAX_SAVE_FILE_BYTES = 256 * 1024;

export type SaveFileResult = { ok: true; save: SaveData } | { ok: false; error: string };

/** The text of a downloadable save file. */
export function serializeSaveFile(save: SaveData, now: Date): string {
  return JSON.stringify({ format: FORMAT, exportedAt: now.toISOString(), save }, null, 2);
}

export function saveFileName(now: Date): string {
  return `dandori-academy-save-${now.toISOString().slice(0, 10)}.json`;
}

/**
 * Reads an uploaded save file. Accepts the exported wrapper or bare save data, and
 * explains in plain words what is wrong with anything else.
 */
export function parseSaveFile(text: string): SaveFileResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not a Dandori Academy save file.' };
  }
  const body = isRecord(data) && data.format === FORMAT ? data.save : data;
  if (isRecord(body) && typeof body.version === 'string' && body.version !== SAVE_VERSION) {
    return {
      ok: false,
      error: `That save comes from a different version of the game (save format ${body.version}), so it cannot be loaded here.`,
    };
  }
  const save = parseSave(body);
  if (!save) {
    return { ok: false, error: 'That file is not a Dandori Academy save file, or it is damaged.' };
  }
  return { ok: true, save: { ...save, stage: Math.min(save.stage, LEVELS.length + 1) } };
}
