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

  const extraRules: webpack.Rule[] = [];
  const extraPlugins: webpack.Plugin[] = [];

  // if (buildOptions.codeCoverage && CliConfig.fromProject()) {
  if (buildOptions.codeCoverage) {
    const codeCoverageExclude = buildOptions.codeCoverageExclude;
    const exclude: (string | RegExp)[] = [
      /\.(e2e|spec)\.ts$/,
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
      test: /\.(js|ts)$/, loader: 'istanbul-instrumenter-loader',
      options: { esModules: true },
      enforce: 'post',
      exclude,
    });
  }

  return {
    mode: 'development',
    resolve: {
      mainFields: [
        ...(wco.supportES2015 ? ['es2015'] : []),
        'browser', 'module', 'main',
      ],
    },
    devtool: buildOptions.sourceMap ? 'inline-source-map' : 'eval',
    entry: {
      main: path.resolve(root, buildOptions.main),
    },
    module: {
      rules: extraRules,
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
            test: /[\\/]node_modules[\\/]/,
          },
        },
      },
    },
    // Webpack typings don't yet include the function form for 'chunks',
    // or the built-in vendors cache group.
  } as {} as webpack.Configuration;
}
