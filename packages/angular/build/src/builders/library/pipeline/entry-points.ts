/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { toPosixPath } from '../../../utils/path';

export interface NormalizedEntryPoint {
  /** The subpath in package.json exports (e.g. '.' or './testing'). */
  subpath: string;

  /** Subpath name without leading './' (e.g. '.' or 'testing'). */
  name: string;

  /** Display name of the entry point (e.g. '@my/lib' or '@my/lib/testing'). */
  displayName: string;

  /** Base name of the output bundle (e.g. 'my-lib' or 'my-lib-testing'). */
  bundleName: string;

  /** Absolute path to entry file. */
  entryFilePath: string;

  /** Is this the primary entry point ('.')? */
  isPrimary: boolean;
}

/**
 * Function that resolves a file path to its containing normalized library entry point, if any.
 */
export type EntryPointLookup = (filePath: string) => NormalizedEntryPoint | undefined;

/**
 * Creates an optimized, memoized lookup function that maps arbitrary file paths
 * to their closest containing library entry point.
 *
 * Entry point root directories are sorted in descending order of path length so that
 * more specific, nested sub-entry points take precedence over shallower or primary
 * entry points. Lookups are cached to avoid repeated path scanning.
 *
 * @example
 * Given two entry points:
 * - Primary entry point `.` at `/project/src/public-api.ts` (dir: `/project/src`)
 * - Secondary entry point `./testing` at `/project/src/testing/public-api.ts` (dir: `/project/src/testing`)
 *
 * ```ts
 * const findEntryPoint = createEntryDirectoryLookup(entryPoints);
 *
 * // Resolves to the 'testing' sub-entry point because /project/src/testing is the longest matching prefix:
 * findEntryPoint('/project/src/testing/test-bed.ts'); // -> NormalizedEntryPoint ('./testing')
 *
 * // Resolves to the primary entry point:
 * findEntryPoint('/project/src/button.ts'); // -> NormalizedEntryPoint ('.')
 *
 * // Returns undefined for files located outside any entry point directory:
 * findEntryPoint('/project/shared/utils.ts'); // -> undefined
 * ```
 *
 * @param entryPoints Iterable of normalized entry points.
 * @returns An {@link EntryPointLookup} function that returns the owning {@link NormalizedEntryPoint},
 * or `undefined` if the file does not belong to any entry point directory.
 */
export function createEntryDirectoryLookup(
  entryPoints: Iterable<NormalizedEntryPoint>,
): EntryPointLookup {
  const dirs = Array.from(entryPoints, (ep) => {
    const dir = toPosixPath(path.dirname(ep.entryFilePath));

    return {
      ep,
      dir,
      dirSlash: dir.endsWith('/') ? dir : `${dir}/`,
    };
  }).sort((a, b) => b.dir.length - a.dir.length);

  const cache = new Map<string, NormalizedEntryPoint | undefined>();

  return (filePath: string): NormalizedEntryPoint | undefined => {
    const posix = toPosixPath(filePath);
    const cached = cache.get(posix);
    if (cached !== undefined || cache.has(posix)) {
      return cached;
    }
    const found = dirs.find(({ dir, dirSlash }) => posix === dir || posix.startsWith(dirSlash))?.ep;
    cache.set(posix, found);

    return found;
  };
}

/**
 * Computes the base bundle file name for an entry point.
 *
 * @param packageName The package name from package.json.
 * @param entryPointName The entry point subpath name (defaults to '.').
 * @returns The sanitized bundle base name.
 */
export function getEntryPointBundleName(packageName: string, entryPointName = '.'): string {
  const isPrimary = !entryPointName || entryPointName === '.';
  const pkgName = packageName[0] === '@' ? packageName.slice(1) : packageName;
  const epName = isPrimary ? pkgName : `${pkgName}-${entryPointName}`;

  return epName.replaceAll('/', '-');
}
