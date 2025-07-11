/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { posix } from 'node:path';
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
