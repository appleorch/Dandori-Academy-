import {
  BoxGeometry,
  ConeGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  Vector2,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SproutKind } from '../workers/sprouts';

/*
 * The head ornament of each kind, shaped so the four kinds can be told apart by outline alone,
 * in greyscale or by a player who cannot tell their colours apart:
 *
 *   ember  a flame tuft of three tongues
 *   dew    a round droplet with a pointed tip
 *   stone  a flat square cap, like a mortarboard
 *   spark  a zig-zag bolt, crossed so it reads from every side
 *
 * Each sits with its base at y = 0, so it can be placed on top of the stalk or the head.
 */

function flameTuft(): BufferGeometry {
  const tongue = (radius: number, height: number, tilt: number, x: number): BufferGeometry => {
    const cone = new ConeGeometry(radius, height, 6);
    cone.translate(0, height / 2, 0);
    cone.rotateZ(tilt);
    cone.translate(x, 0, 0);
    return cone;
  };
  const merged = mergeGeometries([
    tongue(0.085, 0.34, 0, 0),
    tongue(0.06, 0.22, 0.55, 0.03),
    tongue(0.06, 0.22, -0.55, -0.03),
  ]);
  return merged ?? new ConeGeometry(0.1, 0.3, 6);
}

function droplet(): BufferGeometry {
  const profile: [number, number][] = [
    [0, 0],
    [0.07, 0.012],
    [0.11, 0.06],
    [0.112, 0.1],
    [0.09, 0.15],
    [0.05, 0.21],
    [0.018, 0.26],
    [0, 0.28],
  ];
  return new LatheGeometry(
    profile.map(([x, y]) => new Vector2(x, y)),
    12,
  );
}

function squareCap(): BufferGeometry {
  const cap = new BoxGeometry(0.34, 0.06, 0.34);
  cap.translate(0, 0.03, 0);
  return cap;
}

function bolt(): BufferGeometry {
  // A lightning bolt drawn in x (across) and y (up), then thickened.
  const shape = new Shape();
  const points: [number, number][] = [
    [-0.035, 0],
    [0.05, 0.13],
    [0.0, 0.13],
    [0.07, 0.32],
    [-0.06, 0.15],
    [-0.01, 0.15],
    [-0.07, 0],
  ];
  shape.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  const flat = (): BufferGeometry => {
    const geometry = new ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false });
    geometry.translate(0.005, 0, -0.0175);
    return geometry;
  };
  const across = flat();
  across.rotateY(Math.PI / 2);
  const merged = mergeGeometries([flat(), across]);
  return merged ?? flat();
}

export function crownGeometries(): Record<SproutKind, BufferGeometry> {
  return { ember: flameTuft(), dew: droplet(), stone: squareCap(), spark: bolt() };
}
