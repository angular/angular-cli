/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addPackageJsonDependency, getPackageJsonDependency } from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';

export function updateDevkitBuildNgPackagr(): Rule {
  return (tree, context) => {
    const existing = getPackageJsonDependency(tree, '@angular-devkit/build-ng-packagr');

    if (!existing) {
      return;
    }

    addPackageJsonDependency(
      tree,
      {
        type: existing.type,
        name: '@angular-devkit/build-ng-packagr',
        version: latestVersions.DevkitBuildNgPackagr,
        overwrite: true,
      },
    );

    context.addTask(new NodePackageInstallTask());
  };
}
