/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'node:fs/promises';
import path from 'node:path';
import { ResultFile } from '../builders/application/results';
import { BuildOutputFileType } from '../tools/esbuild/bundler-context';
import { emitFilesToDisk } from '../tools/esbuild/utils';

/**
 * Writes a collection of build result files to a specified directory.
 * This function handles both in-memory and on-disk files, creating subdirectories
 * as needed.
 *
 * @param files A map of file paths to `ResultFile` objects, representing the build output.
 * @param testDir The absolute path to the directory where the files should be written.
 */
export async function writeTestFiles(
  files: Record<string, ResultFile>,
  testDir: string,
): Promise<void> {
  const directoryExists = new Set<string>();
  // Writes the test related output files to disk and ensures the containing directories are present
  await emitFilesToDisk(Object.entries(files), async ([filePath, file]) => {
    if (file.type !== BuildOutputFileType.Browser && file.type !== BuildOutputFileType.Media) {
      return;
    }

    const fullFilePath = path.join(testDir, filePath);

    // Ensure output subdirectories exist
    const fileBasePath = path.dirname(fullFilePath);
    if (fileBasePath && !directoryExists.has(fileBasePath)) {
      await fs.mkdir(fileBasePath, { recursive: true });
      directoryExists.add(fileBasePath);
    }

    if (file.origin === 'memory') {
      // Write file contents
      await fs.writeFile(fullFilePath, file.contents);
    } else {
      // Copy file contents
      await fs.copyFile(file.inputPath, fullFilePath, fs.constants.COPYFILE_FICLONE);
    }
  });
}
