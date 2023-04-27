/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { allTargetOptions, updateWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

export default function (): Rule {
  return updateWorkspace((workspace) => {
    for (const project of workspace.projects.values()) {
      for (const target of project.targets.values()) {
        if (target.builder !== Builders.Server) {
          continue;
        }

        for (const [, options] of allTargetOptions(target)) {
          // Set 'buildOptimizer' to match the 'optimization' option.
          if (options.buildOptimizer === undefined && options.optimization !== undefined) {
            options.buildOptimizer = !!options.optimization;
          }
        }
      }
    }
  });
}
