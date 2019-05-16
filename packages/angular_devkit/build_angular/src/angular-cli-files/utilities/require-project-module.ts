/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { resolve } from '@angular-devkit/core/node';

// Resolve dependencies within the target project.
export function resolveProjectModule(root: string, moduleName: string) {
  return resolve(
    moduleName,
    {
      basedir: root,
      checkGlobal: false,
      checkLocal: true,
    },
  );
}

// Require dependencies within the target project.
export function requireProjectModule(root: string, moduleName: string) {
  return require(resolveProjectModule(root, moduleName));
}
