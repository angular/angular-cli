/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, logging, normalize, workspaces } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { dirname, relative } from 'path';
import { JSONFile } from '../../utility/json-file';
import { allTargetOptions, allWorkspaceTargets, getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';
import { forwardSlashPath } from './utils';

/**
 * Update the tsconfig files for applications
 * - Removes enableIvy: true
 * - Sets stricter file inclusions
 * - Sets module compiler option to esnext or commonjs
 */
export function updateApplicationTsConfigs(): Rule {
  return async (tree, { logger }) => {
    const workspace = await getWorkspace(tree);

    // Add `module` option in the workspace tsconfig
    updateModuleCompilerOption(tree, '/tsconfig.json');

    for (const [targetName, target, , project] of allWorkspaceTargets(workspace)) {
      switch (targetName) {
        case 'build':
          if (target.builder !== Builders.Browser) {
            continue;
          }
          break;
        case 'server':
          if (target.builder !== Builders.Server) {
            continue;
          }
          break;
        case 'test':
          if (target.builder !== Builders.Karma) {
            continue;
          }
          break;
        default:
          continue;
      }

      updateTsConfig(tree, target, project.sourceRoot, logger);
    }
  };
}

function updateTsConfig(
  tree: Tree,
  builderConfig: workspaces.TargetDefinition,
  projectSourceRoot: string | undefined,
  logger: logging.LoggerApi,
) {
  for (const [, options] of allTargetOptions(builderConfig)) {
    const tsConfigPath = options.tsConfig;
    if (!tsConfigPath || typeof tsConfigPath !== 'string') {
      continue;
    }

    // Update 'module' compilerOption
    updateModuleCompilerOption(tree, tsConfigPath, builderConfig.builder);

    let tsConfigJson;
    try {
      tsConfigJson = new JSONFile(tree, tsConfigPath);
    } catch {
      logger.warn(`Cannot find file: ${tsConfigPath}`);
      continue;
    }

    // Remove 'enableIvy: true' since this is the default in version 9.
    if (tsConfigJson.get(['angularCompilerOptions', 'enableIvy']) === true) {
      const angularCompilerOptions = tsConfigJson.get(['angularCompilerOptions']);
      const keys = Object.keys(angularCompilerOptions as object);

      if (keys.length === 1) {
        // remove entire 'angularCompilerOptions'
        tsConfigJson.remove(['angularCompilerOptions']);
      } else {
        // leave other options
        tsConfigJson.remove(['angularCompilerOptions', 'enableIvy']);
      }
    }

    // Add stricter file inclusions to avoid unused file warning during compilation
    if (builderConfig.builder !== Builders.Karma) {

      const include = tsConfigJson.get(['include']);
      if (include && Array.isArray(include)) {
        const tsInclude = include.findIndex((value) => typeof value === 'string' && value.endsWith('**/*.ts'));
        if (tsInclude !== -1) {
          // Replace ts includes with d.ts
          tsConfigJson.modify(['include', tsInclude], include[tsInclude].replace('.ts', '.d.ts'));
        }
      } else {
        // Includes are not present, add includes to dts files
        // By default when 'include' nor 'files' fields are used TypeScript
        // will include all ts files.
        const include = projectSourceRoot !== undefined
          ? join(normalize(projectSourceRoot), '**/*.d.ts')
          : '**/*.d.ts';

        tsConfigJson.modify(['include'], [include]);
      }

      const files = tsConfigJson.get(['files']);
      if (files === undefined) {
        const newFiles: string[] = [];
        const tsConfigDir = dirname(forwardSlashPath(tsConfigPath));

        const mainOption = options.main;
        if (mainOption && typeof mainOption === 'string') {
          newFiles.push(
            forwardSlashPath(relative(tsConfigDir, forwardSlashPath(mainOption))));
        }

        const polyfillsOption = options.polyfills;
        if (polyfillsOption && typeof polyfillsOption === 'string') {
          newFiles.push(
            forwardSlashPath(relative(tsConfigDir, forwardSlashPath(polyfillsOption))));
        }

        if (newFiles.length) {
          tsConfigJson.modify(['files'], newFiles);
        }

        tsConfigJson.remove(['exclude']);
      }
    }
  }
}

function updateModuleCompilerOption(tree: Tree, tsConfigPath: string, builderName?: string) {
  let tsConfigJson;
  try {
    tsConfigJson = new JSONFile(tree, tsConfigPath);
  } catch {
    return;
  }

  const compilerOptions = tsConfigJson.get(['compilerOptions']);
  if (!compilerOptions || typeof compilerOptions !== 'object') {
    return;
  }

  const configExtends = tsConfigJson.get(['extends']);
  const isExtended = configExtends && typeof configExtends === 'string';

  // Server tsconfig should have a module of commonjs
  const moduleType = builderName === Builders.Server ? 'commonjs' : 'esnext';

  if (isExtended && builderName !== Builders.Server) {
    tsConfigJson.remove(['compilerOptions', 'module']);
  } else {
    tsConfigJson.modify(['compilerOptions', 'module'], moduleType);
  }
}
