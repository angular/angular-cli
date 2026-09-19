/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { TextDecoder } from 'node:util';

let textDecoder: TextDecoder | undefined;
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
 * Computes the base bundle file name for an entry point.
 *
 * @param packageName The package name from package.json.
 * @param entryPointName The entry point subpath name.
 * @param isPrimary Whether this is the primary entry point.
 * @returns The sanitized bundle base name.
 */
export function getEntryPointBundleName(
  packageName: string,
  entryPointName: string,
  isPrimary: boolean,
): string {
  const pkgName = packageName[0] === '@' ? packageName.slice(1) : packageName;
  const epName = isPrimary ? pkgName : `${pkgName}-${entryPointName}`;

  return epName.replaceAll('/', '-');
}

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
  destination: string;
}

/**
 * Represents a file to be emitted to disk, either from memory or copied from disk.
 */
export type OutputFile = MemoryOutputFile | DiskOutputFile;

/**
 * Creates an output file descriptor for an existing file on disk.
 *
 * @param source The path to the source file on disk.
 * @param destination The destination path where the file should be copied.
 * @returns A {@link DiskOutputFile} descriptor.
 */
export function createDiskOutputFile(source: string, destination: string): DiskOutputFile {
  return {
    type: 'disk',
    source,
    destination,
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
 * Gets the text content of a file.
 */
export function getFileText(contents: string | Uint8Array): string {
  if (typeof contents === 'string') {
    return contents;
  }

  textDecoder ??= new TextDecoder();

  return textDecoder.decode(contents);
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
