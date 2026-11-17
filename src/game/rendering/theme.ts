import type { LevelTheme } from '../world/level';
import type { Turf } from './textures';

/** One point on a setting's day: the light at that fraction of the day elapsed. */
export interface SkyStop {
  at: number;
  sun: string;
  sunPower: number;
  sky: string;
  bounce: string;
  skyPower: number;
  /** Background and fog colour. */
  air: string;
}

export type MoteStyle = 'pollen' | 'leaves' | 'fireflies' | 'dust';

/** Everything that makes one setting look different from another. Rules never read it. */
export interface ThemeLook {
  /** The three shades the ground cover is painted in, darkest first. */
  turf: Turf;
  /** Tint over the ground texture inside the field, and outside it. */
  ground: string;
  outer: string;
  /** True where the floor is bare rock rather than lawn. */
  stoneFloor: boolean;
  rock: string;
  /** Height of walls and boulders. */
  rockHeight: number;
  blades: readonly [string, string];
  /** Fraction of the usual grass that grows here. */
  bladeDensity: number;
  flowers: readonly string[];
  canopy: readonly [string, string];
  trunk: readonly [string, string];
  /** Whether a ring of trees stands around the field. */
  trees: boolean;
  clover: string;
  mushroomCaps: readonly [string, string];
  /** Mushrooms that give off their own light. */
  glowingMushrooms: boolean;
  water: string;
  waterGlow: string;
  sky: readonly SkyStop[];
  /** Colour the sky deepens to overhead. */
  zenith: string;
  fog: readonly [number, number];
  motes: { style: MoteStyle; color: string; size: number; count: number };
  /** Strength of the warm light the Warden carries; 0 for none. */
  lantern: number;
}

const DAYLIGHT: readonly SkyStop[] = [
  {
    at: 0,
    sun: '#ffd2a0',
    sunPower: 2.6,
    sky: '#cfe6ff',
    bounce: '#5d7a3a',
    skyPower: 1.1,
    air: '#9ec3d8',
  },
  {
    at: 0.2,
    sun: '#fff4e2',
    sunPower: 3.1,
    sky: '#d8ecff',
    bounce: '#6b8a42',
    skyPower: 1.25,
    air: '#a9d0e6',
  },
  {
    at: 0.65,
    sun: '#ffefd6',
    sunPower: 3,
    sky: '#d8ecff',
    bounce: '#6b8a42',
    skyPower: 1.2,
    air: '#a9d0e6',
  },
  {
    at: 0.85,
    sun: '#ffa45e',
    sunPower: 2.6,
    sky: '#f2c7a8',
    bounce: '#6a6a38',
    skyPower: 1,
    air: '#e0b08c',
  },
  {
    at: 1,
    sun: '#ff6a3c',
    sunPower: 1.9,
    sky: '#8f7fb8',
    bounce: '#4a4a3a',
    skyPower: 0.8,
    air: '#7c5f86',
  },
];

const MEADOW: ThemeLook = {
  turf: [
    [58, 104, 44],
    [92, 146, 58],
    [140, 182, 76],
  ],
  ground: '#ffffff',
  outer: '#7d9a6a',
  stoneFloor: false,
  rock: '#ffffff',
  rockHeight: 2.3,
  blades: ['#4f8a3c', '#7fb04f'],
  bladeDensity: 1,
  flowers: ['#fff2b0', '#ff9ec4', '#bfe3ff'],
  canopy: ['#2f5d34', '#4a8040'],
  trunk: ['#4a3524', '#5b4636'],
  trees: true,
  clover: '#5f9a3e',
  mushroomCaps: ['#d9573c', '#e9d3a8'],
  glowingMushrooms: false,
  water: '#3d86b0',
  waterGlow: '#1f5a7a',
  sky: DAYLIGHT,
  zenith: '#3f7fa8',
  fog: [55, 160],
  motes: { style: 'pollen', color: '#fff3c4', size: 0.09, count: 160 },
  lantern: 0,
};

export const THEMES: Record<LevelTheme, ThemeLook> = {
  meadow: MEADOW,
  /** Dry gold grass, red and amber trees, low warm sun, leaves on the wind. */
  autumn: {
    ...MEADOW,
    turf: [
      [126, 104, 44],
      [176, 146, 62],
      [222, 190, 96],
    ],
    ground: '#ffffff',
    outer: '#b89a5c',
    rock: '#f2e4d2',
    blades: ['#a8873a', '#d6b25a'],
    bladeDensity: 0.8,
    flowers: ['#ffd27a', '#f08a4a', '#fff0c8'],
    canopy: ['#b5482a', '#e29a3a'],
    clover: '#b89a3e',
    mushroomCaps: ['#8a4a2a', '#e9c88a'],
    zenith: '#5a86a8',
    fog: [50, 150],
    sky: [
      {
        at: 0,
        sun: '#ffc890',
        sunPower: 2.5,
        sky: '#e6dcc8',
        bounce: '#8a7a3a',
        skyPower: 1.05,
        air: '#cdbf9c',
      },
      {
        at: 0.25,
        sun: '#ffe9c4',
        sunPower: 2.9,
        sky: '#e6e2d4',
        bounce: '#94843e',
        skyPower: 1.15,
        air: '#d3cba8',
      },
      {
        at: 0.65,
        sun: '#ffd9a0',
        sunPower: 2.8,
        sky: '#ecdcc0',
        bounce: '#94843e',
        skyPower: 1.1,
        air: '#dcc49a',
      },
      {
        at: 0.85,
        sun: '#ff9248',
        sunPower: 2.5,
        sky: '#f0b890',
        bounce: '#7a6234',
        skyPower: 0.95,
        air: '#e0a070',
      },
      {
        at: 1,
        sun: '#f0562c',
        sunPower: 1.8,
        sky: '#8a6a9a',
        bounce: '#4a4034',
        skyPower: 0.75,
        air: '#7a5070',
      },
    ],
    motes: { style: 'leaves', color: '#e08a3a', size: 0.2, count: 70 },
  },
  /** Wet blue-green ground under a low grey sky, mist close in, fireflies over the reeds. */
  marsh: {
    ...MEADOW,
    turf: [
      [38, 82, 62],
      [60, 116, 84],
      [104, 152, 108],
    ],
    ground: '#ffffff',
    outer: '#6a9a80',
    rock: '#cfe0d4',
    blades: ['#3a6a4a', '#6a9a6a'],
    bladeDensity: 1.2,
    flowers: ['#d8c8ff', '#fff6d0', '#9adcd0'],
    canopy: ['#274a3a', '#3e6a52'],
    trunk: ['#33302a', '#454036'],
    clover: '#4a8a5a',
    mushroomCaps: ['#6a8ad0', '#c8e0d0'],
    water: '#3a7a7a',
    waterGlow: '#1a5a52',
    zenith: '#5a7a80',
    fog: [26, 105],
    sky: [
      {
        at: 0,
        sun: '#d8e0d0',
        sunPower: 1.7,
        sky: '#c4d6d0',
        bounce: '#4a6a4a',
        skyPower: 1.15,
        air: '#a4b8b0',
      },
      {
        at: 0.3,
        sun: '#eef0e0',
        sunPower: 2.1,
        sky: '#cfe0da',
        bounce: '#52745a',
        skyPower: 1.25,
        air: '#aec2ba',
      },
      {
        at: 0.7,
        sun: '#e6e6d0',
        sunPower: 2,
        sky: '#c8d8d2',
        bounce: '#52745a',
        skyPower: 1.2,
        air: '#a8bcb4',
      },
      {
        at: 0.88,
        sun: '#d8a070',
        sunPower: 1.7,
        sky: '#b8a8a8',
        bounce: '#4a5a44',
        skyPower: 1,
        air: '#a09088',
      },
      {
        at: 1,
        sun: '#8a6a8a',
        sunPower: 1.2,
        sky: '#5a6a8a',
        bounce: '#34443c',
        skyPower: 0.8,
        air: '#4a546a',
      },
    ],
    motes: { style: 'fireflies', color: '#d8ff7a', size: 0.16, count: 60 },
  },
  /** Heather and long shadows: every day here starts at golden hour and ends under stars. */
  dusk: {
    ...MEADOW,
    turf: [
      [84, 104, 50],
      [128, 142, 64],
      [182, 176, 92],
    ],
    ground: '#ffffff',
    outer: '#9aa868',
    rock: '#f0dcc8',
    blades: ['#6a8a3a', '#b0a850'],
    flowers: ['#c890e0', '#f0a0c8', '#ffe0a0'],
    canopy: ['#3a5a34', '#7a7a3a'],
    clover: '#7a9a44',
    mushroomCaps: ['#b04a7a', '#f0d8b0'],
    zenith: '#3a4a8a',
    fog: [50, 150],
    sky: [
      {
        at: 0,
        sun: '#ffd9a0',
        sunPower: 2.9,
        sky: '#e0e0f0',
        bounce: '#7a8444',
        skyPower: 1.1,
        air: '#c0cce0',
      },
      {
        at: 0.4,
        sun: '#ffc070',
        sunPower: 2.8,
        sky: '#f0d8c0',
        bounce: '#84783e',
        skyPower: 1.05,
        air: '#e4c8a4',
      },
      {
        at: 0.7,
        sun: '#ff8a4a',
        sunPower: 2.5,
        sky: '#f0b0a0',
        bounce: '#74603a',
        skyPower: 0.95,
        air: '#e09a78',
      },
      {
        at: 0.88,
        sun: '#e0508a',
        sunPower: 1.9,
        sky: '#a080c0',
        bounce: '#4a4460',
        skyPower: 0.85,
        air: '#8a5a90',
      },
      {
        at: 1,
        sun: '#7080d0',
        sunPower: 1.3,
        sky: '#4a5aa0',
        bounce: '#2a3050',
        skyPower: 0.8,
        air: '#2c3260',
      },
    ],
    motes: { style: 'fireflies', color: '#ffe89a', size: 0.14, count: 50 },
  },
  /** No sky at all: cold rock, a faint blue gloom, and whatever light is carried in. */
  cave: {
    ...MEADOW,
    ground: '#6a7088',
    outer: '#1a1c26',
    stoneFloor: true,
    rock: '#7a7f9a',
    rockHeight: 3.4,
    blades: ['#3a4a5a', '#4a6a6a'],
    bladeDensity: 0,
    flowers: ['#7ae0e0', '#b08aff', '#7affc0'],
    canopy: ['#2a2c3a', '#3a3c4a'],
    trunk: ['#3a3c4a', '#4a4c5a'],
    trees: false,
    clover: '#3a6a6a',
    mushroomCaps: ['#4ae0d0', '#b08aff'],
    glowingMushrooms: true,
    water: '#05060a',
    waterGlow: '#1a1040',
    zenith: '#020308',
    fog: [16, 62],
    sky: [
      {
        at: 0,
        sun: '#8a9ad0',
        sunPower: 0.5,
        sky: '#7a88c0',
        bounce: '#2a2c40',
        skyPower: 0.5,
        air: '#05060b',
      },
      {
        at: 1,
        sun: '#7a80c0',
        sunPower: 0.4,
        sky: '#6a70b0',
        bounce: '#24263a',
        skyPower: 0.42,
        air: '#040509',
      },
    ],
    motes: { style: 'dust', color: '#9ab0ff', size: 0.07, count: 90 },
    lantern: 13,
  },
};

export function themeOf(theme: LevelTheme): ThemeLook {
  return THEMES[theme];
}
