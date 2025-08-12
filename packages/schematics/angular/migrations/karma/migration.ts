/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Rule, Tree } from '@angular-devkit/schematics';
import { allTargetOptions, updateWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';
import { analyzeKarmaConfig } from './karma-config-analyzer';
import { compareKarmaConfigToDefault, hasDifferences } from './karma-config-comparer';

function updateProjects(tree: Tree): Rule {
  return updateWorkspace(async (workspace) => {
    const removableKarmaConfigs = new Map<string, boolean>();

    for (const [, project] of workspace.projects) {
      for (const [, target] of project.targets) {
        let needDevkitPlugin = false;
        switch (target.builder) {
          case Builders.Karma:
            needDevkitPlugin = true;
            break;
          case Builders.BuildKarma:
            break;
          default:
            continue;
        }

        for (const [, options] of allTargetOptions(target, false)) {
          const karmaConfig = options['karmaConfig'];
          if (typeof karmaConfig !== 'string') {
            continue;
          }

          let isRemovable = removableKarmaConfigs.get(karmaConfig);
          if (isRemovable === undefined && tree.exists(karmaConfig)) {
            const content = tree.readText(karmaConfig);
            const analysis = analyzeKarmaConfig(content);

            if (analysis.hasUnsupportedValues) {
              // Cannot safely determine if the file is removable.
              isRemovable = false;
            } else {
              const diff = await compareKarmaConfigToDefault(
                analysis,
                project.root,
                needDevkitPlugin,
                karmaConfig,
              );
              isRemovable = !hasDifferences(diff) && diff.isReliable;
            }

            removableKarmaConfigs.set(karmaConfig, isRemovable);

            if (isRemovable) {
              tree.delete(karmaConfig);
            }
          }

          if (isRemovable) {
            delete options['karmaConfig'];
          }
        }
      }
    }
  });
}

export default function (): Rule {
  return updateProjects;
}
