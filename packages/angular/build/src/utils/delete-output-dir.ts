/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readdir, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

/**
 * Delete an output directory, but error out if it's the root of the project or outside it.
 */
export async function deleteOutputDir(
  root: string,
  outputPath: string,
  emptyOnlyDirectories?: string[],
): Promise<void> {
  const resolvedRoot = resolve(root);
  const resolvedOutputPath = resolve(root, outputPath);
  if (resolvedOutputPath === resolvedRoot) {
    throw new Error('Output path MUST not be project root directory!');
  }
  if (!resolvedOutputPath.startsWith(resolvedRoot + sep)) {
    throw new Error(
      `Output path '${resolvedOutputPath}' MUST be inside the project root '${resolvedRoot}'.`,
    );
  }

  const directoriesToEmpty = emptyOnlyDirectories
    ? new Set(emptyOnlyDirectories.map((directory) => join(resolvedOutputPath, directory)))
    : undefined;

  // Avoid removing the actual directory to avoid errors in cases where the output
  // directory is mounted or symlinked. Instead the contents are removed.
  let entries;
  try {
    entries = await readdir(resolvedOutputPath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const fullEntry = join(resolvedOutputPath, entry);

    // Leave requested directories. This allows symlinks to continue to function.
    if (directoriesToEmpty?.has(fullEntry)) {
      await deleteOutputDir(resolvedOutputPath, fullEntry);
      continue;
    }

    await rm(fullEntry, { force: true, recursive: true, maxRetries: 3 });
  }
}
