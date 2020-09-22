/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstObject, join, logging, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { dirname, relative } from 'path';
import { JSONFile } from '../../utility/json-file';
import { findPropertyInAstObject } from '../../utility/json-utils';
import { Builders } from '../../utility/workspace-models';
import {
  forwardSlashPath,
  getAllOptions,
  getTargets,
  getWorkspace,
} from './utils';

/**
 * Update the tsconfig files for applications
 * - Removes enableIvy: true
 * - Sets stricter file inclusions
 * - Sets module compiler option to esnext or commonjs
 */
export function updateApplicationTsConfigs(): Rule {
  return (tree, { logger }) => {
    const workspace = getWorkspace(tree);

    // Add `module` option in the workspace tsconfig
    updateModuleCompilerOption(tree, '/tsconfig.json');

    for (const { target, project } of getTargets(workspace, 'build', Builders.Browser)) {
      updateTsConfig(tree, target, project, Builders.Browser, logger);
    }

    for (const { target, project } of getTargets(workspace, 'server', Builders.Server)) {
      updateTsConfig(tree, target, project, Builders.Server, logger);
    }

    for (const { target, project } of getTargets(workspace, 'test', Builders.Karma)) {
      updateTsConfig(tree, target, project, Builders.Karma, logger);
    }
  };
}

function updateTsConfig(
  tree: Tree,
  builderConfig: JsonAstObject,
  project: JsonAstObject,
  builderName: Builders,
  logger: logging.LoggerApi,
) {
  const options = getAllOptions(builderConfig);
  for (const option of options) {
    const tsConfigOption = findPropertyInAstObject(option, 'tsConfig');

    if (!tsConfigOption || tsConfigOption.kind !== 'string') {
      continue;
    }

    const tsConfigPath = tsConfigOption.value;

    // Update 'module' compilerOption
    updateModuleCompilerOption(tree, tsConfigPath, builderName);

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
    if (builderName !== Builders.Karma) {

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
        const srcRootAst = findPropertyInAstObject(project, 'sourceRoot');
        const include = srcRootAst?.kind === 'string'
          ? join(normalize(srcRootAst.value), '**/*.d.ts')
          : '**/*.d.ts';

        tsConfigJson.modify(['include'], [include]);
      }

      const files = tsConfigJson.get(['files']);
      if (files === undefined) {
        const newFiles: string[] = [];
        const tsConfigDir = dirname(forwardSlashPath(tsConfigPath));

        const mainOption = findPropertyInAstObject(option, 'main');
        if (mainOption && mainOption.kind === 'string') {
          newFiles.push(
            forwardSlashPath(relative(tsConfigDir, forwardSlashPath(mainOption.value))));
        }

        const polyfillsOption = findPropertyInAstObject(option, 'polyfills');
        if (polyfillsOption && polyfillsOption.kind === 'string') {
          newFiles.push(
            forwardSlashPath(relative(tsConfigDir, forwardSlashPath(polyfillsOption.value))));
        }

        if (newFiles.length) {
          tsConfigJson.modify(['files'], newFiles);
        }

        tsConfigJson.remove(['exclude']);
      }
    }
  }
}

function updateModuleCompilerOption(tree: Tree, tsConfigPath: string, builderName?: Builders) {
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
