/**
 * A small local log of errors, kept in the browser so a player can copy it into a bug report.
 * Nothing is ever sent anywhere. It keeps the most recent few, newest last.
 */

export interface LoggedError {
  /** ISO time it happened. */
  at: string;
  /** Where it was caught: the 3D view, an uncaught error, an unhandled promise. */
  where: string;
  message: string;
  stack?: string;
  version?: string;
}

const STORAGE_KEY = 'dandori-academy-errors';
/** Most errors kept. */
export const ERRORS_KEPT = 20;
/** Longest stack kept, in characters. */
const STACK_MAX = 2000;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The errors kept so far, oldest first. */
export function readErrors(storage: Storage | null = browserStorage()): LoggedError[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter(
          (entry): entry is LoggedError =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof (entry as LoggedError).message === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

/** Adds an error to the log, dropping the oldest past the limit. Never throws. */
export function recordError(
  where: string,
  error: unknown,
  version?: string,
  storage: Storage | null = browserStorage(),
  now: Date = new Date(),
): void {
  const entry: LoggedError = {
    at: now.toISOString(),
    where,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack?.slice(0, STACK_MAX) : undefined,
    version,
  };
  try {
    const list = [...readErrors(storage), entry].slice(-ERRORS_KEPT);
    storage?.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // A full or blocked storage only loses the log, never the game.
  }
}

export function clearErrors(storage: Storage | null = browserStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/** The log as plain text, ready to paste into a bug report. */
export function errorReport(errors: readonly LoggedError[], userAgent = ''): string {
  if (errors.length === 0) return 'No errors recorded.';
  const lines = [`Dandori Academy error log (${errors.length})`, userAgent].filter(Boolean);
  for (const error of errors) {
    lines.push(
      '',
      `${error.at} [${error.where}]${error.version ? ` v${error.version}` : ''}`,
      error.message,
    );
    if (error.stack) lines.push(error.stack);
  }
  return lines.join('\n');
}
