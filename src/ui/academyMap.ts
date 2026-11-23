/**
 * Where everything sits on the illustrated map of the Academy grounds used to pick a story
 * lesson. Coordinates are in the map's own 1000 by 640 space. Each term is a region of the
 * grounds; the lessons wind through it in order, and the trail runs from region to region
 * round the Academy, which stands in the middle with the Undercroft beneath it.
 */

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 640;

export interface MapRegion {
  /** The chapter (term) this region holds, by id. */
  chapter: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Fill, and the darker ink used for its label and decorations. */
  fill: string;
  ink: string;
  /** Where the region's name is written. */
  labelX: number;
  labelY: number;
  /** What grows (or stands) there, drawn as small marks across the region. */
  decor: 'tree' | 'leaf' | 'reed' | 'star' | 'dome' | 'rock';
}

export const REGIONS: readonly MapRegion[] = [
  {
    chapter: 'kindling',
    cx: 205,
    cy: 525,
    rx: 185,
    ry: 100,
    fill: '#a9d78a',
    ink: '#3f6b2a',
    labelX: 70,
    labelY: 448,
    decor: 'tree',
  },
  {
    chapter: 'field-work',
    cx: 540,
    cy: 540,
    rx: 165,
    ry: 90,
    fill: '#efc38a',
    ink: '#8a4f17',
    labelX: 470,
    labelY: 618,
    decor: 'leaf',
  },
  {
    chapter: 'wild-marches',
    cx: 850,
    cy: 450,
    rx: 135,
    ry: 165,
    fill: '#93cfc0',
    ink: '#1f5f53',
    labelX: 800,
    labelY: 622,
    decor: 'reed',
  },
  {
    chapter: 'long-road',
    cx: 720,
    cy: 175,
    rx: 235,
    ry: 105,
    fill: '#c4b2ea',
    ink: '#4b3684',
    labelX: 760,
    labelY: 62,
    decor: 'star',
  },
  {
    chapter: 'curriculum',
    cx: 205,
    cy: 190,
    rx: 185,
    ry: 120,
    fill: '#b6e3ea',
    ink: '#2b6873',
    labelX: 60,
    labelY: 58,
    decor: 'dome',
  },
];

/** The Academy itself. */
export const ACADEMY = { x: 455, y: 300 };

/** Every lesson's place on the map. Side lessons are caves, reached from the lesson above them. */
export const NODES: Readonly<Record<string, { x: number; y: number }>> = {
  'many-hands': { x: 80, y: 565 },
  'over-the-wall': { x: 140, y: 500 },
  'the-guard': { x: 215, y: 555 },
  'first-light': { x: 275, y: 485 },
  'long-haul': { x: 345, y: 535 },
  'divide-and-conquer': { x: 420, y: 575 },
  'the-gauntlet': { x: 480, y: 510 },
  'growing-pains': { x: 548, y: 570 },
  switchbacks: { x: 610, y: 505 },
  'final-exam': { x: 675, y: 560 },
  'bramble-gate': { x: 760, y: 575 },
  'drip-line': { x: 830, y: 530 },
  'gravelmaws-pit': { x: 915, y: 545 },
  'three-roots': { x: 870, y: 455 },
  'rush-hour': { x: 935, y: 385 },
  'the-bellwether': { x: 850, y: 335 },
  crossroads: { x: 895, y: 225 },
  'the-span': { x: 815, y: 165 },
  'matched-pairs': { x: 735, y: 215 },
  'glass-river': { x: 655, y: 140 },
  'graduation-day': { x: 570, y: 195 },
  'the-undercroft': { x: 455, y: 400 },
  'terrace-gardens': { x: 335, y: 255 },
  'the-long-drop': { x: 265, y: 185 },
  'crystal-conservatory': { x: 185, y: 250 },
  'clockwork-causeway': { x: 115, y: 170 },
  'restoration-day': { x: 200, y: 105 },
  'the-cistern': { x: 735, y: 300 },
  'skitter-warren': { x: 640, y: 255 },
  'the-root-cellar': { x: 560, y: 285 },
};

/** Colour of a lesson's node, by its setting. */
export const THEME_COLOURS: Readonly<Record<string, string>> = {
  meadow: '#5c9e3c',
  autumn: '#d0782a',
  marsh: '#2f8f7c',
  dusk: '#7a5ac0',
  cave: '#4a4a66',
  terrarium: '#3fa5b8',
};

/** Smooth trail through points (a Catmull-Rom spline written as cubic Bezier segments). */
export function trailPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x} ${p2.y}`;
  }
  return d;
}

/** A soft, slightly irregular outline for a region, the same every time. */
export function regionPath(region: MapRegion): string {
  const points: { x: number; y: number }[] = [];
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const wobble = 1 + 0.07 * Math.sin(i * 2.7 + region.cx * 0.01) + 0.04 * Math.cos(i * 1.3);
    points.push({
      x: Math.round(region.cx + Math.cos(angle) * region.rx * wobble),
      y: Math.round(region.cy + Math.sin(angle) * region.ry * wobble),
    });
  }
  // Closed: the same spline, run round from the last point back to the first.
  const at = (i: number) => points[(i + steps) % steps];
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < steps; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x} ${p2.y}`;
  }
  return `${d} Z`;
}

/** Spots for a region's decorations: spread over it, away from its edge, the same every time. */
export function decorSpots(region: MapRegion, count: number): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    // A golden-angle spiral fills the ellipse evenly.
    const r = Math.sqrt((i + 0.5) / count) * 0.82;
    const angle = i * 2.399963 + region.cy * 0.003;
    spots.push({
      x: Math.round(region.cx + Math.cos(angle) * region.rx * r),
      y: Math.round(region.cy + Math.sin(angle) * region.ry * r),
    });
  }
  return spots;
}
