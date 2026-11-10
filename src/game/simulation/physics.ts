import RAPIER from '@dimforge/rapier3d-compat';
import { CAPTAIN } from '../core/config';
import type { Box, Point } from '../navigation/NavGrid';

const WALL_HALF_HEIGHT = 2;
const BORDER = 1;

/** Loads the Rapier WASM module. Must resolve before a PhysicsWorld is created. */
export async function initPhysics(): Promise<void> {
  await RAPIER.init();
}

/**
 * Rapier world holding the static level geometry and the captain's kinematic body.
 * The captain moves through a character controller so it slides along walls.
 */
export class PhysicsWorld {
  private readonly world: RAPIER.World;
  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly body: RAPIER.RigidBody;
  private readonly collider: RAPIER.Collider;

  constructor(width: number, depth: number, obstacles: readonly Box[], start: Point, dt: number) {
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.world.timestep = dt;
    const hw = width / 2;
    const hd = depth / 2;
    const walls: Box[] = [
      ...obstacles,
      { x: -hw - BORDER / 2, z: 0, w: BORDER, d: depth },
      { x: hw + BORDER / 2, z: 0, w: BORDER, d: depth },
      { x: 0, z: -hd - BORDER / 2, w: width + 2 * BORDER, d: BORDER },
      { x: 0, z: hd + BORDER / 2, w: width + 2 * BORDER, d: BORDER },
    ];
    for (const box of walls) {
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(box.w / 2, WALL_HALF_HEIGHT, box.d / 2).setTranslation(
          box.x,
          WALL_HALF_HEIGHT,
          box.z,
        ),
      );
    }
    this.body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x, 1, start.z),
    );
    this.collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.5, CAPTAIN.radius),
      this.body,
    );
    this.controller = this.world.createCharacterController(0.02);
    this.world.step();
  }

  /** Moves the captain by the desired displacement, resolves collisions and writes the result. */
  moveCaptain(dx: number, dz: number, out: Point): void {
    this.controller.computeColliderMovement(this.collider, { x: dx, y: 0, z: dz });
    const move = this.controller.computedMovement();
    const at = this.body.translation();
    out.x = at.x + move.x;
    out.z = at.z + move.z;
    this.body.setNextKinematicTranslation({ x: out.x, y: 1, z: out.z });
    this.world.step();
  }

  dispose(): void {
    this.world.removeCharacterController(this.controller);
    this.world.free();
  }
}
