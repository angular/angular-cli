/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lstat, stat } from 'node:fs/promises';
import path from 'node:path';
import { glob, isDynamicPattern } from 'tinyglobby';
import { MAX_CONCURRENT_READS, mapConcurrent } from './concurrency';
import { isSubDirectory } from './path';

/**
 * Default glob ignore patterns for assets.
 */
export const DEFAULT_ASSET_IGNORE = ['**/.gitkeep', '**/.DS_Store', '**/Thumbs.db'] as const;

function resolveDestination(output: string, file: string, flatten?: boolean): string {
  const destination = path.join(output, flatten ? path.basename(file) : file);
  if (
    path.isAbsolute(destination) ||
    destination === '..' ||
    destination.startsWith(`..${path.sep}`)
  ) {
    throw new Error('An asset cannot be written to a location outside of the output path.');
  }

  return destination;
}

export async function resolveAssets(
  entries: {
    glob: string;
    ignore?: string[];
    input: string;
    output: string;
    flatten?: boolean;
    followSymlinks?: boolean;
  }[],
  root: string,
): Promise<{ source: string; destination: string }[]> {
  const resolvedEntries = await mapConcurrent(entries, MAX_CONCURRENT_READS, async (entry) => {
    if (!isSubDirectory(root, entry.input)) {
      throw new Error(`The ${entry.input} asset path must be within the workspace root.`);
    }

    const cwd = path.resolve(root, entry.input);

    if (!entry.ignore?.length && !isDynamicPattern(entry.glob)) {
      const src = path.join(cwd, entry.glob);
      if (isSubDirectory(cwd, src)) {
        let stats;
        try {
          stats = await (entry.followSymlinks ? stat(src) : lstat(src));
        } catch {
          // File does not exist or cannot be accessed.
          return [];
        }

        if (stats.isFile()) {
          return [
            {
              source: src,
              destination: resolveDestination(entry.output, entry.glob, entry.flatten),
            },
          ];
        }

        if (!stats.isSymbolicLink()) {
          return [];
        }
      }
    }

    const files = await glob(entry.glob, {
      cwd,
      dot: true,
      ignore: entry.ignore ? [...DEFAULT_ASSET_IGNORE, ...entry.ignore] : DEFAULT_ASSET_IGNORE,
      followSymbolicLinks: entry.followSymlinks ?? false,
    });

    return files.map((file) => ({
      source: path.join(cwd, file),
      destination: resolveDestination(entry.output, file, entry.flatten),
    }));
  });

  return resolvedEntries.flat();
}
