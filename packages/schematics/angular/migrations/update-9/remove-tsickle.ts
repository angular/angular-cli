/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import { removePackageJsonDependency } from '../../utility/dependencies';
import { JSONFile } from '../../utility/json-file';
import { findPropertyInAstObject } from '../../utility/json-utils';
import { Builders } from '../../utility/workspace-models';
import { getAllOptions, getTargets, getWorkspace } from './utils';

/**
 * Remove tsickle from libraries
 */
export function removeTsickle(): Rule {
  return (tree, context) => {
    removePackageJsonDependency(tree, 'tsickle');
    const logger = context.logger;
    const workspace = getWorkspace(tree);

    for (const { target } of getTargets(workspace, 'build', Builders.DeprecatedNgPackagr)) {
      for (const options of getAllOptions(target)) {
        const tsConfigOption = findPropertyInAstObject(options, 'tsConfig');
        if (!tsConfigOption || tsConfigOption.kind !== 'string') {
          continue;
        }

        const tsConfigPath = tsConfigOption.value;
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
