/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  NodeDependencyType,
  addPackageJsonDependency,
  getPackageJsonDependency,
} from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';

export { polyfillMetadataRule } from './polyfill-metadata';
export { typeScriptHelpersRule } from './typescript-helpers';
export { updateDevkitBuildNgPackagr } from './devkit-ng-packagr';

export default function(): Rule {
  return (tree, context) => {
    const existing = getPackageJsonDependency(tree, '@angular-devkit/build-angular');
    if (existing && latestVersions.DevkitBuildAngular === existing.version) {
      return;
    }

    const type = existing ? existing.type : NodeDependencyType.Dev;
    addPackageJsonDependency(
      tree,
      {
        type,
        name: '@angular-devkit/build-angular',
        version: latestVersions.DevkitBuildAngular,
        overwrite: true,
      },
    );

    context.addTask(new NodePackageInstallTask());
  };
}
