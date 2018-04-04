/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const NodePackageName = 'node-package';

export interface NodePackageTaskFactoryOptions {
  rootDirectory?: string;
  packageManager?: string;
  allowPackageManagerOverride?: boolean;
}

export interface NodePackageTaskOptions {
  command: string;
  quiet?: boolean;
  workingDirectory?: string;
  packageName?: string;
  packageManager?: string;
}
