/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import * as path from 'path';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SubresourceIntegrityPlugin = require('webpack-subresource-integrity');
import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import { generateEntryPoints, packageChunkSort } from '../../utilities/package-chunk-sort';
import { BaseHrefWebpackPlugin } from '../../lib/base-href-webpack';
import { IndexHtmlWebpackPlugin } from '../../plugins/index-html-webpack-plugin';
import { ExtraEntryPoint } from '../../../browser/schema';
import { BrowserBuilderSchema } from '../../../browser/schema';
import { WebpackConfigOptions } from '../build-options';
import { normalizeExtraEntryPoints } from './utils';

/**
+ * license-webpack-plugin has a peer dependency on webpack-sources, list it in a comment to
+ * let the dependency validator know it is used.
+ *
+ * require('webpack-sources')
+ */

export function getBrowserConfig(wco: WebpackConfigOptions) {
  const { root, projectRoot, buildOptions } = wco;


  let extraPlugins: any[] = [];

  // Figure out which are the lazy loaded bundle names.
  const lazyChunkBundleNames = normalizeExtraEntryPoints(
    // We don't really need a default name because we pre-filtered by lazy only entries.
    [...buildOptions.styles, ...buildOptions.scripts], 'not-lazy')
    .filter(entry => entry.lazy)
    .map(entry => entry.bundleName)

  const generateIndexHtml = false;
  if (generateIndexHtml) {
    extraPlugins.push(new HtmlWebpackPlugin({
      template: path.resolve(root, buildOptions.index),
      filename: path.resolve(buildOptions.outputPath, buildOptions.index),
      chunksSortMode: packageChunkSort(buildOptions),
      excludeChunks: lazyChunkBundleNames,
      xhtml: true,
      minify: buildOptions.optimization ? {
        caseSensitive: true,
        collapseWhitespace: true,
        keepClosingSlash: true
      } : false
    }));
    extraPlugins.push(new BaseHrefWebpackPlugin({
      baseHref: buildOptions.baseHref as string
    }));
  }

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

  if (buildOptions.subresourceIntegrity) {
    extraPlugins.push(new SubresourceIntegrityPlugin({
      hashFuncNames: ['sha384']
    }));
  }

  if (buildOptions.extractLicenses) {
    extraPlugins.push(new LicenseWebpackPlugin({
      pattern: /.*/,
      suppressErrors: true,
      perChunkOutput: false,
      outputFilename: `3rdpartylicenses.txt`
    }));
  }

  const globalStylesBundleNames = normalizeExtraEntryPoints(buildOptions.styles, 'styles')
    .map(style => style.bundleName);

  return {
    devtool: sourcemaps,
    resolve: {
      mainFields: [
        ...(wco.supportES2015 ? ['es2015'] : []),
        'browser', 'module', 'main'
      ]
    },
    output: {
      crossOriginLoading: buildOptions.subresourceIntegrity ? 'anonymous' : false
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
            test: (module: any, chunks: Array<{ name: string }>) => {
              const moduleName = module.nameForCondition ? module.nameForCondition() : '';
              return /[\\/]node_modules[\\/]/.test(moduleName)
                && !chunks.some(({ name }) => name === 'polyfills'
                  || globalStylesBundleNames.includes(name));
            },
          },
        }
      }
    },
    plugins: extraPlugins.concat([
      new IndexHtmlWebpackPlugin({
        input: path.resolve(root, buildOptions.index),
        output: path.basename(buildOptions.index),
        baseHref: buildOptions.baseHref,
        entrypoints: generateEntryPoints(buildOptions),
        deployUrl: buildOptions.deployUrl,
        sri: buildOptions.subresourceIntegrity,
      }),
    ]),
    node: false,
  };
}
