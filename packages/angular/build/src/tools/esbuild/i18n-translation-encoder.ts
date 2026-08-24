/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Magic header identifier for i18n SharedArrayBuffer translation tables ('I18N').
 */
export const I18N_MAGIC_ID = 0x4931384e;

/**
 * Encodes a JavaScript translation dictionary into a contiguous SharedArrayBuffer.
 * The buffer contains a header, a sorted index table (by key for fast O(log N) binary search),
 * and a UTF-8 string pool.
 *
 * @param translation The translation dictionary object.
 * @returns A SharedArrayBuffer containing the binary encoded translation catalog.
 */
export function encodeTranslationToBuffer(translation: Record<string, unknown>): SharedArrayBuffer {
  const encoder = new TextEncoder();
  const entries = Object.entries(translation);
  const entryCount = entries.length;

  // Pre-encode string keys and JSON-serialized string values
  const encodedEntries: {
    keyBytes: Uint8Array;
    valBytes: Uint8Array;
  }[] = new Array(entryCount);

  let stringPoolByteSize = 0;

  for (let i = 0; i < entryCount; i++) {
    const [key, val] = entries[i];
    const keyBytes = encoder.encode(key);
    const valBytes = encoder.encode(JSON.stringify(val));

    encodedEntries[i] = { keyBytes, valBytes };
    stringPoolByteSize += keyBytes.byteLength + valBytes.byteLength;
  }

  // Sort entries lexicographically by UTF-8 byte comparison.
  // Lexicographical byte comparison matches the binary search reader's byte comparison,
  // ensuring deterministic and zero-allocation lookups across all runtimes regardless of UTF-16 surrogate pairs.
  encodedEntries.sort((a, b) => {
    const aBytes = a.keyBytes;
    const bBytes = b.keyBytes;
    const minLen = Math.min(aBytes.length, bBytes.length);

    for (let i = 0; i < minLen; i++) {
      const diff = aBytes[i] - bBytes[i];
      if (diff !== 0) {
        return diff;
      }
    }

    return aBytes.length - bBytes.length;
  });

  const indexByteSize = entryCount * 16;
  const headerByteSize = 16;
  const stringPoolOffset = headerByteSize + indexByteSize;

  const totalByteSize = stringPoolOffset + stringPoolByteSize;
  const buffer = new SharedArrayBuffer(totalByteSize);

  // Set up views over the SharedArrayBuffer
  const uint32Header = new Uint32Array(buffer, 0, 4);
  const uint32Index = new Uint32Array(buffer, headerByteSize, entryCount * 4);
  const uint8Pool = new Uint8Array(buffer, stringPoolOffset);

  // Write Header: Magic, EntryCount, IndexOffset, StringPoolOffset
  uint32Header[0] = I18N_MAGIC_ID;
  uint32Header[1] = entryCount;
  uint32Header[2] = headerByteSize;
  uint32Header[3] = stringPoolOffset;

  // Write Index Table and String Pool entries
  let currentPoolOffset = 0;

  for (let i = 0; i < entryCount; i++) {
    const { keyBytes, valBytes } = encodedEntries[i];

    const keyOffset = currentPoolOffset;
    const keyLen = keyBytes.byteLength;
    uint8Pool.set(keyBytes, keyOffset);
    currentPoolOffset += keyLen;

    const valOffset = currentPoolOffset;
    const valLen = valBytes.byteLength;
    uint8Pool.set(valBytes, valOffset);
    currentPoolOffset += valLen;

    // Index entry format (4 uint32 words / 16 bytes):
    // [0]: keyOffset (uint32)
    // [1]: keyLength (uint32)
    // [2]: valOffset (uint32)
    // [3]: valLength (uint32)
    const idx = i * 4;
    uint32Index[idx] = keyOffset;
    uint32Index[idx + 1] = keyLen;
    uint32Index[idx + 2] = valOffset;
    uint32Index[idx + 3] = valLen;
  }

  return buffer;
}
