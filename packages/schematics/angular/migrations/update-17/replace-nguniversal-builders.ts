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
import { ProjectType } from '../../utility/workspace-models';

export default function (): Rule {
  return chain([
    updateWorkspace((workspace) => {
      for (const [, project] of workspace.projects) {
        if (project.extensions.projectType !== ProjectType.Application) {
          // Only interested in application projects since these changes only effects application builders
          continue;
        }

        for (const [, target] of project.targets) {
          if (target.builder === '@nguniversal/builders:ssr-dev-server') {
            target.builder = '@angular-devkit/build-angular:ssr-dev-server';
          } else if (target.builder === '@nguniversal/builders:prerender') {
            target.builder = '@angular-devkit/build-angular:prerender';
            for (const [, options] of allTargetOptions(target, false)) {
              // Remove and replace builder options
              if (options['guessRoutes'] !== undefined) {
                options['discoverRoutes'] = options['guessRoutes'];
                delete options['guessRoutes'];
              }

              if (options['numProcesses'] !== undefined) {
                delete options['numProcesses'];
              }
            }
          }
        }
      }
    }),
    (host) => {
      removePackageJsonDependency(host, '@nguniversal/builders');
    },
  ]);
}
