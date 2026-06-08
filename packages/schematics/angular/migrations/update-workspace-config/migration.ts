/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { isJsonObject } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { allTargetOptions, updateWorkspace } from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

/**
 * Migration to update the angular workspace configuration.
 */
export default function (): Rule {
  return updateWorkspace((workspace) => {
    for (const project of workspace.projects.values()) {
      if (project.extensions['projectType'] !== ProjectType.Application) {
        continue;
      }

      for (const target of project.targets.values()) {
        if (
          target.builder !== Builders.Application &&
          target.builder !== Builders.BuildApplication
        ) {
          continue;
        }

        for (const [, options] of allTargetOptions(target)) {
          const ssr = options['ssr'];
          if (!ssr || !isJsonObject(ssr)) {
            continue;
          }

          const platform = ssr['experimentalPlatform'];
          if (platform) {
            ssr['platform'] = platform;
            delete ssr['experimentalPlatform'];
          }
        }
      }
    }
  });
}
