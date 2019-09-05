/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, chain } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { updateLibraries } from './ivy-libraries';
import { updateNGSWConfig } from './ngsw-config';
import { updateApplicationTsConfigs } from './update-app-tsconfigs';
import { updateDependencies } from './update-dependencies';
import { updateServerMainFile } from './update-server-main-file';
import { updateWorkspaceConfig } from './update-workspace-config';

export default function(): Rule {
  return () => {
    return chain([
      updateWorkspaceConfig(),
      updateLibraries(),
      updateNGSWConfig(),
      updateApplicationTsConfigs(),
      updateDependencies(),
      updateServerMainFile(),
      (tree, context) => {
        const packageChanges = tree.actions.some(a => a.path.endsWith('/package.json'));
        if (packageChanges) {
          context.addTask(new NodePackageInstallTask());
        }
      },
    ]);
  };
}
