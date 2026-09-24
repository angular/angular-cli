/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { realpathSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Resolves a path to its real location on disk, following any symbolic links.
 *
 * Returns `undefined` when the path cannot be resolved, for instance because it does
 * not exist.
 */
export function resolveRealPath(pathString: string): string | undefined {
  try {
    return realpathSync(pathString);
  } catch {
    return undefined;
  }
}

/**
 * Determines if a path is a subdirectory or file within a parent directory.
 */
export function isWithinDirectory(parent: string, child: string): boolean {
  const relativePath = path.relative(parent, child);

  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

/**
 * Determines if a path points into an installed dependency, that is, if it goes through a
 * `node_modules` directory.
 *
 * A package manager links dependencies to wherever it stores them, which for a pnpm or npm
 * workspace is the repository root rather than the workspace being built. Those links are
 * created by the tool, so a path that asks for one is allowed to resolve outside of the
 * workspace root, while a path into the project's own sources is not.
 */
export function isDependencyPath(pathString: string): boolean {
  return path.normalize(pathString).split(/[\\/]/).includes('node_modules');
}
