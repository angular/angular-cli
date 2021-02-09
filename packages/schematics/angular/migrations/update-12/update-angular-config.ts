/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { updateWorkspace } from '../../utility/workspace';

export default function (): Rule {
  return updateWorkspace(workspace => {
    const optionsToRemove: Record<string, undefined> = {
      experimentalRollupPass: undefined,
    };

    for (const [, project] of workspace.projects) {
      for (const [, target] of project.targets) {
        // Only interested in Angular Devkit builders
        if (!target?.builder.startsWith('@angular-devkit/build-angular')) {
          continue;
        }

        // Check options
        if (target.options) {
          target.options = {
            ...optionsToRemove,
          };
        }

        // Go through each configuration entry
        if (!target.configurations) {
          continue;
        }

        for (const configurationName of Object.keys(target.configurations)) {
          target.configurations[configurationName] = {
            ...optionsToRemove,
          };
        }
      }
    }
  });
}
