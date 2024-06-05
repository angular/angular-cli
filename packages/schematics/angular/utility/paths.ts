/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join, relative } from 'node:path/posix';

export function relativePathToWorkspaceRoot(projectRoot: string | undefined): string {
  if (!projectRoot) {
    return '.';
  }

  return relative(join('/', projectRoot), '/') || '.';
}
