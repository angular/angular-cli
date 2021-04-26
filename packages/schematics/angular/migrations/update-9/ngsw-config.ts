/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { allTargetOptions, allWorkspaceTargets, getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

/**
 * Update ngsw-config.json to fix issue https://github.com/angular/angular-cli/pull/15277
 */
export function updateNGSWConfig(): Rule {
  return async (tree, { logger }) => {
    const workspace = await getWorkspace(tree);

    for (const [targetName, target] of allWorkspaceTargets(workspace)) {
      if (targetName !== 'build' || target.builder !== Builders.Browser) {
        continue;
      }

      for (const [, options] of allTargetOptions(target)) {
        const ngswConfigPath = options.ngswConfigPath;
        if (!ngswConfigPath || typeof ngswConfigPath !== 'string') {
          continue;
        }

        let ngswConfigJson;
        try {
          ngswConfigJson = new JSONFile(tree, ngswConfigPath);
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

        const hasManifest = files.some(
          (value) => typeof value === 'string' && value.endsWith('manifest.webmanifest'),
        );
        if (hasManifest) {
          continue;
        }

        // Append to files array
        ngswConfigJson.modify([...filesPath, -1], '/manifest.webmanifest');
      }
    }
  };
}
