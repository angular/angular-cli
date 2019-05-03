/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { addPackageJsonDependency, getPackageJsonDependency } from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';

export function updateBuilders() {
  return (host: Tree, context: SchematicContext) => {
    let updates = false;

    let current = getPackageJsonDependency(host, '@angular-devkit/build-angular');
    if (current && current.version !== latestVersions.DevkitBuildAngular) {
      updates = true;
      addPackageJsonDependency(
        host,
        {
          type: current.type,
          name: '@angular-devkit/build-angular',
          version: latestVersions.DevkitBuildAngular,
          overwrite: true,
        },
      );
    }

    current = getPackageJsonDependency(host, '@angular-devkit/build-ng-packagr');
    if (current && current.version !== latestVersions.DevkitBuildNgPackagr) {
      updates = true;
      addPackageJsonDependency(
        host,
        {
          type: current.type,
          name: '@angular-devkit/build-ng-packagr',
          version: latestVersions.DevkitBuildNgPackagr,
          overwrite: true,
        },
      );
    }

    current = getPackageJsonDependency(host, 'zone.js');
    if (current && current.version !== latestVersions.ZoneJs) {
      updates = true;
      addPackageJsonDependency(
        host,
        {
          type: current.type,
          name: 'zone.js',
          version: latestVersions.ZoneJs,
          overwrite: true,
        },
      );
    }

    if (updates) {
      context.addTask(new NodePackageInstallTask());
    }
  };
}
