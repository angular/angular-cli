/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import * as path from 'path';
import * as webpack from 'webpack';
import { IndexHtmlWebpackPlugin } from '../../plugins/index-html-webpack-plugin';
import { generateEntryPoints } from '../../utilities/package-chunk-sort';
import { WebpackConfigOptions } from '../build-options';
import { getSourceMapDevTool, isPolyfillsEntry, normalizeExtraEntryPoints } from './utils';

const SubresourceIntegrityPlugin = require('webpack-subresource-integrity');


export function getBrowserConfig(wco: WebpackConfigOptions): webpack.Configuration {
  const { root, buildOptions } = wco;
  const extraPlugins = [];

  let isEval = false;
  const { styles: stylesOptimization, scripts: scriptsOptimization } = buildOptions.optimization;
  const {
    styles: stylesSourceMap,
    scripts: scriptsSourceMap,
    hidden: hiddenSourceMap,
  } = buildOptions.sourceMap;

  // See https://webpack.js.org/configuration/devtool/ for sourcemap types.
  if ((stylesSourceMap || scriptsSourceMap) &&
    buildOptions.evalSourceMap &&
    !stylesOptimization &&
    !scriptsOptimization) {
    // Produce eval sourcemaps for development with serve, which are faster.
    isEval = true;
  }

  if (buildOptions.index) {
    extraPlugins.push(new IndexHtmlWebpackPlugin({
      input: path.resolve(root, buildOptions.index),
      output: path.basename(buildOptions.index),
      baseHref: buildOptions.baseHref,
      entrypoints: generateEntryPoints(buildOptions),
      deployUrl: buildOptions.deployUrl,
      sri: buildOptions.subresourceIntegrity,
      noModuleEntrypoints: ['polyfills-es5'],
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

  if (!isEval && (scriptsSourceMap || stylesSourceMap)) {
    extraPlugins.push(getSourceMapDevTool(
      !!scriptsSourceMap,
      !!stylesSourceMap,
      hiddenSourceMap,
    ));
  }

  const globalStylesBundleNames = normalizeExtraEntryPoints(buildOptions.styles, 'styles')
    .map(style => style.bundleName);

  return {
    devtool: isEval ? 'eval' : false,
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
                && !chunks.some(({ name }) => isPolyfillsEntry(name)
                  || globalStylesBundleNames.includes(name));
            },
          },
        },
      },
    } as webpack.Options.Optimization,
    plugins: extraPlugins,
    node: false,
  };
}
