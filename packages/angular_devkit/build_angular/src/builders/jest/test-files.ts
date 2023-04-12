/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { IOptions as GlobOptions, glob as globCb } from 'glob';
import { promisify } from 'util';
import { JestBuilderOptions } from './options';

const globAsync = promisify(globCb);

/**
 * Finds all test files in the project.
 *
 * @param options The builder options describing where to find tests.
 * @param workspaceRoot The path to the root directory of the workspace.
 * @param glob A promisified implementation of the `glob` module. Only intended for
 *     testing purposes.
 * @returns A set of all test files in the project.
 */
export async function findTestFiles(
  options: JestBuilderOptions,
  workspaceRoot: string,
  glob: typeof globAsync = globAsync,
): Promise<Set<string>> {
  const globOptions: GlobOptions = {
    cwd: workspaceRoot,
    ignore: ['node_modules/**'].concat(options.exclude),
    strict: true, // Fail on an "unusual error" when reading the file system.
    nobrace: true, // Do not expand `a{b,c}` to `ab,ac`.
    noext: true, // Disable "extglob" patterns.
    nodir: true, // Match only files, don't care about directories.
  };

  const included = await Promise.all(options.include.map((pattern) => glob(pattern, globOptions)));

  // Flatten and deduplicate any files found in multiple include patterns.
  return new Set(included.flat());
}
