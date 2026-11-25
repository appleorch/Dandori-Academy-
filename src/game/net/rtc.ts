import { RELAY } from '../leaderboard/board';
import type { NetMessage, Transport } from './lockstep';

/**
 * Two browsers joined directly, with no game server: a WebRTC data channel, found through a
 * free public STUN server, and introduced through the same public relay the board uses. The
 * host posts an offer under a short room code; the guest reads it and posts an answer. Each
 * side gathers all its network candidates before posting, so one message each way is enough.
 */

const ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
/** Unambiguous letters and digits for room codes (no 0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const POLL_MS = 1500;
const OFFER_WAIT_MS = 30_000;
const ANSWER_WAIT_MS = 120_000;
const GATHER_MS = 4000;
const OPEN_WAIT_MS = 20_000;

export function newRoomCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return code;
}

/** A code as typed, tidied: upper case, the alphabet only. Null if it cannot be one. */
export function cleanRoomCode(text: string): string | null {
  const code = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

export const roomTopic = (code: string) => `dandori-academy-room-v1-${code.toLowerCase()}`;

interface Signal {
  dandoriRoom: 1;
  kind: 'offer' | 'answer';
  sdp: string;
}

/** The signals of a kind in a relay answer, newest last. */
export function parseSignals(text: string, kind: Signal['kind']): string[] {
  const found: string[] = [];
  for (const line of text.split('\n')) {
    try {
      const event = JSON.parse(line) as { event?: string; message?: string };
      if (event.event !== 'message' || !event.message) continue;
      const signal = JSON.parse(event.message) as Partial<Signal>;
      if (signal.dandoriRoom === 1 && signal.kind === kind && typeof signal.sdp === 'string')
        found.push(signal.sdp);
    } catch {
      // Not a signal.
    }
  }
  return found;
}

async function post(code: string, kind: Signal['kind'], sdp: string): Promise<void> {
  const body: Signal = { dandoriRoom: 1, kind, sdp };
  const response = await fetch(`${RELAY}/${roomTopic(code)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`The relay answered ${response.status}.`);
}

async function waitFor(
  code: string,
  kind: Signal['kind'],
  ms: number,
  cancelled: () => boolean,
): Promise<string> {
  const until = Date.now() + ms;
  while (Date.now() < until && !cancelled()) {
    try {
      const response = await fetch(`${RELAY}/${roomTopic(code)}/json?poll=1&since=10m`);
      if (response.ok) {
        const found = parseSignals(await response.text(), kind);
        if (found.length > 0) return found[found.length - 1];
      }
    } catch {
      // Try again in a moment.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(
    kind === 'offer'
      ? 'No room with that code. Check it, and that the host is waiting.'
      : 'Nobody joined in time.',
  );
}

/** Waits until every network candidate is gathered (or a few seconds have passed). */
function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      if (pc.iceGatheringState === 'complete') resolve();
    };
    pc.addEventListener('icegatheringstatechange', done);
    setTimeout(resolve, GATHER_MS);
  });
}

class ChannelTransport implements Transport {
  onMessage: ((message: NetMessage) => void) | null = null;
  onClose: (() => void) | null = null;
  constructor(
    private readonly pc: RTCPeerConnection,
    private readonly channel: RTCDataChannel,
  ) {
    channel.onmessage = (event) => {
      try {
        this.onMessage?.(JSON.parse(String(event.data)) as NetMessage);
      } catch {
        // A garbled message is dropped.
      }
    };
    channel.onclose = () => this.onClose?.();
  }
  send(message: NetMessage): void {
    if (this.channel.readyState === 'open') this.channel.send(JSON.stringify(message));
  }
  close(): void {
    this.channel.close();
    this.pc.close();
  }
}

function opened(channel: RTCDataChannel): Promise<void> {
  if (channel.readyState === 'open') return Promise.resolve();
  return new Promise((resolve, reject) => {
    channel.addEventListener('open', () => resolve());
    setTimeout(
      () =>
        reject(
          new Error(
            'The two of you could not connect directly (some networks block it). Try another network.',
          ),
        ),
      OPEN_WAIT_MS,
    );
  });
}

export interface Connecting {
  transport: Promise<ChannelTransport>;
  cancel: () => void;
}

/** Opens a room under `code` and waits for someone to join it. */
export function hostRoom(code: string, status: (text: string) => void): Connecting {
  let cancelled = false;
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const transport = (async () => {
    const channel = pc.createDataChannel('dandori', { ordered: true });
    await pc.setLocalDescription(await pc.createOffer());
    status('Opening the room…');
    await gathered(pc);
    await post(code, 'offer', pc.localDescription?.sdp ?? '');
    status('Waiting for the other player to join…');
    const answer = await waitFor(code, 'answer', ANSWER_WAIT_MS, () => cancelled);
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });
    status('Connecting…');
    await opened(channel);
    return new ChannelTransport(pc, channel);
  })();
  return {
    transport,
    cancel: () => {
      cancelled = true;
      pc.close();
    },
  };
}

/** Joins the room under `code`. */
export function joinRoom(code: string, status: (text: string) => void): Connecting {
  let cancelled = false;
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const transport = (async () => {
    status('Looking for the room…');
    const offer = await waitFor(code, 'offer', OFFER_WAIT_MS, () => cancelled);
    const channel = new Promise<RTCDataChannel>((resolve) => {
      pc.addEventListener('datachannel', (event) => resolve(event.channel));
    });
    await pc.setRemoteDescription({ type: 'offer', sdp: offer });
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    await post(code, 'answer', pc.localDescription?.sdp ?? '');
    status('Connecting…');
    const open = await channel;
    await opened(open);
    return new ChannelTransport(pc, open);
  })();
  return {
    transport,
    cancel: () => {
      cancelled = true;
      pc.close();
    },
  };
}
