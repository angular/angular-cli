/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as path from 'path';
import { ScriptTarget } from 'typescript';
import { Configuration } from 'webpack';
import { WebpackConfigOptions, WebpackTestOptions } from '../../utils/build-options';
import { getSourceMapDevTool, isPolyfillsEntry } from '../utils/helpers';

export function getTestConfig(wco: WebpackConfigOptions<WebpackTestOptions>): Configuration {
  const {
    buildOptions: { main, sourceMap, webWorkerTsConfig },
    root,
  } = wco;

  const extraPlugins: Configuration['plugins'] = [];

  if (sourceMap.scripts || sourceMap.styles) {
    extraPlugins.push(getSourceMapDevTool(sourceMap.scripts, sourceMap.styles, false, true));
  }

  return {
    mode: 'development',
    target: wco.tsConfig.options.target === ScriptTarget.ES5 ? ['web', 'es5'] : 'web',
    resolve: {
      mainFields: ['es2020', 'es2015', 'browser', 'module', 'main'],
      conditionNames: ['es2020', 'es2015', '...'],
    },
    devtool: false,
    entry: {
      main: path.resolve(root, main),
    },
    module: {
      parser:
        webWorkerTsConfig === undefined
          ? {
              javascript: {
                worker: false,
                url: false,
              },
            }
          : undefined,
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
