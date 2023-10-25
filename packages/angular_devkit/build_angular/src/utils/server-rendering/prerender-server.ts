/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { lookup as lookupMimeType } from 'mrmime';
import { readFile } from 'node:fs/promises';
import { IncomingMessage, RequestListener, ServerResponse, createServer } from 'node:http';
import { extname, posix } from 'node:path';
import { BuildOutputAsset } from '../../tools/esbuild/bundler-execution-result';

/**
 * Start a server that can handle HTTP requests to assets.
 *
 * @example
 * ```ts
 * httpClient.get('/assets/content.json');
 * ```
 * @returns the server address.
 */
export async function startServer(assets: Readonly<BuildOutputAsset[]>): Promise<{
  address: string;
  close?: () => void;
}> {
  if (Object.keys(assets).length === 0) {
    return {
      address: '',
    };
  }

  const assetsReversed: Record<string, string> = {};
  for (const { source, destination } of assets) {
    assetsReversed[addLeadingSlash(destination.replace(/\\/g, posix.sep))] = source;
  }

  const assetsCache: Map<string, { mimeType: string | void; content: Buffer }> = new Map();
  const server = createServer(requestHandler(assetsReversed, assetsCache));

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const serverAddress = server.address();
  let address: string;
  if (!serverAddress) {
    address = '';
  } else if (typeof serverAddress === 'string') {
    address = serverAddress;
  } else {
    const { port, address: host } = serverAddress;
    address = `http://${host}:${port}`;
  }

  return {
    address,
    close: () => {
      assetsCache.clear();
      server.unref();
      server.close();
    },
  };
}
function requestHandler(
  assetsReversed: Record<string, string>,
  assetsCache: Map<string, { mimeType: string | void; content: Buffer }>,
): RequestListener<typeof IncomingMessage, typeof ServerResponse> {
  return (req, res) => {
    if (!req.url) {
      res.destroy(new Error('Request url was empty.'));

      return;
    }

    const { pathname } = new URL(req.url, 'resolve://');
    const asset = assetsReversed[pathname];
    if (!asset) {
      res.statusCode = 404;
      res.statusMessage = 'Asset not found.';
      res.end();

      return;
    }

    const cachedAsset = assetsCache.get(pathname);
    if (cachedAsset) {
      const { content, mimeType } = cachedAsset;
      if (mimeType) {
        res.setHeader('Content-Type', mimeType);
      }

      res.end(content);

      return;
    }

    readFile(asset)
      .then((content) => {
        const extension = extname(pathname);
        const mimeType = lookupMimeType(extension);

        assetsCache.set(pathname, {
          mimeType,
          content,
        });

        if (mimeType) {
          res.setHeader('Content-Type', mimeType);
        }

        res.end(content);
      })
      .catch((e) => res.destroy(e));
  };
}

function addLeadingSlash(value: string): string {
  return value.charAt(0) === '/' ? value : '/' + value;
}
