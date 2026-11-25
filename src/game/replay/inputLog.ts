import type { InputState } from '../commands/input';
import { SPROUT_KINDS } from '../workers/sprouts';

/**
 * A day's inputs, one per simulation step, packed small. The simulation is deterministic, so
 * these alone replay the day exactly, provided the day was played with them as packed: the
 * game feeds the simulation each step's input through `quantise`, and logs that.
 *
 * The packing: a run of identical steps is one record. Each record is a flags byte (the
 * buttons, whether a kind was chosen, whether the walking stick moved), the kind if chosen,
 * the stick if it moved (each axis a signed byte, to a hundredth), the cursor as the change
 * from the last record (zig-zag varints, to a twentieth of a unit), and how many steps it
 * lasts (a varint).
 */

/** Cursor units per stored unit, and stick units per stored unit. */
const CURSOR = 20;
const STICK = 100;
const MAGIC = 0x44; // 'D'
const FORMAT = 1;

/** The input as the simulation is given it: the cursor and the stick on the log's grid. */
export function quantise(input: InputState): InputState {
  // `|| 0` turns a negative zero into zero, as unpacking gives it.
  const grid = (value: number, steps: number) => Math.round(value * steps) / steps || 0;
  return {
    ...input,
    cursorX: grid(input.cursorX, CURSOR),
    cursorZ: grid(input.cursorZ, CURSOR),
    moveX: grid(Math.max(-1, Math.min(1, input.moveX)), STICK),
    moveZ: grid(Math.max(-1, Math.min(1, input.moveZ)), STICK),
  };
}

class Bytes {
  data = new Uint8Array(1024);
  length = 0;
  push(byte: number): void {
    if (this.length === this.data.length) {
      const bigger = new Uint8Array(this.data.length * 2);
      bigger.set(this.data);
      this.data = bigger;
    }
    this.data[this.length++] = byte & 0xff;
  }
  varint(value: number): void {
    let v = value >>> 0;
    while (v >= 0x80) {
      this.push((v & 0x7f) | 0x80);
      v >>>= 7;
    }
    this.push(v);
  }
  signed(value: number): void {
    this.varint(value >= 0 ? value * 2 : -value * 2 - 1);
  }
  done(): Uint8Array {
    return this.data.slice(0, this.length);
  }
}

class Reader {
  at = 0;
  constructor(readonly data: Uint8Array) {}
  byte(): number {
    if (this.at >= this.data.length) throw new Error('The input log ends early.');
    return this.data[this.at++];
  }
  varint(): number {
    let value = 0;
    let shift = 0;
    for (;;) {
      const byte = this.byte();
      value += (byte & 0x7f) * 2 ** shift;
      if (byte < 0x80) return value;
      shift += 7;
      if (shift > 35) throw new Error('A number in the input log is too long.');
    }
  }
  signed(): number {
    const v = this.varint();
    return v % 2 === 0 ? v / 2 : -(v + 1) / 2;
  }
}

const int8 = (value: number) => Math.round(value * STICK) & 0xff;
const fromInt8 = (byte: number) => (byte > 127 ? byte - 256 : byte) / STICK || 0;

const same = (a: InputState, b: InputState) =>
  a.moveX === b.moveX &&
  a.moveZ === b.moveZ &&
  a.cursorX === b.cursorX &&
  a.cursorZ === b.cursorZ &&
  a.throwHeld === b.throwHeld &&
  a.whistleHeld === b.whistleHeld &&
  a.dismiss === b.dismiss &&
  a.rush === b.rush &&
  a.cycleKind === b.cycleKind &&
  a.cycleBack === b.cycleBack &&
  a.selectKind === b.selectKind;

/** Packs a day's inputs (already quantised) into bytes. */
export function packInputs(inputs: readonly InputState[]): Uint8Array {
  const out = new Bytes();
  out.push(MAGIC);
  out.push(FORMAT);
  out.varint(inputs.length);
  let cx = 0;
  let cz = 0;
  let mx = 0;
  let mz = 0;
  let i = 0;
  while (i < inputs.length) {
    const input = quantise(inputs[i]);
    let count = 1;
    while (i + count < inputs.length && same(quantise(inputs[i + count]), input)) count++;
    const moved = input.moveX !== mx || input.moveZ !== mz;
    const flags =
      (input.throwHeld ? 1 : 0) |
      (input.whistleHeld ? 2 : 0) |
      (input.dismiss ? 4 : 0) |
      (input.rush ? 8 : 0) |
      (input.cycleKind ? 16 : 0) |
      (input.cycleBack ? 32 : 0) |
      (input.selectKind !== null ? 64 : 0) |
      (moved ? 128 : 0);
    out.push(flags);
    if (input.selectKind !== null) out.push(SPROUT_KINDS.indexOf(input.selectKind));
    if (moved) {
      out.push(int8(input.moveX));
      out.push(int8(input.moveZ));
      mx = input.moveX;
      mz = input.moveZ;
    }
    const qx = Math.round(input.cursorX * CURSOR);
    const qz = Math.round(input.cursorZ * CURSOR);
    out.signed(qx - cx);
    out.signed(qz - cz);
    cx = qx;
    cz = qz;
    out.varint(count);
    i += count;
  }
  return out.done();
}

/** The inputs in packed bytes. Throws on a log that is not one. */
export function unpackInputs(bytes: Uint8Array): InputState[] {
  const read = new Reader(bytes);
  if (read.byte() !== MAGIC || read.byte() !== FORMAT) throw new Error('Not an input log.');
  const total = read.varint();
  const out: InputState[] = [];
  let cx = 0;
  let cz = 0;
  let mx = 0;
  let mz = 0;
  while (out.length < total) {
    const flags = read.byte();
    const kind = flags & 64 ? SPROUT_KINDS[read.byte()] : null;
    if (kind === undefined) throw new Error('An unknown kind in the input log.');
    if (flags & 128) {
      mx = fromInt8(read.byte());
      mz = fromInt8(read.byte());
    }
    cx += read.signed();
    cz += read.signed();
    const count = read.varint();
    if (count < 1 || out.length + count > total) throw new Error('The input log is malformed.');
    const input: InputState = {
      moveX: mx,
      moveZ: mz,
      cursorX: cx / CURSOR,
      cursorZ: cz / CURSOR,
      throwHeld: (flags & 1) !== 0,
      whistleHeld: (flags & 2) !== 0,
      dismiss: (flags & 4) !== 0,
      rush: (flags & 8) !== 0,
      cycleKind: (flags & 16) !== 0,
      cycleBack: (flags & 32) !== 0,
      selectKind: kind,
    };
    for (let n = 0; n < count; n++) out.push(input);
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

export function fromBase64(text: string): Uint8Array {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Squeezes bytes with deflate where the platform can; otherwise passes them through. */
async function through(
  bytes: Uint8Array,
  stream: { writable: WritableStream<BufferSource>; readable: ReadableStream<Uint8Array> },
) {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as BufferSource);
  void writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

/** Deflated and in base64, with a one-letter mark saying which: 'z' deflated, 'r' raw. */
export async function compress(bytes: Uint8Array): Promise<string> {
  if (typeof CompressionStream === 'undefined') return `r${toBase64(bytes)}`;
  return `z${toBase64(await through(bytes, new CompressionStream('deflate-raw')))}`;
}

export async function decompress(text: string): Promise<Uint8Array> {
  const body = fromBase64(text.slice(1));
  if (text[0] === 'r') return body;
  if (text[0] !== 'z' || typeof DecompressionStream === 'undefined')
    throw new Error('This input log cannot be read here.');
  return through(body, new DecompressionStream('deflate-raw'));
}
