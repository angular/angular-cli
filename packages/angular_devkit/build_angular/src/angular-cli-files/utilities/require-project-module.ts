/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

const resolve = require('resolve');

// Resolve dependencies within the target project.
export function resolveProjectModule(root: string, moduleName: string) {
  return resolve.sync(moduleName, { basedir: root });
}

// Require dependencies within the target project.
export function requireProjectModule(root: string, moduleName: string) {
  return require(resolveProjectModule(root, moduleName));
}
