import { ShaderChunk } from 'three';

/**
 * The game's shading (docs-design/ART_DIRECTION.md): direct light falls in three soft bands
 * (shade, mid and lit) instead of a smooth gradient, blended with a little of the smooth light so
 * round things stay round, and a soft warm rim lights the edges that face away from the camera.
 *
 * It works by rewriting two of three.js's shader chunks for the standard and physical materials,
 * so every one of them in the game (ground, walls, props, creatures, Sproutlings, relics) shares
 * the one look without each having to opt in. It must run before the first material compiles.
 */

/** How much of the banded light replaces the smooth light, 0 to 1. */
const TOON_STRENGTH = 0.72;
/** How bright the rim is. */
const RIM_STRENGTH = 0.32;

const RAMP = /* glsl */ `
float dandoriToonRamp( const in float x ) {
  // Shade, mid and lit, with narrow soft steps between them. The shade band is no light at all,
  // so a light never reaches the side of anything facing away from it (the scene's ambient light
  // fills that side, as it always has), and no band is ever brighter than full light.
  float mid = smoothstep( 0.08, 0.16, x );
  float lit = smoothstep( 0.44, 0.54, x );
  float banded = mid * 0.5 + lit * 0.5;
  return mix( x, banded, ${TOON_STRENGTH.toFixed(2)} );
}
`;

const SMOOTH = 'vec3 irradiance = dotNL * directLight.color;';
const BANDED = 'vec3 irradiance = dandoriToonRamp( dotNL ) * directLight.color;';

const RIM = /* glsl */ `
#if defined( STANDARD )
  {
    float facing = saturate( dot( geometryNormal, geometryViewDir ) );
    float rim = pow( 1.0 - facing, 3.0 ) * ${RIM_STRENGTH.toFixed(2)};
    reflectedLight.directDiffuse += rim * mix( material.diffuseColor, vec3( 1.0, 0.94, 0.82 ), 0.45 );
  }
#endif
`;

let applied = false;

/** Turns the game's shading on for every standard material. Safe to call more than once. */
export function applyToonShading(): void {
  if (applied) return;
  const pars = ShaderChunk.lights_physical_pars_fragment;
  if (!pars.includes(SMOOTH)) {
    // A three.js update changed the lighting code: keep its own shading rather than break it.
    console.warn('Toon shading skipped: three.js lighting code has changed.');
    return;
  }
  applied = true;
  ShaderChunk.lights_physical_pars_fragment = RAMP + pars.replace(SMOOTH, BANDED);
  ShaderChunk.lights_fragment_end = ShaderChunk.lights_fragment_end + RIM;
}
