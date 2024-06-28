/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lookup as lookupMimeType } from 'mrmime';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname } from 'node:path';
import type { ViteDevServer } from 'vite';

export type AngularMemoryOutputFiles = Map<string, { contents: Uint8Array; servable: boolean }>;

export function pathnameWithoutBasePath(url: string, basePath: string): string {
  const parsedUrl = new URL(url, 'http://localhost');
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // slice(basePath.length - 1) to retain the trailing slash
  return basePath !== '/' && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length - 1)
    : pathname;
}

export function lookupMimeTypeFromRequest(url: string): string | undefined {
  const extension = extname(url.split('?')[0]);

  if (extension === '.ico') {
    return 'image/x-icon';
  }

  return extension && lookupMimeType(extension);
}

export function appendServerConfiguredHeaders(
  server: ViteDevServer,
  res: ServerResponse<IncomingMessage>,
): void {
  const headers = server.config.server.headers;
  if (!headers) {
    return;
  }

  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) {
      res.setHeader(name, value);
    }
  }
}
