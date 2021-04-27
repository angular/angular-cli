/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

export default function (): Rule {
  return async host => {
    const workspace = await getWorkspace(host);

    for (const [, project] of workspace.projects) {
      for (const [, target] of project.targets) {
        if (target.builder !== Builders.NgPackagr) {
          continue;
        }

        if (!target.configurations) {
          continue;
        }

        for (const options of Object.values(target.configurations)) {
          addDeclarationMapValue(host, options?.tsConfig, false);
        }

        addDeclarationMapValue(host, target.options?.tsConfig, true);
      }
    }
  };
}

function addDeclarationMapValue(host: Tree, tsConfigPath: unknown, value: boolean): void {
  if (typeof tsConfigPath !== 'string') {
    return;
  }

  const declarationMapPath = ['compilerOptions', 'declarationMap'];
  const file = new JSONFile(host, tsConfigPath);
  if (file.get(declarationMapPath) === undefined) {
    file.modify(declarationMapPath, value);
  }
}
