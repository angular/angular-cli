/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { GlobOptions, glob as globFn } from 'tinyglobby';

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
  include: string[],
  exclude: string[],
  workspaceRoot: string,
  glob: typeof globFn = globFn,
): Promise<Set<string>> {
  const globOptions: GlobOptions = {
    cwd: workspaceRoot,
    ignore: ['node_modules/**'].concat(exclude),
    braceExpansion: false, // Do not expand `a{b,c}` to `ab,ac`.
    extglob: false, // Disable "extglob" patterns.
  };

  const included = await Promise.all(include.map((pattern) => glob(pattern, globOptions)));

  // Flatten and deduplicate any files found in multiple include patterns.
  return new Set(included.flat());
}
