/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lookup as lookupMimeType } from 'mrmime';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { workerData } from 'node:worker_threads';

/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { assetFiles } = workerData as {
  assetFiles: Record</** Destination */ string, /** Source */ string>;
};

const assetsCache: Map<string, { headers: undefined | Record<string, string>; content: Buffer }> =
  new Map();

export function patchFetchToLoadInMemoryAssets(baseURL: URL): void {
  const originalFetch = globalThis.fetch;
  const patchedFetch: typeof fetch = async (input, init) => {
    let url: URL;
    if (input instanceof URL) {
      url = input;
    } else if (typeof input === 'string') {
      url = new URL(input);
    } else if (typeof input === 'object' && 'url' in input) {
      url = new URL(input.url);
    } else {
      return originalFetch(input, init);
    }

    const { hostname } = url;
    const pathname = decodeURIComponent(url.pathname);

    if (hostname !== baseURL.hostname || !assetFiles[pathname]) {
      // Only handle relative requests or files that are in assets.
      return originalFetch(input, init);
    }

    const cachedAsset = assetsCache.get(pathname);
    if (cachedAsset) {
      const { content, headers } = cachedAsset;

      return new Response(content, {
        headers,
      });
    }

    const extension = extname(pathname);
    const mimeType = lookupMimeType(extension);
    const content = await readFile(assetFiles[pathname]);
    const headers = mimeType
      ? {
          'Content-Type': mimeType,
        }
      : undefined;

    assetsCache.set(pathname, { headers, content });

    return new Response(content, {
      headers,
    });
  };

  globalThis.fetch = patchedFetch;
}
