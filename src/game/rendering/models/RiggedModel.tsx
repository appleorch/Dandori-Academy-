import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { AnimationMixer, LoopRepeat, type AnimationAction, type AnimationClip } from 'three';
import type { LoadedModel } from './modelLibrary';

/** Which clip to play for a speed in metres per second, and how fast to play it. */
export function pickClip(
  names: readonly string[],
  speed: number,
): { name: string | null; timeScale: number } {
  const find = (...wanted: string[]) =>
    names.find((name) => wanted.some((w) => name.toLowerCase().includes(w))) ?? null;
  const idle = find('idle', 'stand', 'breath');
  const walk = find('walk');
  const run = find('run', 'jog', 'sprint');
  if (speed < 0.4) return { name: idle ?? walk ?? run, timeScale: idle ? 1 : 0 };
  if (speed < 4.5 && walk) return { name: walk, timeScale: Math.max(0.6, speed / 2.2) };
  if (run) return { name: run, timeScale: Math.max(0.7, speed / 6.5) };
  return { name: walk ?? idle, timeScale: walk ? Math.max(0.6, speed / 2.2) : 1 };
}

/**
 * A loaded model, animated by speed: idle, walk and run clips (by name, see
 * `src/assets/models/README.md`) cross-fade as the speed in `speed.current` changes.
 */
export function RiggedModel({ model, speed }: { model: LoadedModel; speed: RefObject<number> }) {
  const mixer = useMemo(() => new AnimationMixer(model.scene), [model]);
  const actions = useMemo(() => {
    const map = new Map<string, AnimationAction>();
    model.animations.forEach((clip: AnimationClip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(LoopRepeat, Infinity);
      map.set(clip.name, action);
    });
    return map;
  }, [mixer, model]);
  const names = useMemo(() => [...actions.keys()], [actions]);

  useEffect(() => () => void mixer.stopAllAction(), [mixer]);

  const playing = useRef<string | null>(null);
  useFrame((_, delta) => {
    if (actions.size === 0) return;
    const { name, timeScale } = pickClip(names, speed.current ?? 0);
    const next = name ? actions.get(name) : undefined;
    if (name && next && name !== playing.current) {
      next.reset().play();
      if (playing.current) actions.get(playing.current)?.crossFadeTo(next, 0.2, false);
      playing.current = name;
    }
    if (next) next.timeScale = timeScale;
    mixer.update(Math.min(delta, 0.1));
  });

  return <primitive object={model.scene} />;
}
