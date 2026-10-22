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

const DEFAULT_ASSET_IGNORE_FILES: ReadonlySet<string> = new Set([
  '.gitkeep',
  '.DS_Store',
  'Thumbs.db',
]);
const DEFAULT_ASSET_IGNORE_PATTERNS: readonly string[] = Array.from(
  DEFAULT_ASSET_IGNORE_FILES,
  (file) => `**/${file}`,
);

/**
 * Normalizes an ignore glob pattern to match directory-exclusion semantics by stripping
 * trailing slashes, normalizing POSIX segments, and expanding patterns with `/**`
 * (returning both `normalized` and `${normalized}/**` for single-wildcard suffixes
 * because `picomatch` does not make trailing `/**` optional after `*`).
 *
 * @param pattern The raw ignore glob pattern string.
 * @returns The normalized POSIX glob patterns.
 */
function normalizeIgnorePattern(pattern: string): string[] {
  if (!pattern) {
    return [];
  }

  const posixNormalized = path.posix.normalize(pattern);
  const normalized =
    posixNormalized.length > 1 && posixNormalized.endsWith('/')
      ? posixNormalized.slice(0, -1)
      : posixNormalized;

  if (!normalized.endsWith('*')) {
    return [`${normalized}/**`];
  }

  if (normalized === '**' || normalized.endsWith('/**')) {
    return [normalized];
  }

  return [normalized, `${normalized}/**`];
}

/**
 * Combines default asset ignore patterns with user-provided ignore patterns and normalizes
 * them so directory patterns (such as `'sub'` or `'sub/'`) exclude all nested files.
 *
 * @param ignore Optional user-provided ignore glob patterns.
 * @returns The normalized ignore glob patterns.
 */
export function normalizeAssetIgnorePatterns(ignore?: readonly string[]): string[] {
  if (!ignore?.length) {
    return [...DEFAULT_ASSET_IGNORE_PATTERNS];
  }

  return [
    ...DEFAULT_ASSET_IGNORE_PATTERNS,
    ...ignore.flatMap((pattern) => normalizeIgnorePattern(pattern)),
  ];
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

    if (!entry.glob || entry.glob.endsWith('/')) {
      return [];
    }

    const cwd = path.resolve(root, entry.input);

    if (!entry.ignore?.length && !isDynamicPattern(entry.glob)) {
      const src = path.join(cwd, entry.glob);
      if (isSubDirectory(cwd, src)) {
        if (DEFAULT_ASSET_IGNORE_FILES.has(path.basename(src))) {
          return [];
        }

        try {
          const stats = await (entry.followSymlinks ? stat(src) : lstat(src));
          if (stats.isFile()) {
            const filePath = entry.flatten ? path.basename(src) : path.relative(cwd, src);

            return [{ source: src, destination: path.join(entry.output, filePath) }];
          }

          return [];
        } catch {
          // File does not exist or cannot be accessed.
          return [];
        }
      }
    }

    const files = await glob(entry.glob, {
      cwd,
      dot: true,
      expandDirectories: false,
      ignore: normalizeAssetIgnorePatterns(entry.ignore),
      followSymbolicLinks: entry.followSymlinks ?? false,
    });

    return files.map((file) => {
      const destination = path.join(entry.output, entry.flatten ? path.basename(file) : file);
      if (destination === '..' || destination.startsWith(`..${path.sep}`)) {
        throw new Error('An asset cannot be written to a location outside of the output path.');
      }

      return {
        source: path.join(cwd, file),
        destination,
      };
    });
  });

  return resolvedEntries.flat();
}
