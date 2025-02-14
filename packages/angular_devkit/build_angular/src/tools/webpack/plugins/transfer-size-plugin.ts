/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { promisify } from 'node:util';
import { brotliCompress } from 'node:zlib';
import { Compiler } from 'webpack';
import { addWarning } from '../../../utils/webpack-diagnostics';

const brotliCompressAsync = promisify(brotliCompress);

const PLUGIN_NAME = 'angular-transfer-size-estimator';

export class TransferSizePlugin {
  constructor() {}

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
        },
        async (compilationAssets) => {
          const actions = [];
          for (const assetName of Object.keys(compilationAssets)) {
            if (!assetName.endsWith('.js') && !assetName.endsWith('.css')) {
              continue;
            }

            const scriptAsset = compilation.getAsset(assetName);
            if (!scriptAsset || scriptAsset.source.size() <= 0) {
              continue;
            }

            actions.push(
              brotliCompressAsync(scriptAsset.source.source())
                .then((result) => {
                  compilation.updateAsset(
                    assetName,
                    (s) => s,
                    (assetInfo) => ({
                      ...assetInfo,
                      estimatedTransferSize: result.length,
                    }),
                  );
                })
                .catch((error) => {
                  addWarning(
                    compilation,
                    `Unable to calculate estimated transfer size for '${assetName}'. Reason: ${error.message}`,
                  );
                }),
            );
          }

          await Promise.all(actions);
        },
      );
    });
  }
}
