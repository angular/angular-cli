/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonParseMode, parseJsonAst } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import {
  appendPropertyInAstObject,
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
} from '../../utility/json-utils';

function createTsConfig(tree: Tree, tsConfigPath: string) {
  const tsConfigContent = {
    extends: './tsconfig.lib.json',
    angularCompilerOptions: {
      skipTemplateCodegen: true,
      strictMetadataEmit: true,
      enableResourceInlining: true,
      enableIvy: false,
    },
  };

  tree.create(tsConfigPath, JSON.stringify(tsConfigContent, undefined, 2));
}

export function UpdateLibraries(): Rule {
  return (tree: Tree) => {
    let workspaceConfigPath = 'angular.json';
    let angularConfigContent = tree.read(workspaceConfigPath);

    if (!angularConfigContent) {
      workspaceConfigPath = '.angular.json';
      angularConfigContent = tree.read(workspaceConfigPath);

      if (!angularConfigContent) {
        return;
      }
    }

    const angularJson = parseJsonAst(angularConfigContent.toString(), JsonParseMode.Loose);
    if (angularJson.kind !== 'object') {
      return;
    }

    const projects = findPropertyInAstObject(angularJson, 'projects');
    if (!projects || projects.kind !== 'object') {
      return;
    }

    // For all projects
    const recorder = tree.beginUpdate(workspaceConfigPath);
    for (const project of projects.properties) {
      const projectConfig = project.value;
      if (projectConfig.kind !== 'object') {
        break;
      }

      const projectRoot = findPropertyInAstObject(projectConfig, 'root');
      if (!projectRoot || projectRoot.kind !== 'string') {
        break;
      }

      const architect = findPropertyInAstObject(projectConfig, 'architect');
      if (!architect || architect.kind !== 'object') {
        break;
      }

      const buildTarget = findPropertyInAstObject(architect, 'build');
      if (buildTarget && buildTarget.kind === 'object') {
        const builder = findPropertyInAstObject(buildTarget, 'builder');
        // Projects who's build builder is @angular-devkit/build-ng-packagr
        if (builder && builder.kind === 'string' && builder.value === '@angular-devkit/build-ng-packagr:build') {
          const configurations = findPropertyInAstObject(buildTarget, 'configurations');
          const tsConfig = `${projectRoot.value}/tsconfig.lib.prod.json`;

          if (!configurations || configurations.kind !== 'object') {
            // Configurations doesn't exist.
            appendPropertyInAstObject(recorder, buildTarget, 'configurations', { production: { tsConfig } }, 10);
            createTsConfig(tree, tsConfig);
            continue;
          }

          const prodConfig = findPropertyInAstObject(configurations, 'production');
          if (!prodConfig || prodConfig.kind !== 'object') {
            // Production configuration doesn't exist.
            insertPropertyInAstObjectInOrder(recorder, configurations, 'production', { tsConfig }, 12);
            createTsConfig(tree, tsConfig);
            continue;
          }

          const tsConfigOption = findPropertyInAstObject(prodConfig, 'tsConfig');
          if (!tsConfigOption || tsConfigOption.kind !== 'string') {
            // No tsconfig for production has been defined.
            insertPropertyInAstObjectInOrder(recorder, prodConfig, 'tsConfig', tsConfig, 14);
            createTsConfig(tree, tsConfig);
            continue;
          }

          // ts config for production already exists.
          const tsConfigContent = tree.read(tsConfigOption.value);
          if (!tsConfigContent) {
            continue;
          }

          const tsConfigAst = parseJsonAst(tsConfigContent.toString(), JsonParseMode.Loose);
          if (!tsConfigAst || tsConfigAst.kind !== 'object') {
            continue;
          }

          const tsConfigRecorder = tree.beginUpdate(tsConfigOption.value);
          const ngCompilerOptions = findPropertyInAstObject(tsConfigAst, 'angularCompilerOptions');
          if (!ngCompilerOptions) {
            // Add angularCompilerOptions
            appendPropertyInAstObject(tsConfigRecorder, tsConfigAst, 'angularCompilerOptions', { enableIvy: false }, 2);
            tree.commitUpdate(tsConfigRecorder);
            continue;
          }

          if (ngCompilerOptions.kind === 'object') {
            const enableIvy = findPropertyInAstObject(ngCompilerOptions, 'enableIvy');
            // Add enableIvy false
            if (!enableIvy) {
              appendPropertyInAstObject(tsConfigRecorder, ngCompilerOptions, 'enableIvy', false, 4);
              tree.commitUpdate(tsConfigRecorder);
              continue;
            }

            if (enableIvy.kind !== 'false') {
              const { start, end } = enableIvy;
              tsConfigRecorder.remove(start.offset, end.offset - start.offset);
              tsConfigRecorder.insertLeft(start.offset, 'false');
              tree.commitUpdate(tsConfigRecorder);
            }
          }
        }
      }
    }

    tree.commitUpdate(recorder);

    return tree;
  };
}
