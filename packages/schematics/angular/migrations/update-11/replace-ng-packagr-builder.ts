/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, chain } from '@angular-devkit/schematics';
import { NodeDependencyType, addPackageJsonDependency, removePackageJsonDependency } from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';
import { updateWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

export default function (): Rule {
  return chain([
    updateWorkspace(workspace => {
      for (const [, project] of workspace.projects) {
        for (const [, target] of project.targets) {
          if (target.builder === Builders.DeprecatedNgPackagr) {
            target.builder = Builders.NgPackagr;
          }
        }
      }
    }),
    host => {
      removePackageJsonDependency(host, '@angular-devkit/build-ng-packagr');
      addPackageJsonDependency(host, {
        type: NodeDependencyType.Dev,
        name: '@angular-devkit/build-angular',
        version: latestVersions.DevkitBuildAngular,
        overwrite: false,
      });
    },
  ]);
}
