/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// resolve dependencies within the target project
export function resolveProjectModule(root: string, moduleName: string) {
  return require.resolve(moduleName, { paths: [root] });
}

// require dependencies within the target project
export function requireProjectModule(root: string, moduleName: string) {
  return require(resolveProjectModule(root, moduleName));
}
