/**
 * The blocks Squarehollow is made of. An id is an index into BLOCKS; 0 is air.
 *
 * Every block is drawn with one shared greyscale texture atlas (bevels, boards, bricks,
 * leaves) multiplied by its own colours, so the look is soft and painted rather than pixelled.
 */

export const AIR = 0;
export const GRASS = 1;
export const SOIL = 2;
export const STONE = 3;
export const SAND = 4;
export const LOG = 5;
export const LEAVES = 6;
export const PLANKS = 7;
export const BRICK = 8;
export const GLASS = 9;
export const WATER = 10;
export const SNOW = 11;
export const LAMP = 12;
export const SUNSHARD = 13;
export const DEEPROCK = 14;
export const DOORFRAME = 15;
export const CLAY_EMBER = 16;
export const CLAY_DEW = 17;
export const CLAY_SPARK = 18;
export const CLAY_CHALK = 19;

/**
 * How a block is drawn. `solid` and `glow` are opaque cubes; `glow` ignores the light, so it
 * shines at night. `glass` and `water` are see-through and drawn after everything else.
 */
export type Layer = 'solid' | 'glow' | 'glass' | 'water';

/** Tiles of the atlas, four across and two down. */
export const TILE = {
  plain: 0,
  planks: 1,
  brick: 2,
  leaves: 3,
  bark: 4,
  rings: 5,
  glass: 6,
  rough: 7,
} as const;
export const ATLAS_COLUMNS = 4;
export const ATLAS_ROWS = 2;

export interface BlockSpec {
  name: string;
  layer: Layer;
  /** Colour of the top face, the side faces and the bottom face, as `#rrggbb` in sRGB. */
  top: string;
  side: string;
  bottom: string;
  /** Side faces fade from `top` at their upper edge to `bottom` at their lower one. */
  fade?: boolean;
  /** Atlas tile for the top, the sides and the bottom. */
  tiles: readonly [number, number, number];
  /** How much each block's shade wanders from the next one's, 0 to about 0.15. */
  variance: number;
  /** Can be dug out. */
  breakable: boolean;
  /** Offered in the block picker. */
  placeable: boolean;
  /** What digging it sounds like. */
  sound: 'soft' | 'hard' | 'wood' | 'glass' | 'leaf';
}

function block(
  name: string,
  layer: Layer,
  colour: string | readonly [string, string, string],
  tiles: number | readonly [number, number, number],
  extra: Partial<BlockSpec> = {},
): BlockSpec {
  const [top, side, bottom] = typeof colour === 'string' ? [colour, colour, colour] : colour;
  return {
    name,
    layer,
    top,
    side,
    bottom,
    tiles: typeof tiles === 'number' ? [tiles, tiles, tiles] : tiles,
    variance: 0.06,
    breakable: true,
    placeable: true,
    sound: 'hard',
    ...extra,
  };
}

export const BLOCKS: readonly BlockSpec[] = [
  block('Air', 'solid', '#000000', TILE.plain, { breakable: false, placeable: false }),
  block('Meadow turf', 'solid', ['#7ab54a', '#6aa443', '#8a6242'], TILE.plain, {
    fade: true,
    variance: 0.07,
    sound: 'soft',
  }),
  block('Soil', 'solid', '#8a6242', TILE.plain, { sound: 'soft' }),
  block('Stone', 'solid', '#8f9298', TILE.rough),
  block('Sand', 'solid', '#e4d19a', TILE.plain, { variance: 0.04, sound: 'soft' }),
  block('Log', 'solid', ['#b48a58', '#6e4b2c', '#b48a58'], [TILE.rings, TILE.bark, TILE.rings], {
    sound: 'wood',
  }),
  block('Leaves', 'solid', '#4f9a3d', TILE.leaves, { variance: 0.13, sound: 'leaf' }),
  block('Planks', 'solid', '#bc8d57', TILE.planks, { variance: 0.05, sound: 'wood' }),
  block('Brick', 'solid', '#b3573f', TILE.brick, { variance: 0.05 }),
  block('Glass', 'glass', '#dff2f7', TILE.glass, { variance: 0, sound: 'glass' }),
  block('Water', 'water', '#3f80d2', TILE.plain, {
    variance: 0.02,
    breakable: false,
    placeable: false,
  }),
  block('Snow', 'solid', '#f2f5f8', TILE.plain, { variance: 0.02, sound: 'soft' }),
  block('Ember lamp', 'glow', '#ffbf5e', TILE.glass, { variance: 0, sound: 'glass' }),
  block('Sunshard', 'glow', '#ffd36a', TILE.rough, { variance: 0.08, sound: 'glass' }),
  block('Deep rock', 'solid', '#3c3c44', TILE.rough, { breakable: false, placeable: false }),
  block('Door frame', 'solid', '#2a1e18', TILE.planks, {
    variance: 0.02,
    breakable: false,
    placeable: false,
    sound: 'wood',
  }),
  block('Ember clay', 'solid', '#e8492f', TILE.plain, { variance: 0.03, sound: 'soft' }),
  block('Dew clay', 'solid', '#3e8ce6', TILE.plain, { variance: 0.03, sound: 'soft' }),
  block('Spark clay', 'solid', '#f2c62a', TILE.plain, { variance: 0.03, sound: 'soft' }),
  block('Chalk clay', 'solid', '#efe8dc', TILE.plain, { variance: 0.03, sound: 'soft' }),
];

/** What the hotbar holds before anything is swapped in. */
export const STARTING_HOTBAR: readonly number[] = [
  GRASS,
  SOIL,
  STONE,
  PLANKS,
  LOG,
  BRICK,
  GLASS,
  LAMP,
  LEAVES,
];

/** Every block the picker offers. */
export const PLACEABLE: readonly number[] = BLOCKS.flatMap((spec, id) =>
  spec.placeable ? [id] : [],
);

/** A cube that hides whatever is behind it: every face against it can be skipped. */
export function isOpaque(id: number): boolean {
  const layer = BLOCKS[id]?.layer;
  return id !== AIR && (layer === 'solid' || layer === 'glow');
}

/** Something a body cannot walk through: everything but air and water. */
export function isSolid(id: number): boolean {
  return id !== AIR && id !== WATER;
}

/** Converts one sRGB channel (0 to 1) to linear light, the space vertex colours are in. */
function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** `#rrggbb` as linear RGB, ready to go in a vertex colour. */
export function linearRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    toLinear(((value >> 16) & 255) / 255),
    toLinear(((value >> 8) & 255) / 255),
    toLinear((value & 255) / 255),
  ];
}

/** Every block's three face colours in linear RGB, worked out once. */
export const FACE_COLOURS: readonly (readonly [
  readonly number[],
  readonly number[],
  readonly number[],
])[] = BLOCKS.map((spec) => [linearRgb(spec.top), linearRgb(spec.side), linearRgb(spec.bottom)]);
