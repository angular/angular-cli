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
export const DEFAULT_ASSET_IGNORE = ['.gitkeep', '**/.DS_Store', '**/Thumbs.db'] as const;

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
        try {
          const stats = await (entry.followSymlinks ? stat(src) : lstat(src));
          if (stats.isFile()) {
            const filePath = entry.flatten ? path.basename(entry.glob) : entry.glob;

            return [{ source: src, destination: path.join(entry.output, filePath) }];
          }
        } catch {
          // File does not exist or cannot be accessed.
        }

        return [];
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
      destination: path.join(entry.output, entry.flatten ? path.basename(file) : file),
    }));
  });

  return resolvedEntries.flat();
}
