import { describe, expect, it } from 'vitest';
import { playPrint } from '../leaderboard/runCode';
import { CHALLENGE_LEVELS, defineLevel, LEVELS } from '../world/level';
import type { PropKind, Wall } from '../world/levelTypes';
import { KIT_LOOKS, propPieces, wallPieces } from './kit';
import { kitBatches } from './KitMeshes';

/** How far a piece may stand out of its wall's box: leaves and bricks bulge a little. */
const BULGE = 1.2;

const WALLS: Wall[] = [
  { x: 4, z: -3, w: 20, d: 2 },
  { x: -6, z: 5, w: 2, d: 14 },
  { x: 0, z: 0, w: 4, d: 4 },
];

describe('the kit', () => {
  it.each(KIT_LOOKS.flatMap((look) => WALLS.map((wall) => [look, wall] as const)))(
    '%s walls fill their box, and stand taller than the Warden',
    (look, wall) => {
      const pieces = wallPieces(wall, look);
      expect(pieces.length).toBeGreaterThan(0);
      let top = 0;
      for (const piece of pieces) {
        expect(Math.abs(piece.x - wall.x), look).toBeLessThanOrEqual(wall.w / 2 + BULGE);
        expect(Math.abs(piece.z - wall.z), look).toBeLessThanOrEqual(wall.d / 2 + BULGE);
        top = Math.max(top, piece.y + piece.sy / 2);
      }
      // The Warden is 1.2 tall; walls are thrown over, never seen over.
      expect(top, look).toBeGreaterThan(1.6);
    },
  );

  const PROP_KINDS: PropKind[] = [
    'flowerpot',
    'watering-can',
    'trowel',
    'glove',
    'croquet-hoop',
    'button',
    'teacup',
    'acorn-cap',
    'conker',
    'spool',
    'pocket-watch',
    'thimble',
    'coin',
    'candle',
    'book-stack',
    'plant-label',
    'lily-pad',
    'gear',
  ];
  it.each(PROP_KINDS)('builds a %s, placed, turned and scaled', (kind) => {
    const plain = propPieces({ kind, x: 0, z: 0 });
    expect(plain.length).toBeGreaterThan(0);
    const moved = propPieces({ kind, x: 10, z: -5, scale: 2, turn: 1 });
    expect(moved).toHaveLength(plain.length);
    expect(moved[0].sx).toBeCloseTo(plain[0].sx * 2);
    for (const piece of moved) expect(Math.hypot(piece.x - 10, piece.z + 5)).toBeLessThan(40);
  });

  it('draws any field in a handful of instanced meshes', () => {
    for (const level of [...LEVELS, ...CHALLENGE_LEVELS]) {
      expect(kitBatches(level).length, level.id).toBeLessThanOrEqual(24);
    }
  });
});

describe('art-only data', () => {
  it('never changes a field’s fingerprint, so dressing a field never resets its board', () => {
    for (const level of [...LEVELS, ...CHALLENGE_LEVELS]) {
      const { props: _props, wallLook: _look, ...plain } = level;
      void _props;
      void _look;
      const bare = defineLevel({ ...plain });
      const dressed = defineLevel({
        ...plain,
        wallLook: 'hedge',
        props: [{ kind: 'teacup', x: 1, z: 2 }],
      });
      expect(playPrint(dressed), level.id).toBe(playPrint(bare));
    }
    // Lessons keep the fingerprints their closed boards had: see the 0.17.0 board fixture in
    // leaderboard.test.ts, which still accepts every run on the dressed Many Hands.
  });
});
