/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { globSync } from 'tinyglobby';

export function createInstrumentationFilter(includedBasePath: string, excludedPaths: Set<string>) {
  return (request: string): boolean => {
    return (
      !excludedPaths.has(request) &&
      !/\.(e2e|spec)\.tsx?$|[\\/]node_modules[\\/]/.test(request) &&
      request.startsWith(includedBasePath)
    );
  };
}

export function getInstrumentationExcludedPaths(
  root: string,
  excludedPaths: string[],
): Set<string> {
  const excluded = new Set<string>();

  for (const excludeGlob of excludedPaths) {
    const excludePath = excludeGlob[0] === '/' ? excludeGlob.slice(1) : excludeGlob;
    globSync(excludePath, { cwd: root }).forEach((p) => excluded.add(path.join(root, p)));
  }

  return excluded;
}
