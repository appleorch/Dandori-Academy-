import {
  CanvasTexture,
  LinearFilter,
  MeshStandardMaterial,
  RepeatWrapping,
  type Texture,
} from 'three';
import { Rng } from '../core/rng';
import type { LevelDefinition } from '../world/levelTypes';

/**
 * The field's ground, blended from three covers (docs-design/ART_DIRECTION.md): the setting's
 * turf, bare soil and moss. A splat map painted once per field says where each shows: soil
 * along the worn paths between the Kiln and every treasure and round the feet of walls and the
 * banks of water, moss in the shade on the north side of walls and terraces and in loose patches.
 * Art only: the rules never read it.
 */

/** Splat-map texels per world unit, and the most it is ever painted at. */
const TEXELS_PER_UNIT = 4;
const MAX_SIZE = 1024;

/** Paints the field's splat map: red is soil, green is moss. */
export function splatMap(level: LevelDefinition): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const width = Math.min(MAX_SIZE, Math.ceil(level.width * TEXELS_PER_UNIT));
  const height = Math.min(MAX_SIZE, Math.ceil(level.depth * TEXELS_PER_UNIT));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const pen = canvas.getContext('2d');
  if (!pen) return null;
  const sx = width / level.width;
  const sz = height / level.depth;
  const px = (x: number) => (x + level.width / 2) * sx;
  const pz = (z: number) => (z + level.depth / 2) * sz;
  const rng = new Rng(level.seed * 53 + 11);
  pen.fillStyle = 'rgb(0,0,0)';
  pen.fillRect(0, 0, width, height);
  pen.globalCompositeOperation = 'lighter';
  pen.lineCap = 'round';

  // Worn paths: from the Kiln to every treasure, a little wavy, as feet would wear them.
  const path = (to: { x: number; z: number }, strength: number) => {
    const from = level.kiln;
    const steps = Math.max(2, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 2));
    pen.strokeStyle = `rgba(${Math.round(150 * strength)},0,0,1)`;
    pen.lineWidth = (strength > 0.4 ? 1.5 : 1.1) * sx;
    pen.beginPath();
    pen.moveTo(px(from.x), pz(from.z));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const wobble = i === steps ? 0 : rng.range(-0.6, 0.6);
      pen.lineTo(
        px(from.x + (to.x - from.x) * t + wobble),
        pz(from.z + (to.z - from.z) * t + wobble),
      );
    }
    pen.stroke();
  };
  // Fewer feet per path on a field with many treasures, so the paths never become a starburst.
  const wear = 0.45 * Math.min(1, Math.sqrt(8 / Math.max(1, level.treasures.length)));
  for (const treasure of level.treasures) path(treasure, wear);
  path(level.captain, 0.7);

  // Soil round the feet of walls and along the banks of water.
  const ring = (box: { x: number; z: number; w: number; d: number }, pad: number, rgb: string) => {
    pen.fillStyle = rgb;
    pen.fillRect(
      px(box.x - box.w / 2 - pad),
      pz(box.z - box.d / 2 - pad),
      (box.w + pad * 2) * sx,
      (box.d + pad * 2) * sz,
    );
  };
  for (const wall of level.obstacles) ring(wall, 0.7, 'rgba(90,0,0,1)');
  for (const water of level.water ?? []) ring(water, 1, 'rgba(110,0,0,1)');

  // Moss in the shade on the north side (toward -z) of walls and terraces.
  for (const box of [...level.obstacles, ...(level.plateaus ?? [])]) {
    const gradient = pen.createLinearGradient(
      0,
      pz(box.z - box.d / 2),
      0,
      pz(box.z - box.d / 2 - 3),
    );
    gradient.addColorStop(0, 'rgba(0,170,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,1)');
    pen.fillStyle = gradient;
    pen.fillRect(px(box.x - box.w / 2 - 0.5), pz(box.z - box.d / 2 - 3), (box.w + 1) * sx, 3 * sz);
  }

  // Loose patches of moss and bare soil, so no stretch of turf is perfectly even.
  const patches = Math.round((level.width * level.depth) / 120);
  for (let i = 0; i < patches; i++) {
    const x = rng.range(-level.width / 2, level.width / 2);
    const z = rng.range(-level.depth / 2, level.depth / 2);
    const r = rng.range(1.2, 3.5) * sx;
    const gradient = pen.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r);
    const moss = rng.next() < 0.6;
    gradient.addColorStop(0, moss ? 'rgba(0,110,0,1)' : 'rgba(80,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,1)');
    pen.fillStyle = gradient;
    pen.fillRect(px(x) - r, pz(z) - r, r * 2, r * 2);
  }

  // Soften every edge a little.
  pen.globalCompositeOperation = 'source-over';
  pen.filter = 'blur(2px)';
  pen.drawImage(canvas, 0, 0);
  pen.filter = 'none';

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

/**
 * The field's ground material: the turf map, with soil and moss blended in by the splat map.
 * The ground stays flat: the ambient occlusion reads depth, and takes any roll of the surface for
 * creases that it shades as long dark wedges. `tile` is the world units one repeat of the turf
 * covers; soil and moss repeat at the same size.
 */
export function groundMaterial(options: {
  turf: Texture;
  bump: Texture;
  soil: Texture;
  splat: Texture | null;
  color: string;
  bumpScale: number;
  repeat: readonly [number, number];
}): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    map: options.turf,
    bumpMap: options.bump,
    bumpScale: options.bumpScale,
    color: options.color,
    roughness: 0.95,
  });
  if (!options.splat) return material;
  const soil = options.soil.clone();
  soil.wrapS = soil.wrapT = RepeatWrapping;
  soil.needsUpdate = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSplat = { value: options.splat };
    shader.uniforms.uSoil = { value: soil };
    shader.uniforms.uRepeat = { value: options.repeat };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec2 vFieldUv;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vFieldUv = uv;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uSplat;
        uniform sampler2D uSoil;
        uniform vec2 uRepeat;
        varying vec2 vFieldUv;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec2 cover = texture2D( uSplat, vFieldUv ).rg;
          vec2 tiled = vFieldUv * uRepeat;
          vec3 soilColour = texture2D( uSoil, tiled ).rgb;
          // Moss: the turf itself, deeper and cooler, and a touch velvety.
          vec3 mossColour = diffuseColor.rgb * vec3( 0.55, 0.78, 0.5 );
          diffuseColor.rgb = mix( diffuseColor.rgb, mossColour, smoothstep( 0.05, 0.6, cover.g ) );
          diffuseColor.rgb = mix( diffuseColor.rgb, soilColour * vec3( 1.05, 0.95, 0.85 ), smoothstep( 0.08, 0.55, cover.r ) * 0.9 );
        }`,
      );
  };
  return material;
}
