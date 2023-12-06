/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { DependencyType, addDependency } from '../../utility';
import { getPackageJsonDependency } from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';
import { getWorkspace } from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

const BROWSER_SYNC_VERSION = latestVersions['browser-sync'];

export default function (): Rule {
  return async (tree) => {
    if (getPackageJsonDependency(tree, 'browser-sync')?.version === BROWSER_SYNC_VERSION) {
      return;
    }

    const workspace = await getWorkspace(tree);
    for (const project of workspace.projects.values()) {
      if (project.extensions.projectType !== ProjectType.Application) {
        continue;
      }

      for (const target of project.targets.values()) {
        if (target.builder === Builders.SsrDevServer) {
          return addDependency('browser-sync', BROWSER_SYNC_VERSION, {
            type: DependencyType.Dev,
          });
        }
      }
    }
  };
}
