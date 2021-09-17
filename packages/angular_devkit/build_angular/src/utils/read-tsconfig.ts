/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { ParsedConfiguration } from '@angular/compiler-cli';
import * as path from 'path';

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

  // This uses a dynamic import to load `@angular/compiler-cli` which may be ESM.
  // CommonJS code can load ESM code via a dynamic import. Unfortunately, TypeScript
  // will currently, unconditionally downlevel dynamic import into a require call.
  // require calls cannot load ESM code and will result in a runtime error. To workaround
  // this, a Function constructor is used to prevent TypeScript from changing the dynamic import.
  // Once TypeScript provides support for keeping the dynamic import this workaround can
  // be dropped.
  const compilerCliModule = await new Function(`return import('@angular/compiler-cli');`)();
  // If it is not ESM then the functions needed will be stored in the `default` property.
  const { formatDiagnostics, readConfiguration } = (
    compilerCliModule.readConfiguration ? compilerCliModule : compilerCliModule.default
  ) as typeof import('@angular/compiler-cli');

  const configResult = readConfiguration(tsConfigFullPath);
  if (configResult.errors && configResult.errors.length) {
    throw new Error(formatDiagnostics(configResult.errors));
  }

  return configResult;
}
