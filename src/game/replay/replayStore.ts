import { sha256 } from '../save/sha256';
import type { Difficulty } from '../core/difficulty';
import type { ModeId } from '../modes/modes';
import type { DayLog } from './replay';

/**
 * Where replays are kept in this browser: IndexedDB, as logs are too big for the save. The
 * last day played is kept as `last`, and the best day on each field by its field key. Where
 * IndexedDB is missing or blocked (a private window), they are kept in memory for the visit.
 */

const DB = 'dandori-replays';
const STORE = 'logs';
const memory = new Map<string, DayLog>();

/** The key a field's best replay is kept under. */
export function bestKey(level: string, difficulty: Difficulty, mode: ModeId, coop = false): string {
  return `best:${mode}:${level}:${difficulty}${coop ? ':coop' : ''}`;
}

export const LAST_KEY = 'last';

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  act: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = act(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function putReplay(key: string, log: DayLog): Promise<void> {
  memory.set(key, log);
  await run('readwrite', (store) => store.put(log, key));
}

export async function getReplay(key: string): Promise<DayLog | null> {
  const stored = await run<DayLog | undefined>('readonly', (store) => store.get(key));
  return stored ?? memory.get(key) ?? null;
}

/** A log's fingerprint, as a board post names it: SHA-256 of its JSON, in hex. */
export function logHash(log: DayLog): string {
  const bytes = sha256(new TextEncoder().encode(JSON.stringify(log)));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
