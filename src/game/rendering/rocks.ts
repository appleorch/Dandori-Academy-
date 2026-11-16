import { BoxGeometry, Color, Float32BufferAttribute, type BufferGeometry } from 'three';
import { Rng } from '../core/rng';
import type { Box } from '../navigation/NavGrid';

const MOSS = new Color('#5f8f3a');
const STONE = new Color('#ffffff');

/**
 * A boulder or rock wall that fills a collision box: a subdivided box pulled into
 * a rounded slab, roughened with noise, with moss on the upward faces. The shape is
 * seeded from the box, so the same wall always looks the same.
 */
export function rockGeometry(box: Box, height: number): BufferGeometry {
  const rng = new Rng(Math.round(box.x * 73 + box.z * 191 + box.w * 7 + box.d * 13) >>> 0);
  const segments = (size: number): number => Math.max(3, Math.ceil(size * 1.6));
  const geometry = new BoxGeometry(
    box.w,
    height,
    box.d,
    segments(box.w),
    segments(height),
    segments(box.d),
  );
  const position = geometry.getAttribute('position');
  const radius = Math.min(box.w, box.d, height) * 0.45;
  const halfW = box.w / 2 - radius;
  const halfH = height / 2 - radius;
  const halfD = box.d / 2 - radius;
  const colors: number[] = [];
  const bumps = Array.from({ length: 6 }, () => ({
    x: rng.range(-box.w / 2, box.w / 2),
    y: rng.range(-height / 2, height / 2),
    z: rng.range(-box.d / 2, box.d / 2),
    size: rng.range(0.6, 1.6),
    push: rng.range(-0.18, 0.22),
  }));
  const tint = new Color();

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    // Round the corners: snap to the inner box, then push out by the radius.
    const cx = Math.max(-halfW, Math.min(halfW, x));
    const cy = Math.max(-halfH, Math.min(halfH, y));
    const cz = Math.max(-halfD, Math.min(halfD, z));
    let nx = x - cx;
    let ny = y - cy;
    let nz = z - cz;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    let r = radius;
    for (const bump of bumps) {
      const d = Math.hypot(x - bump.x, y - bump.y, z - bump.z);
      r += bump.push * Math.exp(-(d * d) / (bump.size * bump.size));
    }
    r += Math.sin(x * 3.1 + z * 2.3) * 0.04 + Math.sin(y * 4.7 + x * 1.9) * 0.03;
    // Keep the base flat on the ground.
    const outY = Math.max(-height / 2, cy + ny * r);
    position.setXYZ(i, cx + nx * r, outY, cz + nz * r);
    const moss = Math.max(0, ny - 0.35) * 1.6 * (0.7 + 0.3 * Math.sin(x * 2 + z * 3));
    tint.copy(STONE).lerp(MOSS, Math.min(1, moss));
    colors.push(tint.r, tint.g, tint.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
