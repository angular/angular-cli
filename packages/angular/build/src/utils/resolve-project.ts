/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createRequire } from 'node:module';
import { join } from 'node:path';

/**
 * Creates a module resolver function that is strictly scoped to the project root.
 * This prevents module resolution from leaking the parent module context when executing inside virtual stores (like pnpm).
 *
 * @param projectRoot The root directory of the project.
 * @returns A resolver function that takes a package name/path and returns its resolved path.
 */
export function createProjectResolver(projectRoot: string): (packageName: string) => string {
  const projectRequire = createRequire(join(projectRoot, 'package.json'));

  return (packageName: string) => projectRequire.resolve(packageName, { paths: [projectRoot] });
}
