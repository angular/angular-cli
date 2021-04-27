/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dirname, normalize, resolve } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';

export function isIvyEnabled(tree: Tree, tsConfigPath: string): boolean {
  // In version 9, Ivy is turned on by default
  // Ivy is opted out only when 'enableIvy' is set to false.

  let tsconfigJson;
  try {
    tsconfigJson = new JSONFile(tree, tsConfigPath);
  } catch {
    return true;
  }

  const enableIvy = tsconfigJson.get(['angularCompilerOptions', 'enableIvy']);

  if (enableIvy !== undefined) {
    return !!enableIvy;
  }

  const configExtends = tsconfigJson.get(['extends']);
  if (configExtends && typeof configExtends === 'string') {
    const extendedTsConfigPath = resolve(
      dirname(normalize(tsConfigPath)),
      normalize(configExtends),
    );

    return isIvyEnabled(tree, extendedTsConfigPath);
  }

  return true;
}

// TS represents paths internally with '/' and expects paths to be in this format.
// angular.json expects paths with '/', but doesn't enforce them.
export function forwardSlashPath(path: string) {
  return path.replace(/\\/g, '/');
}
