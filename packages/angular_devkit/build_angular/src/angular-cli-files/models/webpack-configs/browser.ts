/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import * as path from 'path';
import { IndexHtmlWebpackPlugin } from '../../plugins/index-html-webpack-plugin';
import { generateEntryPoints } from '../../utilities/package-chunk-sort';
import { WebpackConfigOptions } from '../build-options';
import { normalizeExtraEntryPoints } from './utils';

const SubresourceIntegrityPlugin = require('webpack-subresource-integrity');


export function getBrowserConfig(wco: WebpackConfigOptions) {
  const { root, buildOptions } = wco;
  const extraPlugins = [];

  let sourcemaps: string | false = false;
  if (buildOptions.sourceMap) {
    // See https://webpack.js.org/configuration/devtool/ for sourcemap types.
    if (buildOptions.evalSourceMap && !buildOptions.optimization) {
      // Produce eval sourcemaps for development with serve, which are faster.
      sourcemaps = 'eval';
    } else {
      // Produce full separate sourcemaps for production.
      sourcemaps = 'source-map';
    }
  }

  if (buildOptions.index) {
    extraPlugins.push(new IndexHtmlWebpackPlugin({
      input: path.resolve(root, buildOptions.index),
      output: path.basename(buildOptions.index),
      baseHref: buildOptions.baseHref,
      entrypoints: generateEntryPoints(buildOptions),
      deployUrl: buildOptions.deployUrl,
      sri: buildOptions.subresourceIntegrity,
    }));
  }

  if (buildOptions.subresourceIntegrity) {
    extraPlugins.push(new SubresourceIntegrityPlugin({
      hashFuncNames: ['sha384'],
    }));
  }

  if (buildOptions.extractLicenses) {
    extraPlugins.push(new LicenseWebpackPlugin({
      stats: {
        warnings: false,
        errors: false,
      },
      perChunkOutput: false,
      outputFilename: `3rdpartylicenses.txt`,
    }));
  }

  const globalStylesBundleNames = normalizeExtraEntryPoints(buildOptions.styles, 'styles')
    .map(style => style.bundleName);

  return {
    devtool: sourcemaps,
    resolve: {
      mainFields: [
        ...(wco.supportES2015 ? ['es2015'] : []),
        'browser', 'module', 'main',
      ],
    },
    output: {
      crossOriginLoading: buildOptions.subresourceIntegrity ? 'anonymous' : false,
    },
    optimization: {
      runtimeChunk: 'single',
      splitChunks: {
        maxAsyncRequests: Infinity,
        cacheGroups: {
          default: buildOptions.commonChunk && {
            chunks: 'async',
            minChunks: 2,
            priority: 10,
          },
          common: buildOptions.commonChunk && {
            name: 'common',
            chunks: 'async',
            minChunks: 2,
            enforce: true,
            priority: 5,
          },
          vendors: false,
          vendor: buildOptions.vendorChunk && {
            name: 'vendor',
            chunks: 'initial',
            enforce: true,
            test: (module: { nameForCondition?: Function }, chunks: Array<{ name: string }>) => {
              const moduleName = module.nameForCondition ? module.nameForCondition() : '';

              return /[\\/]node_modules[\\/]/.test(moduleName)
                && !chunks.some(({ name }) => name === 'polyfills'
                  || globalStylesBundleNames.includes(name));
            },
          },
        },
      },
    },
    plugins: extraPlugins,
    node: false,
  };
}
