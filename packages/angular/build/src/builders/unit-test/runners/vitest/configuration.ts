/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * This file contains utility functions for finding the Vitest base configuration file.
 */

import { readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * A list of potential Vitest configuration filenames.
 * The order of the files is important as the first one found will be used.
 */
const POTENTIAL_CONFIGS = [
  'vitest-base.config.ts',
  'vitest-base.config.mts',
  'vitest-base.config.cts',
  'vitest-base.config.js',
  'vitest-base.config.mjs',
  'vitest-base.config.cjs',
];

/**
 * Finds the Vitest configuration file in the given search directories.
 *
 * @param searchDirs An array of directories to search for the configuration file.
 * @returns The path to the configuration file, or `false` if no file is found.
 * Returning `false` is used to disable Vitest's default configuration file search.
 */
export async function findVitestBaseConfig(searchDirs: string[]): Promise<string | false> {
  const uniqueDirs = new Set(searchDirs);
  for (const dir of uniqueDirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      const files = new Set(entries.filter((e) => e.isFile()).map((e) => e.name));

      for (const potential of POTENTIAL_CONFIGS) {
        if (files.has(potential)) {
          return path.join(dir, potential);
        }
      }
    } catch {
      // Ignore directories that cannot be read
    }
  }

  return false;
}
