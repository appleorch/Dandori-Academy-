import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Vector3 } from 'three';
import { ENEMY_SPECS } from '../enemies/enemyKinds';
import type { Box } from '../navigation/NavGrid';
import type { Simulation } from '../simulation/Simulation';
import { inDanger } from './danger';

const MAP_WIDTH = 190;
const REDRAW_FRAMES = 4;
const probe = new Vector3();

function makeCanvas(className: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

/**
 * A minimap of the whole field in the corner, and red arrows at the screen edge
 * pointing to any Emberling in danger that the camera cannot see. Both are plain
 * canvases laid over the game, drawn from the simulation each frame.
 */
export function Minimap({ sim }: { sim: Simulation }) {
  const gl = useThree((state) => state.gl);
  const { width, depth } = sim.level;
  const scale = MAP_WIDTH / width;
  const height = Math.round(depth * scale);
  const { map, arrows } = useMemo(
    () => ({ map: makeCanvas('minimap'), arrows: makeCanvas('threat-arrows') }),
    [],
  );

  useEffect(() => {
    const host = gl.domElement.closest('.game') ?? document.body;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    map.width = MAP_WIDTH * ratio;
    map.height = height * ratio;
    map.style.width = `${MAP_WIDTH}px`;
    map.style.height = `${height}px`;
    map.getContext('2d')?.scale(ratio, ratio);
    host.append(map, arrows);
    return () => {
      map.remove();
      arrows.remove();
    };
  }, [gl, map, arrows, height]);

  useFrame(({ camera, clock, size }) => {
    const time = clock.elapsedTime;
    const frame = Math.round(time * 60);

    // Edge arrows for threatened workers off screen.
    if (arrows.width !== size.width || arrows.height !== size.height) {
      arrows.width = size.width;
      arrows.height = size.height;
    }
    const pen = arrows.getContext('2d');
    if (pen) {
      pen.clearRect(0, 0, size.width, size.height);
      const pulse = 0.55 + Math.abs(Math.sin(time * 8)) * 0.45;
      for (const [entity, worker] of sim.workers.entries()) {
        if (worker.state === 'thrown' || worker.state === 'attacking') continue;
        const at = sim.transforms.require(entity);
        if (!inDanger(sim, at.x, at.z)) continue;
        probe.set(at.x, 0.4, at.z).project(camera);
        if (Math.abs(probe.x) <= 0.95 && Math.abs(probe.y) <= 0.95 && probe.z < 1) continue;
        const angle = Math.atan2(-probe.y, probe.x);
        const edge = 0.9 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
        const sx = size.width / 2 + Math.cos(angle) * edge * (size.width / 2);
        const sy = size.height / 2 + Math.sin(angle) * edge * (size.height / 2);
        pen.save();
        pen.translate(sx, sy);
        pen.rotate(angle);
        pen.fillStyle = `rgba(255, 70, 50, ${pulse})`;
        pen.strokeStyle = '#1c1410';
        pen.lineWidth = 3;
        pen.beginPath();
        pen.moveTo(18, 0);
        pen.lineTo(-10, -13);
        pen.lineTo(-10, 13);
        pen.closePath();
        pen.stroke();
        pen.fill();
        pen.restore();
      }
    }

    // The minimap itself, redrawn a few times a second.
    if (frame % REDRAW_FRAMES !== 0) return;
    const ink = map.getContext('2d');
    if (!ink) return;
    const toX = (x: number): number => (x + width / 2) * scale;
    const toY = (z: number): number => (z + depth / 2) * scale;
    const box = (b: Box, color: string): void => {
      ink.fillStyle = color;
      ink.fillRect(toX(b.x - b.w / 2), toY(b.z - b.d / 2), b.w * scale, b.d * scale);
    };
    const dot = (x: number, z: number, radius: number, color: string): void => {
      ink.fillStyle = color;
      ink.beginPath();
      ink.arc(toX(x), toY(z), radius, 0, Math.PI * 2);
      ink.fill();
    };
    ink.clearRect(0, 0, MAP_WIDTH, height);
    const cave = sim.level.theme === 'cave';
    ink.fillStyle = cave ? 'rgba(70, 74, 96, 0.9)' : 'rgba(40, 70, 40, 0.85)';
    ink.fillRect(0, 0, MAP_WIDTH, height);
    const wet = cave ? '#08080e' : '#3d86b0';
    for (const wall of sim.level.obstacles) box(wall, cave ? '#1c1e2a' : '#8a8f98');
    for (const water of sim.level.water ?? []) box(water, wet);
    for (const site of sim.bridges) box(site.box, site.built ? '#8a6a46' : wet);
    for (const beacon of sim.beacons)
      dot(beacon.x, beacon.z, 3, beacon.lit ? '#ffc06a' : '#6aa8ff');
    for (const [, enemy] of sim.enemies.entries()) if (enemy.shape) box(enemy.shape, '#4a5a22');
    const { descent } = sim.level;
    if (descent) dot(descent.x, descent.z, 3, '#6a8aff');
    const { kiln } = sim.level;
    dot(kiln.x, kiln.z, 4, '#ffb347');
    for (const [entity, carryable] of sim.carryables.entries()) {
      const at = sim.transforms.require(entity);
      const color =
        carryable.kind === 'treasure'
          ? '#ffd257'
          : carryable.kind === 'log'
            ? '#c9a46a'
            : '#ff8a3d';
      dot(at.x, at.z, carryable.kind === 'treasure' ? 2.5 : 1.8, color);
    }
    for (const [entity, enemy] of sim.enemies.entries()) {
      if (enemy.shape || enemy.hp <= 0) continue;
      const at = sim.transforms.require(entity);
      const spec = ENEMY_SPECS[enemy.kind];
      dot(
        at.x,
        at.z,
        spec.boss ? 5 : spec.attack === 'none' ? 2 : 3,
        spec.attack === 'none' ? '#a08060' : '#e5533d',
      );
    }
    for (const [entity, worker] of sim.workers.entries()) {
      const at = sim.transforms.require(entity);
      const danger = inDanger(sim, at.x, at.z);
      dot(at.x, at.z, 1.1, danger ? '#ffffff' : worker.state === 'idle' ? '#d9a79c' : '#ff6a4a');
    }
    const captain = sim.captainTransform;
    dot(captain.x, captain.z, 3.2, '#7fe3ff');
    // The part of the field the camera is looking at.
    ink.strokeStyle = 'rgba(255, 246, 220, 0.6)';
    ink.lineWidth = 1;
    ink.strokeRect(toX(camera.position.x) - 26, toY(camera.position.z - 16) - 14, 52, 28);
  });

  return null;
}
