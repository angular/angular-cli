/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import type { XXHashAPI } from 'xxhash-wasm';

let xxhashInstance: XXHashAPI | undefined;
let xxhashPromise: Promise<XXHashAPI> | undefined;

/**
 * Initializes the xxHash WASM instance early to ensure synchronous hashing uses xxHash.
 */
export async function initializeHash(): Promise<void> {
  if (xxhashInstance) {
    return;
  }

  xxhashPromise ??= import('xxhash-wasm').then((m) => m.default());
  xxhashInstance = await xxhashPromise;
}

function getXxhash(): XXHashAPI {
  assert(
    xxhashInstance,
    'Hash utility must be initialized by awaiting `initializeHash()` before use.',
  );

  return xxhashInstance;
}

/**
 * Calculates a fast 64-bit non-cryptographic hash of the provided content.
 * Suitable for cache keys, ETags, and change detection.
 */
export function calculateHash(data: string | Uint8Array): string {
  const instance = getXxhash();

  if (typeof data === 'string') {
    return instance.h64ToString(data);
  }

  return instance.h64Raw(data).toString(16).padStart(16, '0');
}

export interface ContentHasher {
  update(data: string | Uint8Array): ContentHasher;
  digest(): string;
}

/**
 * Creates a streaming 64-bit non-cryptographic content hasher.
 */
export function createContentHash(): ContentHasher {
  const instance = getXxhash();
  const hasher = instance.create64();

  const contentHasher: ContentHasher = {
    update(data: string | Uint8Array): ContentHasher {
      hasher.update(data);

      return contentHasher;
    },
    digest(): string {
      return hasher.digest().toString(16).padStart(16, '0');
    },
  };

  return contentHasher;
}
