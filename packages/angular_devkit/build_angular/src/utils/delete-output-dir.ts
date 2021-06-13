/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { rmdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Delete an output directory, but error out if it's the root of the project.
 */
export function deleteOutputDir(root: string, outputPath: string): void {
  const resolvedOutputPath = resolve(root, outputPath);
  if (resolvedOutputPath === root) {
    throw new Error('Output path MUST not be project root directory!');
  }

  rmdirSync(resolvedOutputPath, { recursive: true, maxRetries: 3 });
}
