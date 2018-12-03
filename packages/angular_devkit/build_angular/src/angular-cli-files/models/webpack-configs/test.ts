/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as path from 'path';
import * as webpack from 'webpack';
import { WebpackConfigOptions, WebpackTestOptions } from '../build-options';
import { getSourceMapDevTool } from './utils';


/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('istanbul-instrumenter-loader')
 *
 */

export function getTestConfig(
  wco: WebpackConfigOptions<WebpackTestOptions>,
): webpack.Configuration {
  const { root, buildOptions } = wco;

  const extraPlugins: webpack.Plugin[] = [];

  if (wco.buildOptions.sourceMap) {
    const { styles, scripts } = wco.buildOptions.sourceMap;

    extraPlugins.push(getSourceMapDevTool(
      styles,
      scripts,
      false,
      true,
    ));
  }

  return {
    mode: 'development',
    resolve: {
      mainFields: [
        ...(wco.supportES2015 ? ['es2015'] : []),
        'browser', 'module', 'main',
      ],
    },
    devtool: buildOptions.sourceMap ? false : 'eval',
    entry: {
      main: path.resolve(root, buildOptions.main),
    },
    plugins: extraPlugins,
    optimization: {
      splitChunks: {
        chunks: ((chunk: { name: string }) => chunk.name !== 'polyfills'),
        cacheGroups: {
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'initial',
            test: (module: { nameForCondition?: () => string }, chunks: { name: string }[]) => {
              const moduleName = module.nameForCondition ? module.nameForCondition() : '';

              return /[\\/]node_modules[\\/]/.test(moduleName)
                && !chunks.some(({ name }) => name === 'polyfills');
            },
          },
        },
      },
    },
    // Webpack typings don't yet include the function form for 'chunks',
    // or the built-in vendors cache group.
  } as {} as webpack.Configuration;
}
