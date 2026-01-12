/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/**
 * Find a file or directory by walking up the directory tree.
 * @param names The name or names of the files or directories to find.
 * @param from The directory to start the search from.
 * @returns The path to the first match found, or `null` if no match was found.
 */
export async function findUp(names: string | string[], from: string): Promise<string | null> {
  const filenames = Array.isArray(names) ? names : [names];

  let currentDir = resolve(from);
  while (true) {
    for (const name of filenames) {
      const p = join(currentDir, name);
      try {
        await stat(p);

        return p;
      } catch {
        // Ignore errors (e.g. file not found).
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}

/**
 * Synchronously find a file or directory by walking up the directory tree.
 * @param names The name or names of the files or directories to find.
 * @param from The directory to start the search from.
 * @returns The path to the first match found, or `null` if no match was found.
 */
export function findUpSync(names: string | string[], from: string): string | null {
  const filenames = Array.isArray(names) ? names : [names];

  let currentDir = resolve(from);
  while (true) {
    for (const name of filenames) {
      const p = join(currentDir, name);
      if (existsSync(p)) {
        return p;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}
