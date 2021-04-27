/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { resolve } from 'path';
import { Configuration } from 'webpack';
import { WebpackConfigOptions } from '../../utils/build-options';
import { getTypescriptWorkerPlugin } from './typescript';

export function getWorkerConfig(wco: WebpackConfigOptions): Configuration {
  const { buildOptions } = wco;

  if (!buildOptions.webWorkerTsConfig) {
    return {};
  }

  if (typeof buildOptions.webWorkerTsConfig != 'string') {
    throw new Error('The `webWorkerTsConfig` must be a string.');
  }

  const workerTsConfigPath = resolve(wco.root, buildOptions.webWorkerTsConfig);
  const WebWorkerPlugin = require('worker-plugin');

  const workerPlugins = [getTypescriptWorkerPlugin(wco, workerTsConfigPath)];
  if (buildOptions.extractLicenses) {
    // Webpack child compilations will not inherit the license plugin
    const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;
    workerPlugins.push(new LicenseWebpackPlugin({
      stats: {
        warnings: false,
        errors: false,
      },
      perChunkOutput: false,
      // The name needs to be unique to this child compilation to avoid duplicate asset errors
      outputFilename: '3rdpartylicenses-worker-[hash].txt',
    }));
  }

  return {
    plugins: [new WebWorkerPlugin({
      globalObject: false,
      plugins: workerPlugins,
    })],
  };
}
