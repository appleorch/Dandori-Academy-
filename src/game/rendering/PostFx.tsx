import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  DepthTexture,
  HalfFloatType,
  Vector2,
  Vector3,
  ShaderMaterial,
  WebGLRenderTarget,
  type Camera,
  type Object3D,
  type WebGLRenderer,
  type Scene,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { OVERLAY_LAYER } from './overlay';

/** Blur strength of the tilt-shift, in pixels per unit of distance from the focus band. */
const TILT_BLUR = 2.2;
/** Height of the in-focus band, as a fraction of the screen (0.5 is the middle). */
const FOCUS = 0.5;

/**
 * Draws the scene into its own target, with a depth texture, and copies the picture on for the
 * passes after. Its depth stays readable for the rest of the frame (see PostFx).
 */
class ScenePass extends Pass {
  readonly target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    depthTexture: new DepthTexture(1, 1),
  });
  private readonly copy = new FullScreenQuad(
    new ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, opacity: { value: 1 } },
      vertexShader: CopyShader.vertexShader,
      fragmentShader: CopyShader.fragmentShader,
    }),
  );

  constructor(
    private readonly scene: Scene,
    private readonly camera: Camera,
  ) {
    super();
  }

  override setSize(width: number, height: number): void {
    this.target.setSize(width, height);
  }

  override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget): void {
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    (this.copy.material as ShaderMaterial).uniforms.tDiffuse.value = this.target.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.copy.render(renderer);
  }

  override dispose(): void {
    this.target.dispose();
    this.copy.dispose();
  }
}

/**
 * The ink outline's colour: a dark warm brown, never black (see the art direction), given in
 * linear light, which the passes work in: #2a1d14 on screen.
 */
const INK = [0.023, 0.012, 0.007] as const;

/**
 * Ink outlines from depth: where the distance to the camera jumps between a pixel and its
 * neighbours by more than a small share of the distance itself, the pixel is darkened toward the
 * ink colour. Flat ground, even at a grazing angle, changes depth smoothly and gets no line.
 */
const InkShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null as DepthTexture | null },
    resolution: { value: new Vector2(1, 1) },
    cameraNear: { value: 1 },
    cameraFar: { value: 300 },
    strength: { value: 0.78 },
    ink: { value: new Vector3(...INK) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float strength;
    uniform vec3 ink;
    varying vec2 vUv;

    float distanceAt( vec2 uv ) {
      float depth = texture2D( tDepth, uv ).x;
      return -perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
    }

    void main() {
      vec4 colour = texture2D( tDiffuse, vUv );
      float here = distanceAt( vUv );
      // Lines about a pixel wide on a 1080p screen, scaled with the screen so they stay visible.
      vec2 step = max( 1.0, resolution.y / 1000.0 ) / resolution;
      float jump = 0.0;
      jump = max( jump, distanceAt( vUv + vec2( step.x, 0.0 ) ) - here );
      jump = max( jump, distanceAt( vUv - vec2( step.x, 0.0 ) ) - here );
      jump = max( jump, distanceAt( vUv + vec2( 0.0, step.y ) ) - here );
      jump = max( jump, distanceAt( vUv - vec2( 0.0, step.y ) ) - here );
      // Only the near side of an edge is inked, so lines are one pixel wide and hug the object.
      float edge = smoothstep( 0.012, 0.035, jump / max( here, 1.0 ) );
      gl_FragColor = vec4( mix( colour.rgb, ink, edge * strength ), colour.a );
    }
  `,
};

/** Hides every visible sprite, point cloud and transparent mesh; returns what it hid. */
function hideOverlays(scene: Scene): Object3D[] {
  const hidden: Object3D[] = [];
  scene.traverseVisible((object) => {
    const material = (object as Object3D & { material?: { transparent?: boolean } }).material;
    const overlay =
      (object as { isSprite?: boolean }).isSprite === true ||
      (object as { isPoints?: boolean }).isPoints === true ||
      material?.transparent === true;
    if (overlay) hidden.push(object);
  });
  for (const object of hidden) object.visible = false;
  return hidden;
}

/**
 * Post-processing: ambient occlusion in creases (full quality only), a soft bloom
 * on embers, shards and the Kiln, a tilt-shift blur at the top and bottom of the
 * screen that makes the field read as a miniature, and a gentle vignette.
 */
export function PostFx({
  ambientOcclusion,
  tiltShift = true,
}: {
  ambientOcclusion: boolean;
  /** The miniature blur at the top and bottom of the view; a setting. */
  tiltShift?: boolean;
}) {
  const { gl, scene, camera, size, viewport } = useThree();

  const { composer, tiltX, tiltY, bloom, ink } = useMemo(() => {
    // The scene is drawn into a target of its own, which no later pass ever draws into, so the
    // ink outlines and the ambient occlusion can both read the depth it wrote (instead of drawing
    // the whole scene again) without a pass ever reading the buffer it is writing.
    const composer = new EffectComposer(gl);
    const scenePass = new ScenePass(scene, camera);
    const sceneDepth = { texture: scenePass.target.depthTexture };
    composer.addPass(scenePass);
    if (ambientOcclusion) {
      const gtao = new GTAOPass(scene, camera, 1, 1, {
        depthTexture: scenePass.target.depthTexture ?? undefined,
      });
      gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.6, thickness: 1.2, scale: 1.1 });
      gtao.blendIntensity = 0.85;
      // Labels, particles and other see-through overlays must not cast ambient
      // occlusion: hide them while the pass works.
      const render = gtao.render.bind(gtao);
      gtao.render = (...args: Parameters<GTAOPass['render']>) => {
        const hidden = hideOverlays(scene);
        render(...args);
        for (const object of hidden) object.visible = true;
      };
      composer.addPass(gtao);
    }
    // Ink outlines where the depth jumps: the edges of walls, props, creatures and Sproutlings.
    const ink = new ShaderPass(InkShader);
    const drawInk = ink.render.bind(ink);
    ink.render = (...args: Parameters<ShaderPass['render']>) => {
      ink.uniforms.tDepth.value = sceneDepth.texture;
      const view = camera as { near?: number; far?: number };
      ink.uniforms.cameraNear.value = view.near ?? 1;
      ink.uniforms.cameraFar.value = view.far ?? 300;
      drawInk(...args);
    };
    composer.addPass(ink);
    const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.42, 0.55, 0.82);
    composer.addPass(bloom);
    const tiltX = new ShaderPass(HorizontalTiltShiftShader);
    const tiltY = new ShaderPass(VerticalTiltShiftShader);
    tiltX.uniforms.r.value = FOCUS;
    tiltY.uniforms.r.value = FOCUS;
    if (tiltShift) {
      composer.addPass(tiltX);
      composer.addPass(tiltY);
    }
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 0.95;
    vignette.uniforms.darkness.value = 1.05;
    composer.addPass(vignette);
    composer.addPass(new OutputPass());
    return { composer, tiltX, tiltY, bloom, ink };
  }, [gl, scene, camera, ambientOcclusion, tiltShift]);

  useEffect(() => {
    composer.setPixelRatio(viewport.dpr);
    composer.setSize(size.width, size.height);
    bloom.resolution.set(size.width, size.height);
    tiltX.uniforms.h.value = TILT_BLUR / size.width;
    tiltY.uniforms.v.value = TILT_BLUR / size.height;
    ink.uniforms.resolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
  }, [composer, bloom, tiltX, tiltY, ink, size, viewport.dpr]);

  useEffect(() => () => composer.dispose(), [composer]);

  // A positive priority takes over rendering from React Three Fiber. Labels and bars
  // live on their own layer and are drawn last, straight to the screen, so the
  // blur and glow never touch text.
  useFrame((_, delta) => {
    composer.render(delta);
    const autoClear = gl.autoClear;
    const shadows = gl.shadowMap.autoUpdate;
    gl.autoClear = false;
    gl.shadowMap.autoUpdate = false;
    gl.clearDepth();
    camera.layers.set(OVERLAY_LAYER);
    gl.render(scene, camera);
    camera.layers.set(0);
    gl.autoClear = autoClear;
    gl.shadowMap.autoUpdate = shadows;
  }, 1);
  return null;
}
