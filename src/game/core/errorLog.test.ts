import { describe, expect, it } from 'vitest';
import { clearErrors, ERRORS_KEPT, errorReport, readErrors, recordError } from './errorLog';

function storage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe('the error log', () => {
  it('keeps the most recent errors with where they happened, and clears', () => {
    const store = storage();
    for (let i = 0; i < ERRORS_KEPT + 5; i++) {
      recordError(
        '3D view',
        new Error(`boom ${i}`),
        '0.19.1',
        store,
        new Date(Date.UTC(2026, 10, 24, 0, i)),
      );
    }
    const errors = readErrors(store);
    expect(errors).toHaveLength(ERRORS_KEPT);
    expect(errors.at(-1)?.message).toBe(`boom ${ERRORS_KEPT + 4}`);
    expect(errors[0].where).toBe('3D view');
    expect(errorReport(errors)).toContain('boom');
    clearErrors(store);
    expect(readErrors(store)).toEqual([]);
    expect(errorReport([])).toBe('No errors recorded.');
  });

  it('survives a damaged log and non-Error values', () => {
    const store = storage();
    store.setItem('dandori-academy-errors', '{oops');
    expect(readErrors(store)).toEqual([]);
    recordError('unhandled promise', 'plain text', undefined, store);
    expect(readErrors(store)[0].message).toBe('plain text');
  });
});
