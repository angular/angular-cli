/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import Module from 'node:module';
import path from 'node:path';

// Resolve dependencies from packages/angular/build/node_modules for runtime resolution in dist/
const buildNodeModules = path.resolve(
  import.meta.dirname,
  '../../../packages/angular/build/node_modules',
);

const currentPath = process.env.NODE_PATH ?? '';
if (!currentPath.includes(buildNodeModules)) {
  process.env.NODE_PATH = currentPath
    ? `${buildNodeModules}${path.delimiter}${currentPath}`
    : buildNodeModules;
  // Initialize internal search paths for Node CommonJS loader
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Module as any)._initPaths?.();
}
