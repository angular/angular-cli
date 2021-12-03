/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { ParsedConfiguration } from '@angular/compiler-cli';
import * as path from 'path';
import { loadEsmModule } from './load-esm';

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

  // Load ESM `@angular/compiler-cli` using the TypeScript dynamic import workaround.
  // Once TypeScript provides support for keeping the dynamic import this workaround can be
  // changed to a direct dynamic import.
  const { formatDiagnostics, readConfiguration } = await loadEsmModule<
    typeof import('@angular/compiler-cli')
  >('@angular/compiler-cli');

  const configResult = readConfiguration(tsConfigFullPath);
  if (configResult.errors && configResult.errors.length) {
    throw new Error(formatDiagnostics(configResult.errors));
  }

  return configResult;
}
