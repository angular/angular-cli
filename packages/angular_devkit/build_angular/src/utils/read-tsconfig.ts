/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ParsedConfiguration } from '@angular/compiler-cli';
import * as path from 'node:path';

/**
 * Reads and parses a given TsConfig file.
 *
 * @param tsconfigPath - An absolute or relative path from 'workspaceRoot' of the tsconfig file.
 * @param workspaceRoot - workspaceRoot root location when provided
 * it will resolve 'tsconfigPath' from this path.
 */
export async function readTsconfig(
  tsconfigPath: string,
  workspaceRoot?: string,
): Promise<ParsedConfiguration> {
  const tsConfigFullPath = workspaceRoot ? path.resolve(workspaceRoot, tsconfigPath) : tsconfigPath;

  const { formatDiagnostics, readConfiguration } = await import('@angular/compiler-cli');

  const configResult = readConfiguration(tsConfigFullPath);
  if (configResult.errors && configResult.errors.length) {
    throw new Error(formatDiagnostics(configResult.errors));
  }

  return configResult;
}
