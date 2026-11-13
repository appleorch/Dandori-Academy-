import { describe, expect, it } from 'vitest';
import pkg from '../../../package.json';
import { CHANGELOG, GAME_VERSION } from './changelog';

function parts(version: string): number[] {
  return version.split('.').map(Number);
}

describe('changelog', () => {
  it('starts with the version in package.json', () => {
    expect(GAME_VERSION).toBe(pkg.version);
  });

  it('lists releases newest first with real dates and notes', () => {
    for (let i = 0; i < CHANGELOG.length; i++) {
      const release = CHANGELOG[i];
      expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(Number.isNaN(Date.parse(release.date))).toBe(false);
      expect(release.changes.length).toBeGreaterThan(0);
      if (i > 0) {
        const [newer, older] = [parts(CHANGELOG[i - 1].version), parts(release.version)];
        const cmp = newer[0] - older[0] || newer[1] - older[1] || newer[2] - older[2];
        expect(cmp).toBeGreaterThan(0);
        expect(CHANGELOG[i - 1].date >= release.date).toBe(true);
      }
    }
  });
});
