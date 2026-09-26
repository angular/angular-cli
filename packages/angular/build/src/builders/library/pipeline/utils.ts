/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { toPosixPath } from '../../../utils/path';
import type { NormalizedEntryPoint } from '../options';

const IS_DTS_FILE_REGEXP = /\.d\.[cm]?ts$/i;
const IS_DTS_MAP_FILE_REGEXP = /\.d\.[cm]?ts\.map$/i;

/**
 * The output directory name for ES module format output files.
 */
export const FESM_OUTPUT_DIR = 'fesm2022';

/**
 * The output directory name for TypeScript declaration files output.
 */
export const TYPES_OUTPUT_DIR = 'types';

/**
 * Function that resolves a file path to its containing normalized library entry point, if any.
 */
export type EntryPointLookup = (filePath: string) => NormalizedEntryPoint | undefined;

/**
 * Represents an in-memory file to be emitted to disk.
 */
export interface MemoryOutputFile {
  type: 'memory';

  /** The destination path where the file should be written. */
  path: string;

  /** The contents of the file as either a string or byte array. */
  contents: string | Uint8Array;
}

/**
 * Represents an existing file on disk to be copied to a destination path.
 */
export interface DiskOutputFile {
  type: 'disk';

  /** The path to the source file on disk. */
  source: string;

  /** The destination path where the file should be copied. */
  path: string;
}

/**
 * Represents a file to be emitted to disk, either from memory or copied from disk.
 */
export type OutputFile = MemoryOutputFile | DiskOutputFile;

/**
 * Creates an output file descriptor for an existing file on disk.
 *
 * @param source The path to the source file on disk.
 * @param path The destination path where the file should be copied.
 * @returns A {@link DiskOutputFile} descriptor.
 */
export function createDiskOutputFile(source: string, path: string): DiskOutputFile {
  return {
    type: 'disk',
    source,
    path,
  };
}

/**
 * Creates an output file descriptor for an in-memory file.
 *
 * @param path The destination path where the file should be written.
 * @param contents The contents of the file as either a string, byte array, or JSON object.
 * @returns A {@link MemoryOutputFile} descriptor.
 */
export function createMemoryOutputFile(
  path: string,
  contents: string | Uint8Array | Record<string, unknown>,
): MemoryOutputFile {
  return {
    type: 'memory',
    path,
    contents:
      typeof contents === 'string' || contents instanceof Uint8Array
        ? contents
        : JSON.stringify(contents, null, 2) + '\n',
  };
}

/**
 * Determines whether a file path represents a TypeScript declaration file (`.d.ts`, `.d.mts`, or `.d.cts`).
 *
 * @param path The file path to check.
 * @returns True if the path ends with `.d.ts`, `.d.mts`, or `.d.cts`.
 */
export function isDeclarationFile(path: string): boolean {
  return IS_DTS_FILE_REGEXP.test(path);
}

/**
 * Determines whether a file path represents a declaration source map file (`.d.ts.map`, `.d.mts.map`, or `.d.cts.map`).
 *
 * @param path The file path to check.
 * @returns True if the path ends with `.d.ts.map`, `.d.mts.map`, or `.d.cts.map`.
 */
export function isDeclarationSourceMapFile(path: string): boolean {
  return IS_DTS_MAP_FILE_REGEXP.test(path);
}

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
