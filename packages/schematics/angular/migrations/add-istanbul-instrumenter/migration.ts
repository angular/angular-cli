/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule } from '@angular-devkit/schematics';
import { DependencyType, ExistingBehavior, addDependency } from '../../utility/dependency';
import { latestVersions } from '../../utility/latest-versions';
import { allTargetOptions, getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

export default function (): Rule {
  return async (tree) => {
    const workspace = await getWorkspace(tree);
    let needInstrumenter = false;

    for (const [, project] of workspace.projects) {
      for (const [, target] of project.targets) {
        if (target.builder === Builders.Karma || target.builder === Builders.BuildKarma) {
          needInstrumenter = true;
          break;
        }

        if (target.builder === Builders.BuildUnitTest) {
          for (const [, options] of allTargetOptions(target)) {
            if (options['runner'] === 'karma') {
              needInstrumenter = true;
              break;
            }
          }
        }

        if (needInstrumenter) {
          break;
        }
      }
      if (needInstrumenter) {
        break;
      }
    }

    if (needInstrumenter) {
      return addDependency('istanbul-lib-instrument', latestVersions['istanbul-lib-instrument'], {
        type: DependencyType.Dev,
        existing: ExistingBehavior.Skip,
      });
    }
  };
}
