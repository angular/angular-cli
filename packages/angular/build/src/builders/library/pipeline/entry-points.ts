/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

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
