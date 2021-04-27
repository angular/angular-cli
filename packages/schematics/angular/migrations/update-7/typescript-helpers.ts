/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, chain } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  NodeDependencyType,
  addPackageJsonDependency,
  getPackageJsonDependency,
} from '../../utility/dependencies';
import { JSONFile } from '../../utility/json-file';
import { latestVersions } from '../../utility/latest-versions';

export function typeScriptHelpersRule(): Rule {
  return chain([
    _updateTsConfig(),
    (tree, context) => {
      const existing = getPackageJsonDependency(tree, 'tslib');
      const type = existing ? existing.type : NodeDependencyType.Default;

      addPackageJsonDependency(
        tree,
        {
          type,
          name: 'tslib',
          version: latestVersions.TsLib,
          overwrite: true,
        },
      );

      context.addTask(new NodePackageInstallTask());
    },
  ]);
}

function _updateTsConfig(): Rule {
  return (host) => {
    const tsConfigPath = '/tsconfig.json';

    let tsConfigJson;
    try {
      tsConfigJson = new JSONFile(host, tsConfigPath);
    } catch {
      return;
    }

    const compilerOptions = tsConfigJson.get(['compilerOptions']);
    if (!compilerOptions || typeof compilerOptions !== 'object') {
      return;
    }

    const importHelpersPath = ['compilerOptions', 'importHelpers'];
    const importHelpers = tsConfigJson.get(importHelpersPath);
    if (importHelpers === true) {
      return;
    }

    tsConfigJson.modify(importHelpersPath, true);
  };
}
