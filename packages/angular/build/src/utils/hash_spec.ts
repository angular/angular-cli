/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { calculateHash, createContentHash, initializeHash } from './hash';

describe('hash utility', () => {
  beforeAll(async () => {
    await initializeHash();
  });

  it('should calculate identical 64-bit hex hash for string and Buffer with same content', () => {
    const text = 'export const message = "hello world";';
    const buffer = Buffer.from(text, 'utf-8');

    const stringHash = calculateHash(text);
    const bufferHash = calculateHash(buffer);

    expect(typeof stringHash).toBe('string');
    expect(stringHash.length).toBe(16);
    expect(stringHash).toBe(bufferHash);
  });

  it('should calculate different hashes for different contents', () => {
    const hash1 = calculateHash('const a = 1;');
    const hash2 = calculateHash('const a = 2;');

    expect(hash1).not.toBe(hash2);
  });

  it('should support streaming multi-part hashing matching combined single-shot hash', () => {
    const part1 = 'header: ';
    const part2 = 'body content: ';
    const part3 = 'footer';

    const hasher = createContentHash();
    hasher.update(part1);
    hasher.update(part2);
    hasher.update(Buffer.from(part3, 'utf-8'));
    const streamingHash = hasher.digest();

    const singleShotHash = calculateHash(part1 + part2 + part3);

    expect(streamingHash.length).toBe(16);
    expect(streamingHash).toBe(singleShotHash);
  });

  it('should handle Uint8Array chunks in streaming hasher', () => {
    const hasher = createContentHash();
    hasher.update(new Uint8Array([1, 2, 3, 4])).update('some-string');
    const digest = hasher.digest();

    expect(typeof digest).toBe('string');
    expect(digest.length).toBe(16);
  });
});
