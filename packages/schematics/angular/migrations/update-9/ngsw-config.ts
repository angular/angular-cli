/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule,  Tree } from '@angular-devkit/schematics';
import { appendValueInAstArray, findPropertyInAstObject } from '../../utility/json-utils';
import { Builders } from '../../utility/workspace-models';
import { getAllOptions, getTargets, getWorkspace, readJsonFileAsAstObject } from './utils';


/**
 * Update ngsw-config.json to fix issue https://github.com/angular/angular-cli/pull/15277
 */
export function updateNGSWConfig(): Rule {
  return (tree: Tree) => {
    const workspace = getWorkspace(tree);

    for (const { target } of getTargets(workspace, 'build', Builders.Browser)) {
      for (const options of getAllOptions(target)) {
        const ngswConfigPath = findPropertyInAstObject(options, 'ngswConfigPath');
        if (!ngswConfigPath || ngswConfigPath.kind !== 'string') {
          continue;
        }

        const path = ngswConfigPath.value;
        const ngswConfigAst = readJsonFileAsAstObject(tree, path);
        if (!ngswConfigAst || ngswConfigAst.kind !== 'object') {
          continue;
        }

        const assetGroups = findPropertyInAstObject(ngswConfigAst, 'assetGroups');
        if (!assetGroups || assetGroups.kind !== 'array') {
          continue;
        }

        const prefetchElement = assetGroups.elements.find(element => {
          const installMode = element.kind === 'object' && findPropertyInAstObject(element, 'installMode');

          return installMode && installMode.value === 'prefetch';
        });

        if (!prefetchElement || prefetchElement.kind !== 'object') {
          continue;
        }

        const resources = findPropertyInAstObject(prefetchElement, 'resources');
        if (!resources || resources.kind !== 'object') {
          continue;
        }

        const files = findPropertyInAstObject(resources, 'files');
        if (!files || files.kind !== 'array') {
          continue;
        }

        const hasManifest = files.elements
          .some(({ value }) => typeof value === 'string' && value.endsWith('manifest.webmanifest'));
        if (hasManifest) {
          continue;
        }

        const recorder = tree.beginUpdate(path);
        appendValueInAstArray(recorder, files, '/manifest.webmanifest', 10);
        tree.commitUpdate(recorder);
      }
    }

    return tree;
  };
}
