/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { realpath } from 'node:fs/promises';
import { isAbsolute, normalize, posix, relative, resolve } from 'node:path';
import { platform } from 'node:process';

const WINDOWS_PATH_SEPERATOR_REGEXP = /\\/g;

/**
 * Converts a Windows-style file path to a POSIX-compliant path.
 *
 * This function replaces all backslashes (`\`) with forward slashes (`/`).
 * It is a no-op on POSIX systems (e.g., Linux, macOS), as the conversion
 * only runs on Windows (`win32`).
 *
 * @param path - The file path to convert.
 * @returns The POSIX-compliant file path.
 *
 * @example
 * ```ts
 * // On a Windows system:
 * toPosixPath('C:\\Users\\Test\\file.txt');
 * // => 'C:/Users/Test/file.txt'
 *
 * // On a POSIX system (Linux/macOS):
 * toPosixPath('/home/user/file.txt');
 * // => '/home/user/file.txt'
 * ```
 */
export function toPosixPath(path: string): string {
  return platform === 'win32' ? path.replace(WINDOWS_PATH_SEPERATOR_REGEXP, posix.sep) : path;
}

/**
 * Determines if a path is a subdirectory or file within a parent directory.
 *
 * @param parent - The parent directory path.
 * @param child - The child path to check.
 * @returns `true` if the child path is within the parent directory, `false` otherwise.
 */
export function isSubDirectory(parent: string, child: string): boolean {
  const resolvedParent = resolve(parent);
  const resolvedChild = resolve(parent, child);
  const relativePath = toPosixPath(relative(resolvedParent, resolvedChild));

  return relativePath !== '..' && !relativePath.startsWith('../') && !isAbsolute(relativePath);
}

/**
 * Determines if a path points into an installed dependency, that is, if it goes through a
 * `node_modules` directory.
 *
 * A package manager links dependencies to wherever it stores them, which for a pnpm or npm
 * workspace is the repository root rather than the workspace being built. Those links are
 * created by the tool, so a path that asks for one is allowed to resolve outside of the
 * workspace root, while a path into the project's own sources is not.
 *
 * @param pathString - The path to check, as it was configured.
 * @returns `true` if the path goes through a `node_modules` directory, `false` otherwise.
 */
export function isDependencyPath(pathString: string): boolean {
  return toPosixPath(normalize(pathString)).split(posix.sep).includes('node_modules');
}

/**
 * Resolves a path to its real location on disk, following any symbolic links.
 *
 * @param pathString - The file path to resolve.
 * @returns The canonicalized real path, or `undefined` when the path cannot be resolved,
 * for instance because it does not exist.
 */
export async function resolveRealPath(pathString: string): Promise<string | undefined> {
  try {
    return canonicalizePath(await realpath(pathString));
  } catch {
    return undefined;
  }
}

/**
 * Canonicalizes a file path by normalising Windows drive-letter casing to uppercase.
 *
 * @param pathString - The file path to canonicalize.
 * @returns The canonicalized file path.
 */
export function canonicalizePath(pathString: string): string {
  if (platform === 'win32' && /^[a-z]:/.test(pathString)) {
    return pathString[0].toUpperCase() + pathString.slice(1);
  }

  return pathString;
}
