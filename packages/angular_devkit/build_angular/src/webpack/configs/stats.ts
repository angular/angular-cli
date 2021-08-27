/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { WebpackConfigOptions } from '../../utils/build-options';

const webpackOutputOptions = {
  all: false, // Fallback value for stats options when an option is not defined. It has precedence over local webpack defaults.
  colors: true,
  hash: true, // required by custom stat output
  timings: true, // required by custom stat output
  chunks: true, // required by custom stat output
  builtAt: true, // required by custom stat output
  warnings: true,
  errors: true,
  assets: true, // required by custom stat output
  cachedAssets: true, // required for bundle size calculators

  // Needed for markAsyncChunksNonInitial.
  ids: true,
  entrypoints: true,
};

const verboseWebpackOutputOptions: Record<string, boolean | string | number> = {
  // The verbose output will most likely be piped to a file, so colors just mess it up.
  colors: false,
  usedExports: true,
  optimizationBailout: true,
  reasons: true,
  children: true,
  assets: true,
  version: true,
  chunkModules: true,
  errorDetails: true,
  moduleTrace: true,
  logging: 'verbose',
  modulesSpace: Infinity,
};

export function getWebpackStatsConfig(verbose = false) {
  return verbose
    ? { ...webpackOutputOptions, ...verboseWebpackOutputOptions }
    : webpackOutputOptions;
}

export function getStatsConfig(wco: WebpackConfigOptions) {
  const verbose = !!wco.buildOptions.verbose;

  return {
    stats: getWebpackStatsConfig(verbose),
  };
}
