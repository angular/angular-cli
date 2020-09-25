/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as webpack from 'webpack';
import { WebpackConfigOptions } from '../../utils/build-options';
import { isWebpackFiveOrHigher, withWebpackFourOrFive } from '../../utils/webpack-version';
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
    vendor: vendorSourceMap,
  } = buildOptions.sourceMap;

  if (subresourceIntegrity) {
    const SubresourceIntegrityPlugin = require('webpack-subresource-integrity');
    extraPlugins.push(new SubresourceIntegrityPlugin({
      hashFuncNames: ['sha384'],
    }));
  }

  // TODO_WEBPACK_5: Investigate build/serve issues with the `license-webpack-plugin` package
  if (extractLicenses && isWebpackFiveOrHigher()) {
    wco.logger.warn(
      'WARNING: License extraction is currently disabled when using Webpack 5. ' +
        'This is temporary and will be corrected in a future update.',
    );
  } else if (extractLicenses) {
    const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;
    extraPlugins.push(new LicenseWebpackPlugin({
      stats: {
        warnings: false,
        errors: false,
      },
      perChunkOutput: false,
      outputFilename: '3rdpartylicenses.txt',
    }));
  }

  if (scriptsSourceMap || stylesSourceMap) {
    extraPlugins.push(getSourceMapDevTool(
      scriptsSourceMap,
      stylesSourceMap,
      wco.differentialLoadingMode ? true : hiddenSourceMap,
      false,
      vendorSourceMap,
    ));
  }

  let crossOriginLoading: 'anonymous' | 'use-credentials' | false = false;
  if (subresourceIntegrity && crossOrigin === 'none') {
    crossOriginLoading = 'anonymous';
  } else if (crossOrigin !== 'none') {
    crossOriginLoading = crossOrigin;
  }

  return {
    devtool: false,
    resolve: {
      mainFields: ['es2015', 'browser', 'module', 'main'],
    },
    ...withWebpackFourOrFive({}, { target: ['web', 'es5'] }),
    output: {
      crossOriginLoading,
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
