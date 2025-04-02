/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonObject } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { allTargetOptions, allWorkspaceTargets, getWorkspace } from '../../utility/workspace';

export default function (): Rule {
  return async (host) => {
    const uniqueTsConfigs = new Set<string>();

    if (host.exists('tsconfig.json')) {
      // Workspace level tsconfig
      uniqueTsConfigs.add('tsconfig.json');
    }

    const workspace = await getWorkspace(host);
    for (const [, target] of allWorkspaceTargets(workspace)) {
      for (const [, opt] of allTargetOptions(target)) {
        if (typeof opt?.tsConfig === 'string') {
          uniqueTsConfigs.add(opt.tsConfig);
        }
      }
    }

    for (const tsConfig of uniqueTsConfigs) {
      if (host.exists(tsConfig)) {
        updateModuleResolution(host, tsConfig);
      }
    }
  };
}

function updateModuleResolution(host: Tree, tsConfigPath: string): void {
  const json = new JSONFile(host, tsConfigPath);
  const jsonPath = ['compilerOptions'];
  const compilerOptions = json.get(jsonPath);

  if (compilerOptions && typeof compilerOptions === 'object') {
    const { moduleResolution, module } = compilerOptions as JsonObject;
    if (typeof moduleResolution !== 'string' || moduleResolution.toLowerCase() === 'bundler') {
      return;
    }

    if (typeof module === 'string' && module.toLowerCase() === 'preserve') {
      return;
    }

    json.modify(jsonPath, {
      ...compilerOptions,
      'moduleResolution': 'bundler',
    });
  }
}
