// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import * as path from 'path';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SubresourceIntegrityPlugin = require('webpack-subresource-integrity');
import { LicenseWebpackPlugin } from 'license-webpack-plugin';
import { generateEntryPoints, packageChunkSort } from '../../utilities/package-chunk-sort';
import { BaseHrefWebpackPlugin } from '../../lib/base-href-webpack';
import { IndexHtmlWebpackPlugin } from '../../plugins/index-html-webpack-plugin';
import { extraEntryParser, lazyChunksFilter } from './utils';
import { WebpackConfigOptions } from '../build-options';

/**
+ * license-webpack-plugin has a peer dependency on webpack-sources, list it in a comment to
+ * let the dependency validator know it is used.
+ *
+ * require('webpack-sources')
+ */

export function getBrowserConfig(wco: WebpackConfigOptions) {
  const { root, projectRoot, buildOptions, appConfig } = wco;


  let extraPlugins: any[] = [];

  // figure out which are the lazy loaded entry points
  const lazyChunks = lazyChunksFilter([
    ...extraEntryParser(appConfig.scripts, root, 'scripts'),
    ...extraEntryParser(appConfig.styles, root, 'styles')
  ]);

  // TODO: Enable this once HtmlWebpackPlugin supports Webpack 4
  const generateIndexHtml = false;
  if (generateIndexHtml) {
    extraPlugins.push(new HtmlWebpackPlugin({
      template: path.resolve(root, appConfig.index),
      filename: path.resolve(buildOptions.outputPath, appConfig.index),
      chunksSortMode: packageChunkSort(appConfig),
      excludeChunks: lazyChunks,
      xhtml: true,
      minify: buildOptions.optimizationLevel === 1 ? {
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
    if (buildOptions.evalSourceMap && buildOptions.optimizationLevel === 0) {
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

  const globalStylesEntries = extraEntryParser(appConfig.styles, root, 'styles')
    .map(style => style.entry);

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
        chunks: buildOptions.commonChunk ? 'all' : 'initial',
        cacheGroups: {
          vendors: false,
          vendor: buildOptions.vendorChunk && {
            name: 'vendor',
            chunks: 'initial',
            test: (module: any, chunks: Array<{ name: string }>) => {
              const moduleName = module.nameForCondition ? module.nameForCondition() : '';
              return /[\\/]node_modules[\\/]/.test(moduleName)
                && !chunks.some(({ name }) => name === 'polyfills'
                  || globalStylesEntries.includes(name));
            },
          },
        }
      }
    },
    plugins: extraPlugins.concat([
      new IndexHtmlWebpackPlugin({
        input: path.resolve(root, appConfig.index),
        output: path.relative(projectRoot, path.resolve(root, appConfig.index)),
        baseHref: buildOptions.baseHref,
        entrypoints: generateEntryPoints(appConfig),
        deployUrl: buildOptions.deployUrl,
      }),
    ]),
    node: false,
  };
}
