import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { PHOTO_FILTERS, useGameStore, type PhotoSettings } from '../core/gameStore';
import type { Simulation } from '../simulation/Simulation';
import { heightAt } from '../world/heightMap';

/**
 * Photo mode's camera: starts where the play camera was looking, then moves freely: WASD or
 * drag to move, Q and E to turn, the wheel (or R and F) to go nearer and further.
 */
export function PhotoCamera({ sim }: { sim: Simulation }) {
  const view = useRef({ x: sim.captainTransform.x, z: sim.captainTransform.z, zoom: 22, turn: 0 });
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.code);
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const wheel = (event: WheelEvent) => {
      view.current.zoom = Math.min(80, Math.max(4, view.current.zoom + event.deltaY * 0.02));
    };
    let drag: { x: number; y: number } | null = null;
    const press = (event: PointerEvent) => {
      if ((event.target as Element).closest('canvas'))
        drag = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (!drag) return;
      const scale = view.current.zoom / 500;
      const dx = (event.clientX - drag.x) * scale;
      const dz = (event.clientY - drag.y) * scale;
      const { turn } = view.current;
      view.current.x -= dx * Math.cos(turn) + dz * Math.sin(turn);
      view.current.z -= dz * Math.cos(turn) - dx * Math.sin(turn);
      drag = { x: event.clientX, y: event.clientY };
    };
    const release = () => {
      drag = null;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
    };
  }, []);
  useFrame(({ camera }, delta) => {
    const v = view.current;
    const held = (code: string) => (keys.current.has(code) ? 1 : 0);
    const side = held('KeyD') - held('KeyA');
    const ahead = held('KeyS') - held('KeyW');
    v.turn += (held('KeyE') - held('KeyQ')) * delta * 1.2;
    v.zoom = Math.min(80, Math.max(4, v.zoom + (held('KeyF') - held('KeyR')) * delta * 20));
    const speed = v.zoom * delta;
    v.x += (side * Math.cos(v.turn) + ahead * Math.sin(v.turn)) * speed;
    v.z += (ahead * Math.cos(v.turn) - side * Math.sin(v.turn)) * speed;
    const ground = heightAt(sim.level, v.x, v.z);
    camera.position.set(
      v.x + Math.sin(v.turn) * v.zoom * 0.6,
      ground + v.zoom * 0.7,
      v.z + Math.cos(v.turn) * v.zoom * 0.6,
    );
    camera.lookAt(v.x, ground + 0.5, v.z);
  });
  return null;
}

/** Draws the canvas into a picture with the photo's filter and depth of field baked in. */
export function composePhoto(source: HTMLCanvasElement, photo: PhotoSettings): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const pen = out.getContext('2d');
  if (!pen) return source;
  const filter = PHOTO_FILTERS[photo.filter];
  pen.filter = filter;
  pen.drawImage(source, 0, 0);
  if (photo.depth) {
    // The top and bottom drawn again, blurred, fading into the sharp middle.
    const blurred = document.createElement('canvas');
    blurred.width = out.width;
    blurred.height = out.height;
    const soft = blurred.getContext('2d');
    if (soft) {
      soft.filter = `${filter === 'none' ? '' : filter} blur(${Math.round(out.width / 240)}px)`;
      soft.drawImage(source, 0, 0);
      soft.globalCompositeOperation = 'destination-in';
      const fade = soft.createLinearGradient(0, 0, 0, out.height);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(0.32, 'rgba(0,0,0,0)');
      fade.addColorStop(0.68, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      soft.fillStyle = fade;
      soft.fillRect(0, 0, out.width, out.height);
      pen.filter = 'none';
      pen.drawImage(blurred, 0, 0);
    }
  }
  return out;
}

/** Takes the picture when asked: renders the scene, bakes the look in, and saves a PNG. */
export function PhotoShot() {
  const { gl, scene, camera } = useThree();
  const shot = useGameStore((state) => state.photoShot);
  const taken = useRef(shot);
  useFrame(() => {
    if (shot === taken.current) return;
    taken.current = shot;
    const store = useGameStore.getState();
    if (!store.photo) return;
    // Rendered now, so the drawing buffer still holds the picture when it is read.
    gl.render(scene, camera);
    const picture = composePhoto(gl.domElement, store.photo);
    picture.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dandori-photo-${Date.now()}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      useGameStore.getState().grant('photographer');
    }, 'image/png');
  });
  return null;
}
