import type * as RAPIER from '@dimforge/rapier3d-compat';
import { CAPTAIN } from '../core/config';
import type { Box, Point } from '../navigation/NavGrid';

const WALL_HALF_HEIGHT = 2;
const BORDER = 1;

/** The Rapier module once loaded. It is large (its WASM is inlined), so it is fetched on demand. */
let loaded: typeof RAPIER | null = null;
let loading: Promise<void> | null = null;

/**
 * Loads the Rapier WASM module, once; later calls return the same promise. Must resolve before
 * a PhysicsWorld is created. The menus call it in idle time so a day can start at once.
 */
export function initPhysics(): Promise<void> {
  loading ??= import('@dimforge/rapier3d-compat').then(async (module) => {
    await module.init();
    loaded = module;
  });
  return loading;
}

/** Whether Rapier is loaded and a PhysicsWorld can be made. */
export function physicsReady(): boolean {
  return loaded !== null;
}

function rapier(): typeof RAPIER {
  if (!loaded) throw new Error('initPhysics() must resolve before physics is used');
  return loaded;
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
  private readonly walls = new Map<Box, RAPIER.Collider>();

  constructor(width: number, depth: number, obstacles: readonly Box[], start: Point, dt: number) {
    this.world = new (rapier().World)({ x: 0, y: 0, z: 0 });
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
    for (const box of walls) this.addWall(box);
    this.body = this.world.createRigidBody(
      rapier().RigidBodyDesc.kinematicPositionBased().setTranslation(start.x, 1, start.z),
    );
    this.collider = this.world.createCollider(
      rapier().ColliderDesc.capsule(0.5, CAPTAIN.radius),
      this.body,
    );
    this.controller = this.world.createCharacterController(0.02);
    this.world.step();
  }

  /**
   * An exact copy of this world, from Rapier's own snapshot, so it steps on just as this one
   * would (a world built afresh can differ in the last digits, its contacts made in another
   * order). `boxOf` maps each wall to its counterpart in the copied simulation.
   */
  clone(boxOf: (box: Box) => Box): PhysicsWorld {
    const world = rapier().World.restoreSnapshot(this.world.takeSnapshot());
    const out = Object.create(PhysicsWorld.prototype) as Record<string, unknown>;
    out.world = world;
    out.body = world.getRigidBody(this.body.handle);
    out.collider = world.getCollider(this.collider.handle);
    out.controller = world.createCharacterController(0.02);
    out.walls = new Map(
      [...this.walls].map(([box, collider]) => [boxOf(box), world.getCollider(collider.handle)]),
    );
    return out as unknown as PhysicsWorld;
  }

  /** Adds a solid box the captain cannot walk through. */
  addWall(box: Box): void {
    const collider = this.world.createCollider(
      rapier()
        .ColliderDesc.cuboid(box.w / 2, WALL_HALF_HEIGHT, box.d / 2)
        .setTranslation(box.x, WALL_HALF_HEIGHT, box.z),
    );
    this.walls.set(box, collider);
  }

  /** Removes a box added with `addWall`, such as a gate that has been broken. */
  removeWall(box: Box): void {
    const collider = this.walls.get(box);
    if (!collider) return;
    this.world.removeCollider(collider, false);
    this.walls.delete(box);
  }

  /** Puts the captain back at a point, for when a move was not allowed (up a one-way ledge). */
  placeCaptain(at: Point): void {
    this.body.setTranslation({ x: at.x, y: 1, z: at.z }, true);
    this.body.setNextKinematicTranslation({ x: at.x, y: 1, z: at.z });
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
