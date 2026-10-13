/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { ResultFile } from '../builders/application/results';
import { BuildOutputFileType } from '../tools/esbuild/bundler-files';
import { emitFilesToDisk } from './emit-files-to-disk';

/**
 * Writes a collection of build result files to a specified directory.
 * This function handles both in-memory and on-disk files, creating subdirectories
 * as needed.
 *
 * @param files A collection of `ResultFile` objects, representing the build output.
 * @param testDir The absolute path to the directory where the files should be written.
 */
export function writeTestFiles(files: readonly ResultFile[], testDir: string): Promise<void> {
  // Writes the test related output files to disk and ensures the containing directories are present
  return emitFilesToDisk(files, (file) =>
    file.type === BuildOutputFileType.Browser || file.type === BuildOutputFileType.Media
      ? path.join(testDir, file.path)
      : undefined,
  );
}
