import { useEffect, useState } from 'react';
import { Box3, Group, Vector3, type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * 3D models for the game's characters and things, as glTF binary files (.glb).
 *
 * Drop a file named after a slot into `src/assets/models/` (say `warden.glb`) and that slot
 * uses it; with no file, the game draws its own procedural model as before. The build finds the
 * files by itself, so nothing else needs to change. See `src/assets/models/README.md` for how
 * a model should be made (size, facing, animation names, compression).
 */
export const MODEL_SLOTS = {
  /** The player: the Warden. */
  warden: { height: 1.7 },
} as const satisfies Record<string, SlotSpec>;

export type ModelSlot = keyof typeof MODEL_SLOTS;

interface SlotSpec {
  /** Height in metres the model is scaled to, whatever size it was made at. */
  height: number;
}

/** Every model file in the build: slot name to its URL. */
const FILES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../../assets/models/*.glb', {
      query: '?url',
      import: 'default',
      eager: true,
    }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.glb'.length), url]),
);

export function hasModel(slot: ModelSlot): boolean {
  return slot in FILES;
}

export interface LoadedModel {
  /** A fresh copy for this user, scaled to the slot's height with its feet at the origin. */
  scene: Object3D;
  animations: AnimationClip[];
}

let loader: GLTFLoader | null = null;
const loading = new Map<string, Promise<{ scene: Object3D; animations: AnimationClip[] }>>();

function load(url: string) {
  if (!loader) {
    loader = new GLTFLoader();
    // Meshopt-compressed files (gltfpack, gltf-transform) are smaller and decode fast.
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  let promise = loading.get(url);
  if (!promise) {
    promise = loader.loadAsync(url).then((gltf) => ({
      scene: gltf.scene,
      animations: gltf.animations,
    }));
    loading.set(url, promise);
  }
  return promise;
}

/** Scales and sets down a copy of the model as its slot asks, with shadows on. */
export function prepare(source: Object3D, height: number): Object3D {
  const copy = cloneSkinned(source);
  copy.updateMatrixWorld(true);
  const box = new Box3().setFromObject(copy);
  const size = box.getSize(new Vector3());
  const scale = size.y > 0 ? height / size.y : 1;
  // The copy keeps whatever transform it was exported with; a wrapper fits it to the slot.
  const fit = new Group();
  fit.scale.setScalar(scale);
  fit.position.set(
    -((box.min.x + box.max.x) / 2) * scale,
    -box.min.y * scale,
    -((box.min.z + box.max.z) / 2) * scale,
  );
  fit.add(copy);
  copy.traverse((node) => {
    const mesh = node as Object3D & { isMesh?: boolean };
    if (mesh.isMesh) {
      mesh.castShadow = true;
      // Skinned meshes move away from their bind-pose bounds; never cull them by mistake.
      mesh.frustumCulled = false;
    }
  });
  const holder = new Group();
  holder.add(fit);
  return holder;
}

/**
 * The slot's model once it has loaded, or null: while loading, if there is no file for the
 * slot, or if the file would not load (the procedural model is used then).
 */
export function useModel(slot: ModelSlot): LoadedModel | null {
  const [model, setModel] = useState<LoadedModel | null>(null);
  useEffect(() => {
    const url = FILES[slot];
    if (!url) return;
    let live = true;
    load(url)
      .then(({ scene, animations }) => {
        if (live) setModel({ scene: prepare(scene, MODEL_SLOTS[slot].height), animations });
      })
      .catch((error: unknown) => {
        console.warn(`Model ${slot}.glb would not load; using the built-in one.`, error);
      });
    return () => {
      live = false;
    };
  }, [slot]);
  return model;
}
