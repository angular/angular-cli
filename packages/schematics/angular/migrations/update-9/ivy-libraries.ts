/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, Tree } from '@angular-devkit/schematics';
import { getWorkspacePath } from '../../utility/config';
import {
  appendPropertyInAstObject,
  findPropertyInAstObject,
  insertPropertyInAstObjectInOrder,
} from '../../utility/json-utils';
import { Builders } from '../../utility/workspace-models';
import { getTargets, getWorkspace, readJsonFileAsAstObject } from './utils';

/**
 * Updates a pre version 9 library to version 9 Ivy library.
 *
 * The main things that this migrations does are:
 * - Creates a production configuration for VE compilations.
 * - Create a prod tsconfig for which disables Ivy and enables VE compilations.
 */
export function updateLibraries(): Rule {
  return (tree: Tree) => {
    const workspacePath = getWorkspacePath(tree);
    const workspace = getWorkspace(tree);

    const recorder = tree.beginUpdate(workspacePath);
    for (const { target, project } of getTargets(workspace, 'build', Builders.NgPackagr)) {
      const projectRoot = findPropertyInAstObject(project, 'root');
      if (!projectRoot || projectRoot.kind !== 'string') {
        break;
      }

      const configurations = findPropertyInAstObject(target, 'configurations');
      const tsConfig = `${projectRoot.value}/tsconfig.lib.prod.json`;

      if (!configurations || configurations.kind !== 'object') {
        // Configurations doesn't exist.
        appendPropertyInAstObject(recorder, target, 'configurations', { production: { tsConfig } }, 10);
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

      // tsConfig for production already exists.
      const tsConfigAst = readJsonFileAsAstObject(tree, tsConfigOption.value);
      const tsConfigRecorder = tree.beginUpdate(tsConfigOption.value);
      const ngCompilerOptions = findPropertyInAstObject(tsConfigAst, 'angularCompilerOptions');
      if (!ngCompilerOptions) {
        // Add angularCompilerOptions to the production tsConfig
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

    tree.commitUpdate(recorder);

    return tree;
  };
}

function createTsConfig(tree: Tree, tsConfigPath: string) {
  const tsConfigContent = {
    extends: './tsconfig.lib.json',
    angularCompilerOptions: {
      enableIvy: false,
    },
  };

  if (!tree.exists(tsConfigPath)) {
    tree.create(tsConfigPath, JSON.stringify(tsConfigContent, undefined, 2));
  }
}
