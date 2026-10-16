/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ɵParsedTranslation } from '@angular/localize';
import { I18N_MAGIC_ID } from './i18n-translation-encoder';

/**
 * Sentinel value used to cache non-existent message key lookups in lazyCache.
 */
const NOT_FOUND = Symbol('NOT_FOUND');

/**
 * Compares a target key's UTF-8 byte array against a byte sequence in the string pool.
 * Lexicographical byte comparison matches the binary sort order used when encoding
 * the index table in `encodeTranslationToBuffer`.
 */
function compareBytes(
  target: Uint8Array,
  pool: Uint8Array,
  poolOffset: number,
  keyLen: number,
): number {
  if (poolOffset + keyLen > pool.length) {
    return 1;
  }

  const minLen = Math.min(target.length, keyLen);
  for (let i = 0; i < minLen; i++) {
    const diff = target[i] - pool[poolOffset + i];
    if (diff !== 0) {
      return diff;
    }
  }

  return target.length - keyLen;
}

/**
 * A zero-copy reader that queries translation messages directly from a SharedArrayBuffer
 * using binary search over a sorted key index.
 */
export class SharedTranslationDictionary<T = ɵParsedTranslation> {
  private readonly entryCount: number;
  private readonly uint32Index: Uint32Array;
  private readonly uint8Pool: Uint8Array;
  private readonly decoder = new TextDecoder();
  private readonly encoder = new TextEncoder();
  private readonly lazyCache = new Map<string, T | typeof NOT_FOUND>();

  constructor(buffer: SharedArrayBuffer) {
    if (buffer.byteLength < 16) {
      throw new Error('Invalid SharedArrayBuffer translation header: buffer too small.');
    }

    const uint32Header = new Uint32Array(buffer, 0, 4);
    if (uint32Header[0] !== I18N_MAGIC_ID) {
      throw new Error('Invalid SharedArrayBuffer translation header magic identifier.');
    }

    this.entryCount = uint32Header[1];
    const headerByteSize = uint32Header[2];
    const stringPoolOffset = uint32Header[3];

    if (
      headerByteSize < 16 ||
      headerByteSize % 4 !== 0 ||
      headerByteSize + this.entryCount * 16 > buffer.byteLength ||
      stringPoolOffset < headerByteSize + this.entryCount * 16 ||
      stringPoolOffset > buffer.byteLength
    ) {
      throw new Error('Invalid SharedArrayBuffer translation header offsets.');
    }

    this.uint32Index = new Uint32Array(buffer, headerByteSize, this.entryCount * 4);
    this.uint8Pool = new Uint8Array(buffer, stringPoolOffset);
  }

  /**
   * Looks up a translation message by key.
   * Performs a binary search over the index table if not previously cached in the lazy cache.
   *
   * @param targetKey The message key ID to search for.
   * @returns The parsed translation message, or undefined if not found.
   */
  get(targetKey: string): T | undefined {
    const cached = this.lazyCache.get(targetKey);
    if (cached !== undefined) {
      return cached === NOT_FOUND ? undefined : cached;
    }

    const targetBytes = this.encoder.encode(targetKey);
    let low = 0;
    let high = this.entryCount - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const idx = mid * 4;

      const keyOffset = this.uint32Index[idx];
      const keyLen = this.uint32Index[idx + 1];

      const cmp = compareBytes(targetBytes, this.uint8Pool, keyOffset, keyLen);
      if (cmp === 0) {
        const valOffset = this.uint32Index[idx + 2];
        const valLen = this.uint32Index[idx + 3];
        if (valOffset + valLen > this.uint8Pool.length) {
          this.lazyCache.set(targetKey, NOT_FOUND);

          return undefined;
        }

        const valBytes = this.uint8Pool.subarray(valOffset, valOffset + valLen);
        const valJson = this.decoder.decode(valBytes);

        try {
          const val = JSON.parse(valJson) as T;
          this.lazyCache.set(targetKey, val);

          return val;
        } catch {
          this.lazyCache.set(targetKey, NOT_FOUND);

          return undefined;
        }
      } else if (cmp < 0) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    this.lazyCache.set(targetKey, NOT_FOUND);

    return undefined;
  }
}

/**
 * Creates a JavaScript object Proxy wrapping a SharedTranslationDictionary so it can be passed
 * directly to `@angular/localize` inliner functions as a standard translation Record.
 *
 * Traps `get`, `has`, and `getOwnPropertyDescriptor` to fulfill all `@angular/localize` `translate()`
 * lookup requirements (`translations[id]`, `translations[legacyId]`, `Object.hasOwn(translations, id)`).
 * The `ownKeys` trap is intentionally omitted so keys are not eagerly decoded upfront upon reflection.
 *
 * @param buffer The SharedArrayBuffer containing binary encoded translation catalog.
 * @returns A Proxy object that intercepts property reads and queries the SharedTranslationDictionary.
 */
export function createSharedTranslationProxy<T = ɵParsedTranslation>(
  buffer: SharedArrayBuffer,
): Record<string, T> {
  const dictionary = new SharedTranslationDictionary<T>(buffer);

  return new Proxy(
    {},
    {
      get(target, prop: string | symbol) {
        if (typeof prop === 'string') {
          const value = dictionary.get(prop);
          if (value !== undefined) {
            return value;
          }
        }

        return Reflect.get(target, prop);
      },
      has(target, prop: string | symbol) {
        if (typeof prop === 'string' && dictionary.get(prop) !== undefined) {
          return true;
        }

        return Reflect.has(target, prop);
      },
      getOwnPropertyDescriptor(target, prop: string | symbol) {
        if (typeof prop === 'string') {
          const val = dictionary.get(prop);
          if (val !== undefined) {
            return {
              enumerable: true,
              configurable: true,
              writable: false,
              value: val,
            };
          }
        }

        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    },
  );
}
