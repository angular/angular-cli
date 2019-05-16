/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree } from '@angular-devkit/schematics';
import { addPackageJsonDependency, getPackageJsonDependency } from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';

export function updateBuilders() {
  return (host: Tree) => {
    let current = getPackageJsonDependency(host, '@angular-devkit/build-angular');
    if (current && current.version !== latestVersions.DevkitBuildAngular) {
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
  };
}
