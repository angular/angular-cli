/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';

/**
 * Normalize a directory path string.
 * Currently only removes a trailing slash if present.
 * @param path A path string.
 * @returns A normalized path string.
 */
export function normalizeDirectoryPath(path: string): string {
  const last = path[path.length - 1];
  if (last === '/' || last === '\\') {
    return path.slice(0, -1);
  }

  return path;
}

export function getProjectRootPaths(
  workspaceRoot: string,
  projectMetadata: { root?: string; sourceRoot?: string },
) {
  const projectRoot = normalizeDirectoryPath(join(workspaceRoot, projectMetadata.root ?? ''));
  const rawSourceRoot = projectMetadata.sourceRoot;
  const projectSourceRoot = normalizeDirectoryPath(
    rawSourceRoot === undefined ? join(projectRoot, 'src') : join(workspaceRoot, rawSourceRoot),
  );

  return { projectRoot, projectSourceRoot };
}
