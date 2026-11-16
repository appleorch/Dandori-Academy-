import { describe, expect, it } from 'vitest';
import { hmacSha256, sha256 } from './sha256';

const text = (value: string) => new TextEncoder().encode(value);
const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

describe('sha256', () => {
  it('matches the FIPS 180-4 test vectors', () => {
    expect(hex(sha256(text('')))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(hex(sha256(text('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(hex(sha256(text('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('handles a million bytes', () => {
    expect(hex(sha256(text('a'.repeat(1_000_000))))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });
});

describe('hmacSha256', () => {
  it('matches the RFC 4231 test vectors', () => {
    expect(hex(hmacSha256(new Uint8Array(20).fill(0x0b), text('Hi There')))).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );
    expect(hex(hmacSha256(text('Jefe'), text('what do ya want for nothing?')))).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
    expect(
      hex(
        hmacSha256(
          new Uint8Array(131).fill(0xaa),
          text('Test Using Larger Than Block-Size Key - Hash Key First'),
        ),
      ),
    ).toBe('60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54');
  });
});
