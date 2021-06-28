/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import { resolve } from 'path';

/**
 * Delete an output directory, but error out if it's the root of the project.
 */
export function deleteOutputDir(root: string, outputPath: string): void {
  const resolvedOutputPath = resolve(root, outputPath);
  if (resolvedOutputPath === root) {
    throw new Error('Output path MUST not be project root directory!');
  }

  // The below should be removed and replace with just `rmSync` when support for Node.Js 12 is removed.
  const { rmSync, rmdirSync } = fs as typeof fs & {
    rmSync?: (
      path: fs.PathLike,
      options?: {
        force?: boolean;
        maxRetries?: number;
        recursive?: boolean;
        retryDelay?: number;
      },
    ) => void;
  };

  if (rmSync) {
    rmSync(resolvedOutputPath, { force: true, recursive: true, maxRetries: 3 });
  } else {
    rmdirSync(resolvedOutputPath, { recursive: true, maxRetries: 3 });
  }
}
