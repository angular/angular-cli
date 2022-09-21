/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonObject } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

export default function (): Rule {
  return async (host) => {
    // Workspace level tsconfig
    updateTarget(host, 'tsconfig.json');

    const workspace = await getWorkspace(host);

    // Find all tsconfig which are refereces used by builders
    for (const [, project] of workspace.projects) {
      for (const [, target] of project.targets) {
        // Update all other known CLI builders that use a tsconfig
        const tsConfigs = [target.options || {}, ...Object.values(target.configurations || {})]
          .filter((opt) => typeof opt?.tsConfig === 'string')
          .map((opt) => (opt as { tsConfig: string }).tsConfig);

        const uniqueTsConfigs = [...new Set(tsConfigs)];

        if (uniqueTsConfigs.length < 1) {
          continue;
        }

        switch (target.builder as Builders) {
          case Builders.Server:
          case Builders.Karma:
          case Builders.Browser:
          case Builders.NgPackagr:
            for (const tsConfig of uniqueTsConfigs) {
              removeOrUpdateTarget(host, tsConfig);
            }
            break;
        }
      }
    }
  };
}

function removeOrUpdateTarget(host: Tree, tsConfigPath: string): void {
  const json = new JSONFile(host, tsConfigPath);
  if (typeof json.get(['extends']) === 'string') {
    json.remove(['compilerOptions', 'target']);
  } else {
    updateTarget(host, tsConfigPath);
  }
}

const ESNEXT_ES2022_REGEXP = /^es(?:next|2022)$/i;
function updateTarget(host: Tree, tsConfigPath: string): void {
  const json = new JSONFile(host, tsConfigPath);
  const jsonPath = ['compilerOptions'];
  const compilerOptions = json.get(jsonPath);

  if (compilerOptions && typeof compilerOptions === 'object') {
    const { target } = compilerOptions as JsonObject;

    if (typeof target === 'string' && !ESNEXT_ES2022_REGEXP.test(target)) {
      json.modify(jsonPath, {
        ...compilerOptions,
        'target': 'ES2022',
        'useDefineForClassFields': false,
      });
    }
  }
}
