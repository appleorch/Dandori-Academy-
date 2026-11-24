import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  DepthTexture,
  HalfFloatType,
  Vector2,
  WebGLRenderTarget,
  type Object3D,
  type Scene,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
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
export function PostFx({ ambientOcclusion }: { ambientOcclusion: boolean }) {
  const { gl, scene, camera, size, viewport } = useThree();

  const { composer, tiltX, tiltY, bloom } = useMemo(() => {
    // With ambient occlusion the composer's buffers keep their depth, so the occlusion pass can
    // work from the depth the scene already wrote instead of drawing the whole scene again.
    const composer = ambientOcclusion
      ? new EffectComposer(
          gl,
          new WebGLRenderTarget(1, 1, {
            type: HalfFloatType,
            depthTexture: new DepthTexture(1, 1),
          }),
        )
      : new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    if (ambientOcclusion) {
      const gtao = new GTAOPass(scene, camera, 1, 1, {
        depthTexture: composer.renderTarget1.depthTexture ?? undefined,
      });
      gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.6, thickness: 1.2, scale: 1.1 });
      gtao.blendIntensity = 0.85;
      // Labels, particles and other see-through overlays must not cast ambient
      // occlusion: hide them while the pass renders its depth and normals.
      const render = gtao.render.bind(gtao);
      gtao.render = (...args: Parameters<GTAOPass['render']>) => {
        // The scene was drawn into whichever buffer is the read buffer this frame: use its depth.
        const depth = args[2].depthTexture;
        if (depth) {
          gtao.gtaoMaterial.uniforms.tDepth.value = depth;
          gtao.pdMaterial.uniforms.tDepth.value = depth;
          gtao.depthRenderMaterial.uniforms.tDepth.value = depth;
        }
        const hidden = hideOverlays(scene);
        render(...args);
        for (const object of hidden) object.visible = true;
      };
      composer.addPass(gtao);
    }
    const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.42, 0.55, 0.82);
    composer.addPass(bloom);
    const tiltX = new ShaderPass(HorizontalTiltShiftShader);
    const tiltY = new ShaderPass(VerticalTiltShiftShader);
    tiltX.uniforms.r.value = FOCUS;
    tiltY.uniforms.r.value = FOCUS;
    composer.addPass(tiltX);
    composer.addPass(tiltY);
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 0.95;
    vignette.uniforms.darkness.value = 1.05;
    composer.addPass(vignette);
    composer.addPass(new OutputPass());
    return { composer, tiltX, tiltY, bloom };
  }, [gl, scene, camera, ambientOcclusion]);

  useEffect(() => {
    composer.setPixelRatio(viewport.dpr);
    composer.setSize(size.width, size.height);
    bloom.resolution.set(size.width, size.height);
    tiltX.uniforms.h.value = TILT_BLUR / size.width;
    tiltY.uniforms.v.value = TILT_BLUR / size.height;
  }, [composer, bloom, tiltX, tiltY, size, viewport.dpr]);

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
