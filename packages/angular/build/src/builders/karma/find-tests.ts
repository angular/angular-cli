/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { findTests as findTestsBase } from '../unit-test/test-discovery';

// This file is a compatibility layer that re-exports the test discovery logic from its new location.
// This is necessary to avoid breaking the Karma builder, which still depends on this file.
export { getTestEntrypoints } from '../unit-test/test-discovery';

const removeLeadingSlash = (path: string): string => {
  return path.startsWith('/') ? path.substring(1) : path;
};

export async function findTests(
  include: string[],
  exclude: string[],
  workspaceRoot: string,
  projectSourceRoot: string,
): Promise<string[]> {
  // Karma has legacy support for workspace "root-relative" file paths
  return findTestsBase(
    include.map(removeLeadingSlash),
    exclude.map(removeLeadingSlash),
    workspaceRoot,
    projectSourceRoot,
  );
}
