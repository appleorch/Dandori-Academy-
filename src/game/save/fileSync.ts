import { readSaveFile, SAVE_FILE_EXTENSION, writeSaveFile } from './saveFile';
import type { SaveData } from './saveManager';

/**
 * Optional sync to a file of the player's choosing, through the browser's File System Access
 * API (Chromium browsers): pick a file once, and every change to the save is written to it,
 * a moment after it happens. The file can live in a folder another program syncs (a cloud
 * drive), which carries the save between computers without any server of ours. The file
 * handle is kept in IndexedDB; after a reload the browser asks again before writing.
 */

interface Writable {
  write(data: BufferSource): Promise<void>;
  close(): Promise<void>;
}
interface FileHandle {
  name: string;
  createWritable(): Promise<Writable>;
  getFile(): Promise<File>;
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
}
type Picker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileHandle>;

const DB = 'dandori-sync';
const KEY = 'handle';
let handle: FileHandle | null = null;
let timer = 0;
/** How long after a change the file is written: a burst of changes is written once. */
const WRITE_DELAY_MS = 2000;

export function syncSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

function store<T>(mode: IDBTransactionMode, act: (s: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T | null>((resolve) => {
    try {
      const open = indexedDB.open(DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore('h');
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        try {
          const request = act(open.result.transaction('h', mode).objectStore('h'));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

/** The file being synced to, once allowed: its name, or null. */
export function syncFileName(): string | null {
  return handle?.name ?? null;
}

/** Asks for a file to sync to, and writes the save to it at once. */
export async function chooseSyncFile(save: SaveData): Promise<string | null> {
  const picker = (window as unknown as { showSaveFilePicker?: Picker }).showSaveFilePicker;
  if (!picker) return null;
  handle = await picker({
    suggestedName: `dandori-academy-sync${SAVE_FILE_EXTENSION}`,
    types: [
      {
        description: 'Dandori Academy save',
        accept: { 'application/octet-stream': [SAVE_FILE_EXTENSION] },
      },
    ],
  });
  await store('readwrite', (s) => s.put(handle, KEY));
  await writeNow(save);
  return handle.name;
}

/** A file synced to on an earlier visit, waiting to be allowed again (on a click). */
export async function rememberedSyncFile(): Promise<FileHandle | null> {
  if (!syncSupported()) return null;
  return (await store<FileHandle | undefined>('readonly', (s) => s.get(KEY))) ?? null;
}

/** Allows the remembered file again (must be called from a click). True once allowed. */
export async function resumeSync(remembered: FileHandle): Promise<boolean> {
  const state = await remembered.requestPermission({ mode: 'readwrite' });
  if (state !== 'granted') return false;
  handle = remembered;
  return true;
}

/** Reads the save in the synced file, if it holds one. */
export async function readSyncFile(): Promise<SaveData | null> {
  if (!handle) return null;
  const file = await handle.getFile();
  const result = readSaveFile(new Uint8Array(await file.arrayBuffer()));
  return result.ok ? result.save : null;
}

export async function stopSync(): Promise<void> {
  handle = null;
  await store('readwrite', (s) => s.delete(KEY));
}

async function writeNow(save: SaveData): Promise<void> {
  if (!handle) return;
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') return;
  const bytes = writeSaveFile(save, new Date(), crypto.getRandomValues(new Uint8Array(16)));
  const writable = await handle.createWritable();
  await writable.write(bytes as BufferSource);
  await writable.close();
}

/** Writes the save to the synced file a moment from now (later changes push it back). */
export function syncSoon(save: SaveData): void {
  if (!handle) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void writeNow(save).catch(() => undefined), WRITE_DELAY_MS);
}
