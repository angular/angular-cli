/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Tree } from '@angular-devkit/schematics';
import { removePackageJsonDependency } from '../../utility/dependencies';

export const removeAngularHttp = () => {
  return (host: Tree) => {
    removePackageJsonDependency(host, '@angular/http');
  };
};
