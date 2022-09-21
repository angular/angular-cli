/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

export function normalizePolyfills(
  polyfills: string[] | string | undefined,
  root: string,
): string[] {
  if (!polyfills) {
    return [];
  }

  const polyfillsList = Array.isArray(polyfills) ? polyfills : [polyfills];

  return polyfillsList.map((p) => {
    const resolvedPath = resolve(root, p);

    // If file doesn't exist, let the bundle resolve it using node module resolution.
    return existsSync(resolvedPath) ? resolvedPath : p;
  });
}
