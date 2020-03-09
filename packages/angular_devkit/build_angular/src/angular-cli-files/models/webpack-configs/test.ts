/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as glob from 'glob';
import * as path from 'path';
import * as webpack from 'webpack';
import { WebpackConfigOptions, WebpackTestOptions } from '../build-options';
import { getSourceMapDevTool, isPolyfillsEntry } from './utils';

export function getTestConfig(
  wco: WebpackConfigOptions<WebpackTestOptions>,
): webpack.Configuration {
  const { root, buildOptions, sourceRoot: include } = wco;

  const extraRules: webpack.Rule[] = [];
  const extraPlugins: webpack.Plugin[] = [];

  if (buildOptions.codeCoverage) {
    const codeCoverageExclude = buildOptions.codeCoverageExclude;
    const exclude: (string | RegExp)[] = [
      /\.(e2e|spec)\.tsx?$/,
      /node_modules/,
    ];

    if (codeCoverageExclude) {
      codeCoverageExclude.forEach((excludeGlob: string) => {
        const excludeFiles = glob
          .sync(path.join(root, excludeGlob), { nodir: true })
          .map(file => path.normalize(file));
        exclude.push(...excludeFiles);
      });
    }

    extraRules.push({
      test: /\.(jsx?|tsx?)$/,
      loader: require.resolve('@jsdevtools/coverage-istanbul-loader'),
      options: { esModules: true },
      enforce: 'post',
      exclude,
      include,
    });
  }

  if (wco.buildOptions.sourceMap) {
    const { styles, scripts } = wco.buildOptions.sourceMap;

    if (styles || scripts) {
      extraPlugins.push(getSourceMapDevTool(
        scripts,
        styles,
        false,
        true,
      ));
    }
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
    module: {
      rules: extraRules,
    },
    plugins: extraPlugins,
    optimization: {
      splitChunks: {
        chunks: ((chunk: { name: string }) => !isPolyfillsEntry(chunk.name)),
        cacheGroups: {
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'initial',
            test: (module: { nameForCondition?: () => string }, chunks: { name: string }[]) => {
              const moduleName = module.nameForCondition ? module.nameForCondition() : '';

              return /[\\/]node_modules[\\/]/.test(moduleName)
                && !chunks.some(({ name }) => isPolyfillsEntry(name));
            },
          },
        },
      },
    },
  };
}
