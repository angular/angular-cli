/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { allTargetOptions, allWorkspaceTargets, updateWorkspace } from '../../utility/workspace';

export default function (): Rule {
  return updateWorkspace(workspace => {
    for (const [, target] of allWorkspaceTargets(workspace)) {
      if (!target.builder.startsWith('@angular-devkit/build-angular')) {
        continue;
      }

      for (const [, options] of allTargetOptions(target)) {
        delete options.experimentalRollupPass;
        delete options.lazyModules;
        delete options.forkTypeChecker;
      }
    }
  });
}
