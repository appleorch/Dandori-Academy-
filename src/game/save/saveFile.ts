import { GAME_VERSION } from '../core/changelog';
import { LEVELS } from '../world/level';
import { isRecord, parseSave, SAVE_VERSION, type SaveData } from './saveManager';
import { concatBytes, hmacSha256, sha256 } from './sha256';

/**
 * The `.dandori` save file: a binary container that hides the save data and seals it.
 *
 *   offset  size  field
 *   0       4     magic "DNDR"
 *   4       1     container version
 *   5       3     reserved, zero
 *   8       16    random nonce
 *   24      4     payload length n (uint32, little-endian)
 *   28      n     payload: UTF-8 JSON, XORed with a SHA-256 counter-mode keystream
 *   28+n    32    HMAC-SHA-256 of bytes 0 .. 28+n
 *
 * The keys are built into the game, so this stops casual editing (a text editor
 * shows noise, and any change breaks the seal) rather than a determined reverse
 * engineer reading the game's code.
 */

const MAGIC = [0x44, 0x4e, 0x44, 0x52];
export const CONTAINER_VERSION = 1;
const NONCE_BYTES = 16;
const HEADER_BYTES = 28;
const MAC_BYTES = 32;

export const SAVE_FILE_EXTENSION = '.dandori';
/** Anything bigger than this is not a save file. */
export const MAX_SAVE_FILE_BYTES = 256 * 1024;

const encoder = new TextEncoder();
const SECRET = encoder.encode('Dandori Academy / Kiln seal / 7f3c91e2a5d84b06');
const CIPHER_KEY = sha256(concatBytes(SECRET, encoder.encode('cipher')));
const SEAL_KEY = sha256(concatBytes(SECRET, encoder.encode('seal')));

export type SaveFileResult = { ok: true; save: SaveData } | { ok: false; error: string };

/** XORs `data` with the keystream for `nonce`. Applying it twice restores the input. */
function applyKeystream(data: Uint8Array, nonce: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  const counter = new Uint8Array(4);
  const counterView = new DataView(counter.buffer);
  for (let block = 0; block * 32 < data.length; block++) {
    counterView.setUint32(0, block);
    const stream = sha256(concatBytes(CIPHER_KEY, nonce, counter));
    for (let i = 0; i < 32 && block * 32 + i < data.length; i++) {
      out[block * 32 + i] = data[block * 32 + i] ^ stream[i];
    }
  }
  return out;
}

function sealsMatch(a: Uint8Array, b: Uint8Array): boolean {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

/** Builds a `.dandori` file. `nonce` must be 16 random bytes. */
export function writeSaveFile(save: SaveData, now: Date, nonce: Uint8Array): Uint8Array {
  if (nonce.length !== NONCE_BYTES) throw new Error('Save file nonce must be 16 bytes');
  const json = JSON.stringify({ gameVersion: GAME_VERSION, exportedAt: now.toISOString(), save });
  const payload = applyKeystream(encoder.encode(json), nonce);
  const header = new Uint8Array(HEADER_BYTES);
  header.set(MAGIC, 0);
  header[4] = CONTAINER_VERSION;
  header.set(nonce, 8);
  new DataView(header.buffer).setUint32(24, payload.length, true);
  const body = concatBytes(header, payload);
  return concatBytes(body, hmacSha256(SEAL_KEY, body));
}

export function saveFileName(now: Date): string {
  return `dandori-academy-${now.toISOString().slice(0, 10)}${SAVE_FILE_EXTENSION}`;
}

const NOT_A_SAVE = 'That file is not a Dandori Academy save file.';

/** Opens a `.dandori` file, refusing anything that is not one or has been changed. */
export function readSaveFile(bytes: Uint8Array): SaveFileResult {
  if (bytes.length > 0 && bytes[0] === 0x7b) {
    return {
      ok: false,
      error:
        'That is an old-style text save file. Saves now use the protected .dandori format; download a new one from this screen.',
    };
  }
  if (bytes.length < HEADER_BYTES + MAC_BYTES || MAGIC.some((byte, i) => bytes[i] !== byte)) {
    return { ok: false, error: NOT_A_SAVE };
  }
  if (bytes[4] !== CONTAINER_VERSION) {
    return {
      ok: false,
      error: 'That save file was made by a newer version of the game. Update the game to load it.',
    };
  }
  const length = new DataView(bytes.buffer, bytes.byteOffset).getUint32(24, true);
  const body = bytes.subarray(0, bytes.length - MAC_BYTES);
  const seal = bytes.subarray(bytes.length - MAC_BYTES);
  if (body.length !== HEADER_BYTES + length || !sealsMatch(seal, hmacSha256(SEAL_KEY, body))) {
    return {
      ok: false,
      error: 'That save file has been modified or damaged, so it cannot be loaded.',
    };
  }

  let data: unknown;
  try {
    const nonce = bytes.subarray(8, 8 + NONCE_BYTES);
    const json = new TextDecoder().decode(applyKeystream(body.subarray(HEADER_BYTES), nonce));
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: NOT_A_SAVE };
  }
  const inner = isRecord(data) ? data.save : undefined;
  if (isRecord(inner) && typeof inner.version === 'string' && inner.version !== SAVE_VERSION) {
    return {
      ok: false,
      error: `That save comes from a different version of the game (save format ${inner.version}), so it cannot be loaded here.`,
    };
  }
  const save = parseSave(inner);
  if (!save) return { ok: false, error: NOT_A_SAVE };
  return { ok: true, save: { ...save, stage: Math.min(save.stage, LEVELS.length + 1) } };
}
