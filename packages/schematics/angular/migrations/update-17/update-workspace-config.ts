/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, chain } from '@angular-devkit/schematics';
import { removePackageJsonDependency } from '../../utility/dependencies';
import { allTargetOptions, updateWorkspace } from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

export default function (): Rule {
  return updateWorkspace((workspace) => {
    for (const [, project] of workspace.projects) {
      if (project.extensions.projectType !== ProjectType.Application) {
        // Only interested in application projects since these changes only effects application builders
        continue;
      }

      for (const [, target] of project.targets) {
        if (target.builder === Builders.ExtractI18n || target.builder === Builders.DevServer) {
          for (const [, options] of allTargetOptions(target, false)) {
            options['buildTarget'] = options['browserTarget'];
            delete options['browserTarget'];
          }
        }
      }
    }
  });
}
