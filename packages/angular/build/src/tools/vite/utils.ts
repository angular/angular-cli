/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lookup as lookupMimeType } from 'mrmime';
import { extname } from 'node:path';

export type AngularMemoryOutputFiles = Map<
  string,
  { contents: Uint8Array; hash: string; servable: boolean }
>;

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
