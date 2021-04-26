/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { join, normalize } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { NodeDependencyType, addPackageJsonDependency, removePackageJsonDependency } from '../../utility/dependencies';
import { getWorkspace } from '../../utility/workspace';
import { ProjectType } from '../../utility/workspace-models';


export default function (): Rule {
  return async host => {
    const workspace = await getWorkspace(host);

    for (const [, project] of workspace.projects) {
      if (project.extensions.projectType !== ProjectType.Library) {
        // Only interested in library projects
        continue;
      }

      const packageJsonPath = join(normalize(project.root), 'package.json');
      if (!host.exists(packageJsonPath)) {
        continue;
      }

      // Remove tslib from any type of dependency
      removePackageJsonDependency(host, 'tslib', packageJsonPath);

      // Add tslib as a direct dependency
      addPackageJsonDependency(host, {
        name: 'tslib',
        version: '^2.0.0',
        type: NodeDependencyType.Default,
      }, packageJsonPath);
    }
  };
}
