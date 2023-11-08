/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import { join, resolve } from 'path';

/**
 * Delete an output directory, but error out if it's the root of the project.
 */
export function deleteOutputDir(root: string, outputPath: string): void {
  const resolvedOutputPath = resolve(root, outputPath);
  if (resolvedOutputPath === root) {
    throw new Error('Output path MUST not be project root directory!');
  }

  // Avoid removing the actual directory to avoid errors in cases where the output
  // directory is mounted or symlinked. Instead the contents are removed.
  let entries;
  try {
    entries = fs.readdirSync(resolvedOutputPath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    fs.rmSync(join(resolvedOutputPath, entry), { force: true, recursive: true, maxRetries: 3 });
  }
}
