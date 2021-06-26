/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { existsSync, rmdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Delete an output directory, but error out if it's the root of the project.
 */
export function deleteOutputDir(root: string, outputPath: string): void {
  const resolvedOutputPath = resolve(root, outputPath);
  if (resolvedOutputPath === root) {
    throw new Error('Output path MUST not be project root directory!');
  }

  // NOTE: `recursive: true` does not silence errors about existence on node
  //       v16. `rmdirSync` recursive is deprecated and when node v14.14.0 is
  //       the default `rmSync` should be used with `force: true` in addition
  //       to the existing options.
  if (existsSync(resolvedOutputPath)) {
    rmdirSync(resolvedOutputPath, { recursive: true, maxRetries: 3 });
  }
}
