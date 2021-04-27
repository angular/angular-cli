/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import { removePackageJsonDependency } from '../../utility/dependencies';
import { JSONFile } from '../../utility/json-file';
import { allTargetOptions, allWorkspaceTargets, getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

/**
 * Remove tsickle from libraries
 */
export function removeTsickle(): Rule {
  return async (tree, { logger }) => {
    removePackageJsonDependency(tree, 'tsickle');

    const workspace = await getWorkspace(tree);
    for (const [targetName, target] of allWorkspaceTargets(workspace)) {
      if (targetName !== 'build' || target.builder !== Builders.DeprecatedNgPackagr) {
        continue;
      }

      for (const [, options] of allTargetOptions(target)) {
        const tsConfigPath = options.tsConfig;
        if (!tsConfigPath || typeof tsConfigPath !== 'string') {
          continue;
        }

        let tsConfigJson;
        try {
          tsConfigJson = new JSONFile(tree, tsConfigPath);
        } catch {
          logger.warn(`Cannot find file: ${tsConfigPath}`);

          continue;
        }

        tsConfigJson.remove(['angularCompilerOptions', 'annotateForClosureCompiler']);
      }
    }
  };
}
