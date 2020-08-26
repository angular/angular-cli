/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import { NodeDependencyType, addPackageJsonDependency, getPackageJsonDependency, removePackageJsonDependency } from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';

export function addTsLib(): Rule {
  return host => {
    const tslibDep = getPackageJsonDependency(host, 'tslib');

    if (tslibDep && tslibDep.type !== NodeDependencyType.Default) {
      removePackageJsonDependency(host, 'tslib');
    }

    addPackageJsonDependency(host, {
      name: 'tslib',
      version: latestVersions.TsLib,
      type: NodeDependencyType.Default,
      overwrite: true,
    });
  };
}
