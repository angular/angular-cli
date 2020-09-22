/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { findPropertyInAstObject } from '../../utility/json-utils';
import { Builders } from '../../utility/workspace-models';
import { getAllOptions, getTargets, getWorkspace } from './utils';


/**
 * Update ngsw-config.json to fix issue https://github.com/angular/angular-cli/pull/15277
 */
export function updateNGSWConfig(): Rule {
  return (tree, { logger }) => {
    const workspace = getWorkspace(tree);

    for (const { target } of getTargets(workspace, 'build', Builders.Browser)) {
      for (const options of getAllOptions(target)) {
        const ngswConfigPath = findPropertyInAstObject(options, 'ngswConfigPath');
        if (!ngswConfigPath || ngswConfigPath.kind !== 'string') {
          continue;
        }

        const path = ngswConfigPath.value;
        let ngswConfigJson;
        try {
          ngswConfigJson = new JSONFile(tree, path);
        } catch {
          logger.warn(`Cannot find file: ${ngswConfigPath}`);
          continue;
        }

        const assetGroups = ngswConfigJson.get(['assetGroups']);
        if (!assetGroups || !Array.isArray(assetGroups)) {
          continue;
        }

        const prefetchElementIndex = assetGroups.findIndex(
          (element) => element?.installMode === 'prefetch',
        );

        if (prefetchElementIndex === -1) {
          continue;
        }

        const filesPath = ['assetGroups', prefetchElementIndex, 'resources', 'files'];
        const files = ngswConfigJson.get(filesPath);
        if (!files || !Array.isArray(files)) {
          continue;
        }

        const hasManifest = files
          .some((value) => typeof value === 'string' && value.endsWith('manifest.webmanifest'));
        if (hasManifest) {
          continue;
        }

        // Append to files array
        ngswConfigJson.modify([...filesPath, -1], '/manifest.webmanifest');
      }
    }

    return tree;
  };
}
