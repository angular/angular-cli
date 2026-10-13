/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { constants, cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { runConcurrent } from './concurrency';

/**
 * Maximum number of concurrent file system write/copy operations to avoid open file descriptor exhaustion.
 */
const MAX_CONCURRENT_WRITES = 64;

/**
 * Represents a file that can be emitted to disk from memory or copied from an existing path on disk.
 */
export type EmittableFile =
  { origin: 'memory'; contents: string | Uint8Array } | { origin: 'disk'; source: string };

/**
 * Writes or copies a collection of files to disk with bounded concurrency,
 * ensuring parent directories are created once per invocation.
 *
 * @param files The collection of files to emit.
 * @param resolveDestinationPath Callback returning the absolute destination path for a file, or `undefined` to skip it.
 */
export async function emitFilesToDisk<T extends EmittableFile = EmittableFile>(
  files: readonly T[],
  resolveDestinationPath: (file: T) => string | undefined,
): Promise<void> {
  if (files.length === 0) {
    return;
  }

  const directoryCreationPromises = new Map<string, Promise<string | undefined>>();

  await runConcurrent(files, MAX_CONCURRENT_WRITES, async (file) => {
    const fullFilePath = resolveDestinationPath(file);
    if (!fullFilePath) {
      return;
    }

    // Ensure output subdirectories exist
    const fileBasePath = dirname(fullFilePath);
    if (fileBasePath) {
      let mkdirPromise = directoryCreationPromises.get(fileBasePath);
      if (!mkdirPromise) {
        mkdirPromise = mkdir(fileBasePath, { recursive: true });
        directoryCreationPromises.set(fileBasePath, mkdirPromise);
      }
      await mkdirPromise;
    }

    if (file.origin === 'memory') {
      // Write file contents
      await writeFile(fullFilePath, file.contents);

      return;
    }

    // Copy file contents
    await cp(file.source, fullFilePath, {
      mode: constants.COPYFILE_FICLONE,
      preserveTimestamps: true,
    });
  });
}
