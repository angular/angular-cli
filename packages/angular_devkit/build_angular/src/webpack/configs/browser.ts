/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ScriptTarget } from 'typescript';
import * as webpack from 'webpack';
import { BuildBrowserFeatures } from '../../utils';
import { WebpackConfigOptions } from '../../utils/build-options';
import { CommonJsUsageWarnPlugin } from '../plugins';
import { getSourceMapDevTool } from '../utils/helpers';

export function getBrowserConfig(wco: WebpackConfigOptions): webpack.Configuration {
  const { buildOptions } = wco;
  const {
    crossOrigin = 'none',
    subresourceIntegrity,
    extractLicenses,
    vendorChunk,
    commonChunk,
    allowedCommonJsDependencies,
  } = buildOptions;

  const extraPlugins = [];

  const {
    styles: stylesSourceMap,
    scripts: scriptsSourceMap,
    hidden: hiddenSourceMap,
  } = buildOptions.sourceMap;

  if (subresourceIntegrity) {
    const SubresourceIntegrityPlugin = require('webpack-subresource-integrity');
    extraPlugins.push(
      new SubresourceIntegrityPlugin({
        hashFuncNames: ['sha384'],
      }),
    );
  }

  if (scriptsSourceMap || stylesSourceMap) {
    extraPlugins.push(
      getSourceMapDevTool(
        scriptsSourceMap,
        stylesSourceMap,
        buildOptions.differentialLoadingNeeded && !buildOptions.watch ? true : hiddenSourceMap,
        false,
      ),
    );
  }

  let crossOriginLoading: 'anonymous' | 'use-credentials' | false = false;
  if (subresourceIntegrity && crossOrigin === 'none') {
    crossOriginLoading = 'anonymous';
  } else if (crossOrigin !== 'none') {
    crossOriginLoading = crossOrigin;
  }

  const buildBrowserFeatures = new BuildBrowserFeatures(wco.projectRoot);

  return {
    devtool: false,
    resolve: {
      mainFields: ['es2015', 'browser', 'module', 'main'],
    },
    output: {
      crossOriginLoading,
      trustedTypes: 'angular#bundler',
    },
    optimization: {
      runtimeChunk: 'single',
      splitChunks: {
        maxAsyncRequests: Infinity,
        cacheGroups: {
          default: !!commonChunk && {
            chunks: 'async',
            minChunks: 2,
            priority: 10,
          },
          common: !!commonChunk && {
            name: 'common',
            chunks: 'async',
            minChunks: 2,
            enforce: true,
            priority: 5,
          },
          vendors: false,
          defaultVendors: !!vendorChunk && {
            name: 'vendor',
            chunks: (chunk) => chunk.name === 'main',
            enforce: true,
            test: /[\\/]node_modules[\\/]/,
          },
        },
      },
    },
    plugins: [
      new CommonJsUsageWarnPlugin({
        allowedDependencies: allowedCommonJsDependencies,
      }),
      ...extraPlugins,
    ],
    node: false,
  };
}
