import { describe, expect, it } from 'vitest';
import { AIR, BRICK, DOORFRAME, GRASS, STONE, WATER } from './blocks';
import { buildChunk } from './mesher';
import { collides, newBody, overlapsCell, stepBody, WARDEN_SIZE, type Controls } from './physics';
import { daypart, Session } from './session';
import { newIsland } from './storage';
import { CHUNK, HEIGHT, SEA_LEVEL, World } from './world';

const world = new World(20261124);
const still: Controls = { forward: 0, strafe: 0, jump: false, descend: false, sprint: false };

function faces(chunk: ReturnType<typeof buildChunk>): number {
  return Object.values(chunk).reduce(
    (sum, layer) => sum + (layer ? layer.indices.length / 6 : 0),
    0,
  );
}

/** Runs a body for a number of seconds at 60 frames a second. */
function run(body: ReturnType<typeof newBody>, controls: Controls, seconds: number, yaw = 0): void {
  for (let t = 0; t < seconds; t += 1 / 60) stepBody(world, body, controls, yaw, 1 / 60);
}

describe('Squarehollow world', () => {
  it('grows the same island from the same seed, and a different one from another', () => {
    expect(new World(20261124).blocks).toEqual(world.blocks);
    expect(new World(7).blocks).not.toEqual(world.blocks);
  });

  it('is an island: sea all round the edge, land in the middle', () => {
    for (let i = 0; i < world.width; i++) {
      expect(world.get(i, SEA_LEVEL, 0)).toBe(WATER);
      expect(world.get(0, SEA_LEVEL, i)).toBe(WATER);
    }
    const land = [...world.heights].filter((h) => h > SEA_LEVEL).length / world.heights.length;
    expect(land).toBeGreaterThan(0.3);
    expect(world.get(-5, SEA_LEVEL, 10)).toBe(WATER);
    expect(world.solidAt(-1, 30, 10)).toBe(true);
  });

  it('puts the Warden on dry turf in front of the dark door, with room to stand', () => {
    const { spawn, door } = world;
    expect(world.get(spawn.x, spawn.y - 1, spawn.z)).toBe(GRASS);
    expect(spawn.y).toBeGreaterThan(SEA_LEVEL + 1);
    for (let y = spawn.y; y < spawn.y + 3; y++) expect(world.get(spawn.x, y, spawn.z)).toBe(AIR);
    expect(world.get(door.x - 1, door.y, door.z)).toBe(DOORFRAME);
    expect(world.get(door.x + 1, door.y + 1, door.z)).toBe(DOORFRAME);
    expect(world.get(door.x, door.y + 2, door.z)).toBe(DOORFRAME);
    expect(world.get(door.x, door.y, door.z)).toBe(AIR);
    expect(world.get(door.x, door.y + 1, door.z)).toBe(AIR);
    expect(world.dig(door.x - 1, door.y, door.z)).toBeNull();
  });

  it('finds the first block a ray meets, and the face it came in by', () => {
    const { spawn } = world;
    const hit = world.raycast(spawn.x + 0.5, spawn.y + 1.6, spawn.z + 0.5, 0, -1, 0, 6);
    expect(hit).toMatchObject({ x: spawn.x, y: spawn.y - 1, z: spawn.z, nx: 0, ny: 1, nz: 0 });
    expect(hit?.distance).toBeCloseTo(1.6);
    expect(world.raycast(spawn.x + 0.5, spawn.y + 1.6, spawn.z + 0.5, 0, 1, 0, 6)).toBeNull();
    expect(world.raycast(spawn.x + 0.5, spawn.y + 1.6, spawn.z + 0.5, 0, -1, 0, 1)).toBeNull();
  });

  it('digs and builds, and remembers every change for next time', () => {
    const copy = new World(20261124);
    const { spawn } = copy;
    expect(copy.dig(spawn.x + 1, spawn.y - 1, spawn.z)).toEqual([
      { x: spawn.x + 1, y: spawn.y - 1, z: spawn.z },
    ]);
    expect(copy.place(spawn.x + 2, spawn.y, spawn.z, BRICK)).not.toBeNull();
    expect(copy.place(spawn.x + 2, spawn.y, spawn.z, STONE)).toBeNull();
    const again = new World(20261124);
    again.applyEdits(JSON.parse(JSON.stringify(copy.editList())));
    expect(again.blocks).toEqual(copy.blocks);
    again.applyEdits([
      [-1, 3],
      [0, 999],
      [1.5, 2],
    ]);
    expect(again.blocks).toEqual(copy.blocks);
  });

  it('lets water run into a hole dug beside it, but not above the sea', () => {
    const copy = new World(20261124);
    // Find a beach cell with the sea beside it.
    let found: [number, number, number] | null = null;
    for (let z = 1; z < copy.depth - 1 && !found; z++) {
      for (let x = 1; x < copy.width - 1 && !found; x++) {
        const h = copy.heights[z * copy.width + x];
        if (h === SEA_LEVEL - 1 && copy.get(x + 1, SEA_LEVEL - 1, z) === WATER) found = [x, h, z];
      }
    }
    expect(found).not.toBeNull();
    const [x, y, z] = found as [number, number, number];
    const changed = copy.dig(x, y, z);
    expect(copy.get(x, y, z)).toBe(WATER);
    expect(changed?.length).toBeGreaterThanOrEqual(1);
    const { spawn } = copy;
    copy.dig(spawn.x, spawn.y - 1, spawn.z);
    expect(copy.get(spawn.x, spawn.y - 1, spawn.z)).toBe(AIR);
  });
});

describe('Squarehollow meshing', () => {
  it('draws only the faces that can be seen', () => {
    const copy = new World(20261124);
    const before = faces(buildChunk(copy, 2, 2));
    // A block hanging in the sky shows all six faces.
    copy.place(2 * CHUNK + 5, HEIGHT - 3, 2 * CHUNK + 5, BRICK);
    expect(faces(buildChunk(copy, 2, 2))).toBe(before + 6);
    // A second one beside it hides one face of each.
    copy.place(2 * CHUNK + 6, HEIGHT - 3, 2 * CHUNK + 5, BRICK);
    expect(faces(buildChunk(copy, 2, 2))).toBe(before + 10);
  });

  it('keeps every layer’s arrays in step', () => {
    const chunk = buildChunk(world, (world.spawn.x / CHUNK) | 0, (world.spawn.z / CHUNK) | 0);
    expect(chunk.solid).not.toBeNull();
    for (const layer of Object.values(chunk)) {
      if (!layer) continue;
      const vertices = layer.positions.length / 3;
      expect(layer.normals.length).toBe(vertices * 3);
      expect(layer.colors.length).toBe(vertices * 3);
      expect(layer.uvs.length).toBe(vertices * 2);
      expect(Math.max(...layer.indices)).toBeLessThan(vertices);
      expect(layer.colors.every((c) => c >= 0 && c <= 1.2)).toBe(true);
    }
  });
});

describe('Squarehollow bodies', () => {
  it('falls to the ground and stands on it', () => {
    const { spawn } = world;
    const body = newBody(spawn.x + 0.5, spawn.y + 6, spawn.z + 0.5);
    run(body, still, 2);
    expect(body.y).toBeCloseTo(spawn.y, 3);
    expect(body.onGround).toBe(true);
    expect(collides(world, body.x, body.y, body.z, WARDEN_SIZE)).toBe(false);
  });

  it('walks into a wall and stops, and jumps up a single step', () => {
    const copy = new World(20261124);
    const { spawn } = copy;
    const body = newBody(spawn.x + 0.5, spawn.y, spawn.z + 0.5);
    // A wall two high, three cells ahead along +z (yaw pi faces +z).
    for (let dx = -2; dx <= 2; dx++) {
      copy.place(spawn.x + dx, spawn.y, spawn.z + 3, BRICK);
      copy.place(spawn.x + dx, spawn.y + 1, spawn.z + 3, BRICK);
    }
    const walk = { ...still, forward: 1 };
    for (let t = 0; t < 2; t += 1 / 60) stepBody(copy, body, walk, Math.PI, 1 / 60);
    expect(body.z).toBeCloseTo(spawn.z + 3 - WARDEN_SIZE.half, 2);
    // Knock the top row off: now it is a step, and a jump clears it.
    for (let dx = -2; dx <= 2; dx++) copy.dig(spawn.x + dx, spawn.y + 1, spawn.z + 3);
    let landed = false;
    for (let t = 0; t < 1.5 && !landed; t += 1 / 60) {
      stepBody(copy, body, { ...walk, jump: true }, Math.PI, 1 / 60);
      landed = body.onGround && body.y > spawn.y + 0.5;
    }
    expect(landed).toBe(true);
    expect(body.y).toBeCloseTo(spawn.y + 1, 3);
  });

  it('never builds a block on top of itself', () => {
    const body = newBody(10.5, 30, 10.5);
    expect(overlapsCell(body, WARDEN_SIZE, 10, 30, 10)).toBe(true);
    expect(overlapsCell(body, WARDEN_SIZE, 10, 31, 10)).toBe(true);
    expect(overlapsCell(body, WARDEN_SIZE, 10, 32, 10)).toBe(false);
    expect(overlapsCell(body, WARDEN_SIZE, 11, 30, 10)).toBe(false);
    expect(overlapsCell(body, WARDEN_SIZE, 10, 29, 10)).toBe(false);
  });

  it('sinks slowly in water, swims up, and flies when asked', () => {
    const swimmer = newBody(3.5, SEA_LEVEL + 3, 3.5);
    run(swimmer, still, 1.5);
    expect(swimmer.inWater).toBe(true);
    expect(swimmer.vy).toBeGreaterThanOrEqual(-3.5);
    run(swimmer, { ...still, jump: true }, 3);
    expect(swimmer.y).toBeGreaterThan(SEA_LEVEL - 1.5);
    const flying = newBody(world.spawn.x + 0.5, world.spawn.y, world.spawn.z + 0.5);
    flying.flying = true;
    run(flying, { ...still, jump: true }, 1);
    expect(flying.y).toBeGreaterThan(world.spawn.y + 3);
    run(flying, still, 1);
    const height = flying.y;
    run(flying, still, 1);
    expect(flying.y).toBeCloseTo(height, 1);
  });
});

describe('a visit to Squarehollow', () => {
  function arrive(): Session {
    const session = new Session({ ...newIsland(), seed: 20261124 }, 0);
    for (let i = 0; i < 90; i++) session.update(1 / 60);
    expect(session.arrival).toBe(1);
    session.active = true;
    return session;
  }

  it('digs the block looked at, and never builds where the Warden stands', () => {
    const session = arrive();
    const { spawn } = session.world;
    session.pitch = -1.5;
    session.buildQueued = true;
    session.update(1 / 60);
    expect(session.world.get(spawn.x, spawn.y, spawn.z)).toBe(AIR);
    session.digQueued = true;
    session.update(1 / 60);
    expect(session.world.get(spawn.x, spawn.y - 1, spawn.z)).toBe(AIR);
    expect(session.edited).toBe(true);
    expect(session.changed.length).toBeGreaterThan(0);
    expect(session.crumbs).toHaveLength(1);
  });

  it('builds the chosen block on the face looked at', () => {
    const session = arrive();
    const { spawn } = session.world;
    // Facing out of the door (+z), looking down at the ground two cells ahead.
    session.pitch = -Math.atan2(1.62, 2.1);
    session.choose(5);
    session.buildQueued = true;
    session.update(1 / 60);
    expect(session.world.get(spawn.x, spawn.y, spawn.z + 2)).toBe(session.selected);
    expect(session.selected).toBe(BRICK);
  });

  it('goes back through the door when the Warden walks into it', () => {
    const session = arrive();
    let gone = 0;
    session.events = { door: () => gone++ };
    session.keys.add('KeyS');
    for (let i = 0; i < 120 && gone === 0; i++) session.update(1 / 60);
    expect(gone).toBe(1);
    expect(session.leaving).toBe(true);
  });

  it('stands still while paused', () => {
    const session = arrive();
    session.keys.add('KeyW');
    session.paused = true;
    const { x, z } = session.body;
    for (let i = 0; i < 30; i++) session.update(1 / 60);
    expect([session.body.x, session.body.z]).toEqual([x, z]);
  });

  it('names the time of day', () => {
    expect(daypart(0)).toBe('Night');
    expect(daypart(0.25)).toBe('Dawn');
    expect(daypart(0.34)).toBe('Morning');
    expect(daypart(0.5)).toBe('Midday');
    expect(daypart(0.65)).toBe('Afternoon');
    expect(daypart(0.75)).toBe('Dusk');
    expect(daypart(0.9)).toBe('Night');
  });
});
