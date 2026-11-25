import { describe, expect, it } from 'vitest';
import { cleanRoomCode, newRoomCode, parseSignals, roomTopic } from './rtc';

describe('online rooms', () => {
  it('makes codes that read back, and tidies codes as typed', () => {
    let seed = 1;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 50; i++) {
      const code = newRoomCode(random);
      expect(cleanRoomCode(code.toLowerCase())).toBe(code);
    }
    expect(cleanRoomCode(' abc-def ')).toBe('ABCDEF');
    expect(cleanRoomCode('ABCDE')).toBeNull();
    // No look-alike letters.
    expect(cleanRoomCode('ABCDE0')).toBeNull();
    expect(roomTopic('ABCDEF')).toMatch(/abcdef$/);
  });

  it('finds the offer and the answer among a room topic’s messages', () => {
    const line = (message: unknown) =>
      JSON.stringify({ event: 'message', message: JSON.stringify(message) });
    const text = [
      JSON.stringify({ event: 'open' }),
      line({ dandoriRoom: 1, kind: 'offer', sdp: 'old offer' }),
      line({ dandoriRoom: 1, kind: 'answer', sdp: 'an answer' }),
      line({ dandoriRoom: 1, kind: 'offer', sdp: 'new offer' }),
      line({ something: 'else' }),
      'not json',
    ].join('\n');
    expect(parseSignals(text, 'offer')).toEqual(['old offer', 'new offer']);
    expect(parseSignals(text, 'answer')).toEqual(['an answer']);
  });
});
