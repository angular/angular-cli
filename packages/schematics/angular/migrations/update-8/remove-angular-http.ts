/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { removePackageJsonDependency } from '../../utility/dependencies';

export const removeAngularHttp = () => {
  return (host: Tree, context: SchematicContext) => {
    removePackageJsonDependency(host, '@angular/http');
    context.addTask(new NodePackageInstallTask());

    return host;
  };
};
