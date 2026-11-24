import type { SproutKind } from '../game/workers/sprouts';

/**
 * Each kind's head shape as a small icon, matching the 3D Sproutlings: a flame tuft, a droplet,
 * a square cap and a zig-zag bolt. Coloured by the palette (see palette.ts) but readable by
 * shape alone. Decorative: the kind's name is always given alongside.
 */
const PATHS: Record<SproutKind, string> = {
  ember: 'M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-4 0-7 1-10z',
  dew: 'M12 2c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z',
  stone: 'M3 8l9-4 9 4-9 4zM7 11v5c3 2 7 2 10 0v-5l-5 2.2z',
  spark: 'M14 2L5 13h5l-2 9 10-12h-5l3-8z',
};

export function KindGlyph({ kind }: { kind: SproutKind }) {
  return (
    <svg className={`kind-glyph ${kind}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={PATHS[kind]} fill="currentColor" />
    </svg>
  );
}
