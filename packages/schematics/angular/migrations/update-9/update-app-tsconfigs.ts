/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstObject, join, logging, normalize } from '@angular-devkit/core';
import { Rule, Tree, UpdateRecorder } from '@angular-devkit/schematics';
import { dirname, relative } from 'path';
import {
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
  removePropertyInAstObject,
} from '../../utility/json-utils';
import { Builders } from '../../utility/workspace-models';
import {
  forwardSlashPath,
  getAllOptions,
  getTargets,
  getWorkspace,
  readJsonFileAsAstObject,
} from './utils';

/**
 * Update the tsconfig files for applications
 * - Removes enableIvy: true
 * - Sets stricter file inclusions
 * - Sets module compiler option to esnext or commonjs
 */
export function updateApplicationTsConfigs(): Rule {
  return (tree, context) => {
    const workspace = getWorkspace(tree);
    const logger = context.logger;

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

    return tree;
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
    let recorder: UpdateRecorder;
    const tsConfigOption = findPropertyInAstObject(option, 'tsConfig');

    if (!tsConfigOption || tsConfigOption.kind !== 'string') {
      continue;
    }

    const tsConfigPath = tsConfigOption.value;
    let tsConfigAst = readJsonFileAsAstObject(tree, tsConfigPath);
    if (!tsConfigAst) {
      logger.warn(`Cannot find file: ${tsConfigPath}`);
      continue;
    }

    // Remove 'enableIvy: true' since this is the default in version 9.
    const angularCompilerOptions = findPropertyInAstObject(tsConfigAst, 'angularCompilerOptions');
    if (angularCompilerOptions && angularCompilerOptions.kind === 'object') {
      const enableIvy = findPropertyInAstObject(angularCompilerOptions, 'enableIvy');
      if (enableIvy && enableIvy.kind === 'true') {
        recorder = tree.beginUpdate(tsConfigPath);
        if (angularCompilerOptions.properties.length === 1) {
          // remove entire 'angularCompilerOptions'
          removePropertyInAstObject(recorder, tsConfigAst, 'angularCompilerOptions');
        } else {
          removePropertyInAstObject(recorder, angularCompilerOptions, 'enableIvy');
        }
        tree.commitUpdate(recorder);
      }
    }

    // Update 'module' compilerOption
    updateModuleCompilerOption(tree, tsConfigPath, builderName);

    // Add stricter file inclusions to avoid unused file warning during compilation
    if (builderName !== Builders.Karma) {
      // Note: we need to re-read the tsconfig after very commit because
      // otherwise the updates will be out of sync since we are ammending the same node.

      // we are already checking that tsconfig exists above!
      // tslint:disable-next-line: no-non-null-assertion
      tsConfigAst = readJsonFileAsAstObject(tree, tsConfigPath)!;
      const include = findPropertyInAstObject(tsConfigAst, 'include');

      if (include && include.kind === 'array') {
        const tsInclude = include.elements.find(({ value }) => typeof value === 'string' && value.endsWith('**/*.ts'));
        if (tsInclude) {
          const { start, end } = tsInclude;
          recorder = tree.beginUpdate(tsConfigPath);
          recorder.remove(start.offset, end.offset - start.offset);
          // Replace ts includes with d.ts
          recorder.insertLeft(start.offset, tsInclude.text.replace('.ts', '.d.ts'));
          tree.commitUpdate(recorder);
        }
      } else {
        // Includes are not present, add includes to dts files
        // By default when 'include' nor 'files' fields are used TypeScript
        // will include all ts files.
        const srcRootAst = findPropertyInAstObject(project, 'sourceRoot');
        const include = srcRootAst?.kind === 'string'
          ? join(normalize(srcRootAst.value), '**/*.d.ts')
          : '**/*.d.ts';

        recorder = tree.beginUpdate(tsConfigPath);
        insertPropertyInAstObjectInOrder(recorder, tsConfigAst, 'include', [include], 2);
        tree.commitUpdate(recorder);
      }

      const files = findPropertyInAstObject(tsConfigAst, 'files');
      if (!files) {
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
          recorder = tree.beginUpdate(tsConfigPath);
          // tslint:disable-next-line: no-non-null-assertion
          tsConfigAst = readJsonFileAsAstObject(tree, tsConfigPath)!;
          insertPropertyInAstObjectInOrder(recorder, tsConfigAst, 'files', newFiles, 2);
          tree.commitUpdate(recorder);
        }

        recorder = tree.beginUpdate(tsConfigPath);
        // tslint:disable-next-line: no-non-null-assertion
        tsConfigAst = readJsonFileAsAstObject(tree, tsConfigPath)!;
        removePropertyInAstObject(recorder, tsConfigAst, 'exclude');
        tree.commitUpdate(recorder);
      }
    }
  }
}

function updateModuleCompilerOption(tree: Tree, tsConfigPath: string, builderName?: Builders) {
  const tsConfigAst = readJsonFileAsAstObject(tree, tsConfigPath);

  if (!tsConfigAst) {
    return;
  }

  const compilerOptions = findPropertyInAstObject(tsConfigAst, 'compilerOptions');
  if (!compilerOptions || compilerOptions.kind !== 'object') {
    return;
  }

  const configExtends = findPropertyInAstObject(tsConfigAst, 'extends');
  const isExtendedConfig = configExtends && configExtends.kind === 'string';
  const recorder = tree.beginUpdate(tsConfigPath);

  // Server tsconfig should have a module of commonjs
  const moduleType = builderName === Builders.Server ? 'commonjs' : 'esnext';
  if (isExtendedConfig && builderName !== Builders.Server) {
    removePropertyInAstObject(recorder, compilerOptions, 'module');
  } else {
    const scriptModule = findPropertyInAstObject(compilerOptions, 'module');
    if (!scriptModule) {
      insertPropertyInAstObjectInOrder(recorder, compilerOptions, 'module', moduleType, 4);
    } else if (scriptModule.value !== moduleType) {
      const { start, end } = scriptModule;
      recorder.remove(start.offset, end.offset - start.offset);
      recorder.insertLeft(start.offset, `"${moduleType}"`);
    }
  }

  tree.commitUpdate(recorder);
}
