/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { getWorkspace } from '../../utility/workspace';

export default function (): Rule {
  return async (host, context) => {
    // Workspace level tsconfig
    if (host.exists('tsconfig.json')) {
      updateLib(host, 'tsconfig.json');
    }

    const workspace = await getWorkspace(host);

    // Find all tsconfig which are references used by builders
    for (const [, project] of workspace.projects) {
      for (const [targetName, target] of project.targets) {
        if (!target.options) {
          continue;
        }

        // Update all other known CLI builders that use a tsconfig
        const tsConfigs = [target.options, ...Object.values(target.configurations || {})]
          .filter((opt) => typeof opt?.tsConfig === 'string')
          .map((opt) => (opt as { tsConfig: string }).tsConfig);

        const uniqueTsConfigs = new Set(tsConfigs);
        for (const tsConfig of uniqueTsConfigs) {
          if (host.exists(tsConfig)) {
            updateLib(host, tsConfig);
          } else {
            context.logger.warn(
              `'${tsConfig}' referenced in the '${targetName}' target does not exist.`,
            );
          }
        }
      }
    }
  };
}

function updateLib(host: Tree, tsConfigPath: string): void {
  const json = new JSONFile(host, tsConfigPath);
  const jsonPath = ['compilerOptions', 'lib'];
  const lib = json.get(jsonPath) as string[] | undefined;

  if (!lib || !Array.isArray(lib)) {
    return;
  }

  const esLibs = lib.filter((l) => typeof l === 'string' && l.toLowerCase().startsWith('es'));
  const hasDom = lib.some((l) => typeof l === 'string' && l.toLowerCase() === 'dom');

  if (esLibs.length === 0) {
    return;
  }

  const esLibToVersion = new Map<string, number>();
  for (const l of esLibs) {
    const version = l.toLowerCase().match(/^es(next|(\d+))$/)?.[1];
    if (version) {
      esLibToVersion.set(l, version === 'next' ? Infinity : Number(version));
    }
  }

  if (esLibToVersion.size === 0) {
    return;
  }

  const latestEsLib = [...esLibToVersion.entries()].sort(([, v1], [, v2]) => v2 - v1)[0];
  const latestVersion = latestEsLib[1];

  if (hasDom) {
    if (latestVersion <= 2022) {
      json.remove(jsonPath);
    }

    return;
  }

  // No 'dom' with 'es' libs, so update 'es' lib.
  if (latestVersion < 2022) {
    const newLibs = lib.filter((l) => !esLibToVersion.has(l));
    newLibs.push('es2022');
    json.modify(jsonPath, newLibs);
  }
}
