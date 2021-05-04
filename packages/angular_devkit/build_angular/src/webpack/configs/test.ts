/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as glob from 'glob';
import * as path from 'path';
import * as webpack from 'webpack';
import { WebpackConfigOptions, WebpackTestOptions } from '../../utils/build-options';
import { getSourceMapDevTool, isPolyfillsEntry } from '../utils/helpers';

export function getTestConfig(
  wco: WebpackConfigOptions<WebpackTestOptions>,
): webpack.Configuration {
  const {
    buildOptions: { codeCoverage, codeCoverageExclude, main, sourceMap },
    root,
    sourceRoot,
  } = wco;

  const extraRules: webpack.RuleSetRule[] = [];
  const extraPlugins: { apply(compiler: webpack.Compiler): void }[] = [];

  if (codeCoverage) {
    const exclude: (string | RegExp)[] = [/\.(e2e|spec)\.tsx?$/, /node_modules/];

    if (codeCoverageExclude) {
      for (const excludeGlob of codeCoverageExclude) {
        glob
          .sync(path.join(root, excludeGlob), { nodir: true })
          .forEach((file) => exclude.push(path.normalize(file)));
      }
    }

    extraRules.push({
      test: /\.(jsx?|tsx?)$/,
      loader: require.resolve('@jsdevtools/coverage-istanbul-loader'),
      options: { esModules: true },
      enforce: 'post',
      exclude,
      include: sourceRoot,
    });
  }

  if (sourceMap.scripts || sourceMap.styles) {
    extraPlugins.push(getSourceMapDevTool(sourceMap.scripts, sourceMap.styles, false, true));
  }

  return {
    mode: 'development',
    resolve: {
      mainFields: ['es2015', 'browser', 'module', 'main'],
    },
    devtool: false,
    entry: {
      main: path.resolve(root, main),
    },
    module: {
      rules: extraRules,
    },
    plugins: extraPlugins,
    optimization: {
      splitChunks: {
        chunks: (chunk) => !isPolyfillsEntry(chunk.name),
        cacheGroups: {
          vendors: false,
          defaultVendors: {
            name: 'vendor',
            chunks: (chunk) => chunk.name === 'main',
            enforce: true,
            test: /[\\/]node_modules[\\/]/,
          },
        },
      },
    },
  };
}
